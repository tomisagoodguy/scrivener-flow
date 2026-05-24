"""
Sync Bare-K Step

從 watch_list 聚合所有使用者的自選股，計算裸K六面板快照，
並批次 upsert 至 bare_k_snapshots 表。
"""

import json
import logging
from datetime import date

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.pipeline.steps.base import BaseStep
from ETF.services.finlab.bare_k_service import BareKService

logger = logging.getLogger(__name__)

MAX_STOCKS = 50  # 每次最多同步股票數量


class SyncBareKStep(BaseStep):
    """同步裸K看盤六面板快照"""

    @property
    def name(self) -> str:
        return "Sync BareK Snapshots"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        # 1. 從 watch_list 聚合所有使用者的股票（service role 繞過 RLS）
        watch_list_ids = self._fetch_watch_list_stocks(ctx, services)

        # 2. 額外納入策略股（watch_list 優先，策略股 append 後去重）
        strategy_ids = self._fetch_strategy_stocks(ctx, services)
        seen: set[str] = set(watch_list_ids)
        merged: list[str] = list(watch_list_ids)
        for sid in strategy_ids:
            if sid not in seen:
                merged.append(sid)
                seen.add(sid)
        stock_ids = merged

        if not stock_ids:
            self.logger.info("watch_list and strategy_signals are both empty, skipping BareK sync.")
            ctx.bare_k_synced_count = 0
            return ctx

        if len(stock_ids) > MAX_STOCKS:
            self.logger.warning(
                f"Combined watch_list + strategy stocks has {len(stock_ids)} stocks, only syncing first {MAX_STOCKS}"
            )
            stock_ids = stock_ids[:MAX_STOCKS]

        self.logger.info(f"Syncing BareK snapshots for {len(stock_ids)} stocks: {stock_ids}")

        # 2. 初始化 BareKService（預載全市場資料）
        svc = BareKService()
        if not svc.ensure_global_data():
            self.logger.error("Failed to load FinLab data for BareK sync, skipping.")
            ctx.bare_k_synced_count = 0
            return ctx

        # 3. 對每支股票計算快照
        today = ctx.date_str or str(date.today())
        success_count = 0
        snapshots: list[dict] = []

        for sid in stock_ids:
            try:
                snapshot = svc.compute_snapshot(sid, days=240)
                if snapshot is None:
                    self.logger.warning(f"No snapshot for {sid}, skipping.")
                    continue
                snapshots.append({"stock_id": sid, "date": today, **snapshot})
                success_count += 1
            except Exception as e:
                self.logger.warning(f"Failed to compute snapshot for {sid}: {e}")

        # 4. 批次 upsert
        if snapshots:
            self._upsert_snapshots(ctx, snapshots, services)

        ctx.bare_k_synced_count = success_count
        self.logger.info(
            f"BareK sync done: {success_count}/{len(stock_ids)} stocks succeeded."
        )
        return ctx

    # ──────────────────────────────────────────────────────────────────────

    def _fetch_strategy_stocks(self, ctx: PipelineContext, services: "PipelineServices") -> list[str]:
        """
        查詢 strategy_signals 最新 date 的 is_selected = true 股票。
        失敗時 log error 並回傳空列表（不 raise）。
        """
        try:
            with services.sql_storage.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT DISTINCT stock_id
                    FROM strategy_signals
                    WHERE date = (SELECT MAX(date) FROM strategy_signals)
                      AND is_selected = true
                    ORDER BY stock_id
                """))
                return [row[0] for row in result.fetchall()]
        except Exception as e:
            self.logger.error(f"Failed to fetch strategy stocks: {e}")
            return []

    def _fetch_watch_list_stocks(self, ctx: PipelineContext, services: "PipelineServices") -> list[str]:
        """
        從 watch_list 讀取所有使用者的自選股（service role 繞過 RLS）。
        按 created_at 升序排列，取最多 MAX_STOCKS 支。
        """
        try:
            with services.sql_storage.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT DISTINCT stock_id
                    FROM watch_list
                    ORDER BY stock_id
                    LIMIT :limit
                """), {"limit": MAX_STOCKS + 1})  # 多取 1 供截斷警告
                return [row[0] for row in result.fetchall()]
        except Exception as e:
            self.logger.error(f"Failed to fetch watch_list: {e}")
            return []

    def _upsert_snapshots(self, ctx: PipelineContext, snapshots: list[dict], services: "PipelineServices") -> None:
        """批次 upsert snapshots 至 bare_k_snapshots"""
        upsert_sql = text("""
            INSERT INTO bare_k_snapshots
                (stock_id, date, ohlcv, mas, signals, margin, revenue, inv_chips, summary)
            VALUES
                (:stock_id, :date, CAST(:ohlcv AS jsonb), CAST(:mas AS jsonb), CAST(:signals AS jsonb),
                 CAST(:margin AS jsonb), CAST(:revenue AS jsonb), CAST(:inv_chips AS jsonb), CAST(:summary AS jsonb))
            ON CONFLICT (stock_id, date) DO UPDATE SET
                ohlcv      = EXCLUDED.ohlcv,
                mas        = EXCLUDED.mas,
                signals    = EXCLUDED.signals,
                margin     = EXCLUDED.margin,
                revenue    = EXCLUDED.revenue,
                inv_chips  = EXCLUDED.inv_chips,
                summary    = EXCLUDED.summary,
                created_at = now()
        """)

        try:
            with services.sql_storage.engine.connect() as conn:
                for snap in snapshots:
                    conn.execute(upsert_sql, {
                        "stock_id":  snap["stock_id"],
                        "date":      snap["date"],
                        "ohlcv":     json.dumps(snap["ohlcv"], ensure_ascii=False),
                        "mas":       json.dumps(snap["mas"],   ensure_ascii=False),
                        "signals":   json.dumps(snap["signals"], ensure_ascii=False),
                        "margin":    json.dumps(snap["margin"], ensure_ascii=False),
                        "revenue":   json.dumps(snap["revenue"], ensure_ascii=False),
                        "inv_chips": json.dumps(snap["inv_chips"], ensure_ascii=False),
                        "summary":   json.dumps(snap["summary"], ensure_ascii=False),
                    })
                conn.commit()
            self.logger.info(f"Upserted {len(snapshots)} bare_k_snapshots.")
        except Exception as e:
            # BareK 是輔助功能，upsert 失敗不應中斷主流程（NotifyStep 仍需執行）
            self.logger.error(f"Failed to upsert bare_k_snapshots: {e}")
