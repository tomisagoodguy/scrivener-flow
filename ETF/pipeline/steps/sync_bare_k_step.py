"""
Sync Bare-K Step

從 watch_list 聚合所有使用者的自選股，加上最新日策略入選股、窗口同步加碼股與
籌碼排行股與選股池股（優先序：自選股 → 策略股 → 同步加碼股 → 籌碼排行股 → 選股池股），
計算裸K六面板快照，
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

MAX_STOCKS = 400  # 每次最多同步股票數量

# 同步加碼窗口：必須與 src/app/investment/momentum/page.tsx 的 DEFAULT_WINDOW / DEFAULT_MIN_COUNT 一致
MOMENTUM_WINDOW_DAYS = 5
MOMENTUM_MIN_ETF_COUNT = 2

# 籌碼排行股：重現 /investment/equity 預設視角（1 週、不分級距）的三份清單
# EQUITY_LIST_LIMIT 必須與前端 src/lib/investment/equityChartUtils.ts 的 EQUITY_CHART_LIST_LIMIT 一致
EQUITY_DOUBLE_LIMIT = 10  # 雙訊號（大戶增 + 股東減）本身上限 10 檔
EQUITY_LIST_LIMIT = 30  # 主力買進、散戶減少各取前 30 檔


def _momentum_window_start(prev_dates: list[str], today: str) -> str:
    """推算同步加碼窗口起日。

    SyncBareKStep 執行時當日 market_breadth_daily 尚未寫入，因此窗口 =
    today 加上 prev_dates（降冪，皆早於 today）的前 MOMENTUM_WINDOW_DAYS - 1 筆，
    起日取其中最早者。prev_dates 不足時以現有最早日期為起日。

    Args:
        prev_dates: market_breadth_daily 中早於 today 的日期（YYYY-MM-DD，降冪）。
        today: 窗口迄日（YYYY-MM-DD）。

    Returns:
        窗口起日（YYYY-MM-DD）。
    """
    window = [today, *prev_dates[: MOMENTUM_WINDOW_DAYS - 1]]
    return min(window)


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

        # 2. 額外納入策略股、同步加碼股、籌碼排行股
        #    （優先序：watch_list → 策略股 → 同步加碼股 → 籌碼排行股 → 選股池股，依序 append 後去重；
        #     超過 MAX_STOCKS 時最後面的選股池股最先被截斷）
        strategy_ids = self._fetch_strategy_stocks(ctx, services)
        momentum_ids = self._fetch_momentum_stocks(ctx, services)
        equity_ids = self._fetch_equity_ranking_stocks(ctx, services)
        pool_ids = self._fetch_pool_stocks(ctx, services)
        seen: set[str] = set()
        stock_ids: list[str] = []
        for sid in [*watch_list_ids, *strategy_ids, *momentum_ids, *equity_ids, *pool_ids]:
            if sid not in seen:
                stock_ids.append(sid)
                seen.add(sid)

        if not stock_ids:
            self.logger.info(
                "watch_list, strategy_signals, window-momentum, equity ranking and pool are all empty, "
                "skipping BareK sync."
            )
            ctx.bare_k_synced_count = 0
            return ctx

        if len(stock_ids) > MAX_STOCKS:
            self.logger.warning(
                f"Combined watch_list + strategy + window-momentum + equity ranking + pool stocks "
                f"has {len(stock_ids)} stocks, only syncing first {MAX_STOCKS}"
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

    def _fetch_momentum_stocks(self, ctx: PipelineContext, services: "PipelineServices") -> list[str]:
        """
        查詢窗口內被 >= MOMENTUM_MIN_ETF_COUNT 家 ETF 淨加碼的股票（同步加碼股）。

        判定規則與前端 aggregateWindowMomentum 一致：同一 (stock_code, etf_code) 在窗口內
        SUM(diff_shares) > 0 才算 1 家；依家數遞減、淨加碼股數合計遞減排序。
        窗口 = ctx.date_str + market_breadth_daily 中早於 ctx.date_str 的最近 N-1 個交易日
        （SyncAdlStep 在本步驟之後才寫入當日資料）。
        失敗時 log error 並回傳空列表（不 raise）。
        """
        today = ctx.date_str or str(date.today())
        n_prev = MOMENTUM_WINDOW_DAYS - 1
        try:
            with services.sql_storage.engine.connect() as conn:
                prev_rows = conn.execute(text("""
                    SELECT date
                    FROM market_breadth_daily
                    WHERE date < CAST(:today AS date)
                    ORDER BY date DESC
                    LIMIT :n
                """), {"today": today, "n": n_prev}).fetchall()
                prev_dates = [str(row[0]) for row in prev_rows]
                start = _momentum_window_start(prev_dates, today)

                result = conn.execute(text("""
                    SELECT stock_code
                    FROM (
                        SELECT stock_code, etf_code, SUM(diff_shares) AS net_shares
                        FROM etf_diff_logs
                        WHERE data_date BETWEEN CAST(:start AS date) AND CAST(:end AS date)
                        GROUP BY stock_code, etf_code
                        HAVING SUM(diff_shares) > 0
                    ) AS accumulated
                    GROUP BY stock_code
                    HAVING COUNT(*) >= :min_count
                    ORDER BY COUNT(*) DESC, SUM(net_shares) DESC, stock_code
                """), {"start": start, "end": today, "min_count": MOMENTUM_MIN_ETF_COUNT})
                return [row[0] for row in result.fetchall()]
        except Exception as e:
            self.logger.error(f"Failed to fetch window-momentum stocks: {e}")
            return []

    def _fetch_equity_ranking_stocks(self, ctx: PipelineContext, services: "PipelineServices") -> list[str]:
        """
        查詢籌碼排行股（重現 /investment/equity 預設視角：1 週、不分級距、預設排序）。

        取 equity_distribution_stats 全局最新 snapshot_date（獨立 MAX 子查詢，不依賴特定股票），
        直接用預計算欄位依序查三份清單，串接後去重（保留首次出現位置）：
        1. 雙訊號：big_holder_pct_change > 0 且 shareholders_change_rate < 0，
           依 big_holder_pct_change 遞減，前 EQUITY_DOUBLE_LIMIT 檔
        2. 主力買進：big_holder_pct_change > 0，依 big_holder_pct_change 遞減，前 EQUITY_LIST_LIMIT 檔
        3. 散戶減少：shareholders_change_rate < 0，依 shareholders_change_rate 遞增，前 EQUITY_LIST_LIMIT 檔
        同值以 stock_code 遞增作為穩定次序。無資料回傳空列表；
        失敗時 log error 並回傳空列表（不 raise）。
        """
        queries = [
            (
                text("""
                    SELECT stock_code
                    FROM equity_distribution_stats
                    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM equity_distribution_stats)
                      AND big_holder_pct_change > 0
                      AND shareholders_change_rate < 0
                    ORDER BY big_holder_pct_change DESC, stock_code ASC
                    LIMIT :limit
                """),
                EQUITY_DOUBLE_LIMIT,
            ),
            (
                text("""
                    SELECT stock_code
                    FROM equity_distribution_stats
                    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM equity_distribution_stats)
                      AND big_holder_pct_change > 0
                    ORDER BY big_holder_pct_change DESC, stock_code ASC
                    LIMIT :limit
                """),
                EQUITY_LIST_LIMIT,
            ),
            (
                text("""
                    SELECT stock_code
                    FROM equity_distribution_stats
                    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM equity_distribution_stats)
                      AND shareholders_change_rate < 0
                    ORDER BY shareholders_change_rate ASC, stock_code ASC
                    LIMIT :limit
                """),
                EQUITY_LIST_LIMIT,
            ),
        ]
        try:
            seen: set[str] = set()
            stock_ids: list[str] = []
            with services.sql_storage.engine.connect() as conn:
                for stmt, limit in queries:
                    for row in conn.execute(stmt, {"limit": limit}).fetchall():
                        if row[0] not in seen:
                            seen.add(row[0])
                            stock_ids.append(row[0])
            return stock_ids
        except Exception as e:
            self.logger.error(f"Failed to fetch equity ranking stocks: {e}")
            return []

    def _fetch_pool_stocks(self, ctx: PipelineContext, services: "PipelineServices") -> list[str]:
        """
        查詢選股池股：每支 ETF 最新 data_date 的 4 碼台股成分股（去重）。

        依持有 ETF 數遞減、stock_code 遞增排序。
        失敗時 log error 並回傳空列表（不 raise）。
        """
        try:
            with services.sql_storage.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT h.stock_code
                    FROM etf_holdings_snapshot h
                    JOIN (
                        SELECT etf_code, MAX(data_date) AS d
                        FROM etf_holdings_snapshot
                        GROUP BY etf_code
                    ) m ON h.etf_code = m.etf_code AND h.data_date = m.d
                    WHERE h.stock_code ~ '^[0-9]{4}$'
                    GROUP BY h.stock_code
                    ORDER BY COUNT(DISTINCT h.etf_code) DESC, h.stock_code ASC
                """))
                return [row[0] for row in result.fetchall()]
        except Exception as e:
            self.logger.error(f"Failed to fetch pool stocks: {e}")
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
