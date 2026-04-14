"""
Multi-ETF Step

爬取全部 9 檔次要主動式 ETF 的持股快照、AUM、產業分布，
並存入 Supabase。與現有 00981A pipeline 並行，不影響主流程。

使用 pocket_scraper 作為統一資料源（Pocket.tw 支援全部主動式 ETF）。
"""

import logging
from datetime import date
from typing import Any

import pandas as pd

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext
from ETF.processors.diff_engine import compute_diff

logger = logging.getLogger(__name__)

# 目標 ETF（不含 00981A，它走既有主流程）
SECONDARY_ETF_CODES = [
    "00980A",  # 野村智慧優選
    "00982A",  # 中信優選成長
    "00984A",  # 群益主動優選
    "00985A",  # 元大主動選股
    "00987A",  # 凱基主動精選
    "00991A",  # 復華未來50
    "00992A",  # 統一主動選股
    "00993A",  # 永豐主動選股
    "00994A",  # 新光主動選股
    "00995A",  # 台新主動選股
]

ETF_META = {
    "00980A": {"name": "野村智慧優選", "manager": "野村投信"},
    "00982A": {"name": "中信優選成長", "manager": "中國信託投信"},
    "00984A": {"name": "群益主動優選", "manager": "群益投信"},
    "00985A": {"name": "元大主動選股", "manager": "元大投信"},
    "00987A": {"name": "凱基主動精選", "manager": "凱基投信"},
    "00991A": {"name": "復華未來50", "manager": "復華投信"},
    "00992A": {"name": "統一主動選股", "manager": "統一投信"},
    "00993A": {"name": "永豐主動選股", "manager": "永豐投信"},
    "00994A": {"name": "新光主動選股", "manager": "新光投信"},
    "00995A": {"name": "台新主動選股", "manager": "台新投信"},
}


class MultiEtfStep(BaseStep):
    """爬取並儲存次要 ETF（9 檔）的持股、AUM、產業資料"""

    @property
    def name(self) -> str:
        return "Multi-ETF Scrape & Save"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        from ETF.scrapers.pocket_scraper import scrape_holdings

        today = date.today().strftime("%Y-%m-%d")

        all_secondary_codes: list[str] = []

        for etf_code in SECONDARY_ETF_CODES:
            meta = ETF_META.get(etf_code, {"name": etf_code, "manager": "未知"})
            self.logger.info(f"Processing {etf_code} ({meta['name']})...")

            # 1. 持股快照（pocket_scraper 統一資料源）
            try:
                df, data_date = scrape_holdings(etf_code)
                if df is not None and not df.empty:
                    snapshot_date = data_date or today
                    # Pocket.tw 回傳 YYYY/MM/DD，轉換為 YYYY-MM-DD
                    snapshot_date = snapshot_date.replace("/", "-")
                    # 補充 FinLab 指標（volatility、revenue_momentum_rank 等）
                    try:
                        df = ctx.finlab_srv.attach_prices(df, snapshot_date)
                        self.logger.info(f"FinLab price attach succeeded for {etf_code}")
                    except Exception as e:
                        self.logger.warning(f"FinLab price attach failed for {etf_code}: {e}")
                    # 用 storage.save_snapshot() 統一存入（含所有指標欄位）
                    ctx.storage.save_snapshot(df, etf_code, snapshot_date)
                    self._save_weight_history(ctx, etf_code, df, snapshot_date)
                    # 收集成分股代碼，供後續 SyncOHLCVStep 使用
                    all_secondary_codes.extend(df["code"].tolist())

                    # Diff 計算與通知
                    try:
                        diff_logs = self._compute_diff(ctx, etf_code, df, snapshot_date)
                        if diff_logs:
                            self._save_diff_logs(ctx, diff_logs)
                        self._notify_etf_completion(ctx, etf_code, df, diff_logs, snapshot_date)
                    except Exception as e:
                        self.logger.error(f"Diff/notify failed for {etf_code}: {e}")
                else:
                    self.logger.warning(f"No holdings data for {etf_code}")
            except Exception as e:
                self.logger.error(f"Holdings scrape failed for {etf_code}: {e}")

        # 去重後存入 ctx，供 SyncOHLCVStep 合併使用
        if all_secondary_codes:
            ctx.secondary_stock_codes = list(set(all_secondary_codes))
            self.logger.info(
                f"Collected {len(ctx.secondary_stock_codes)} unique stock codes "
                f"from {len(SECONDARY_ETF_CODES)} secondary ETFs"
            )

        return ctx

    # ------------------------------------------------------------------ helpers

    def _save_holdings_snapshot(self, ctx: PipelineContext, etf_code: str,
                                df, snapshot_date: str):
        """存入 etf_holdings_snapshot"""
        from sqlalchemy import text

        records = [
            {
                "etf_code": etf_code,
                "stock_code": row["code"],
                "stock_name": row["name"],
                "shares": int(row.get("shares", 0)),
                "weight": float(row["weight"]),
                "data_date": snapshot_date,
            }
            for _, row in df.iterrows()
        ]

        if not records:
            return

        upsert_sql = text("""
            INSERT INTO etf_holdings_snapshot
                (etf_code, stock_code, stock_name, shares, weight, data_date)
            VALUES
                (:etf_code, :stock_code, :stock_name, :shares, :weight, :data_date)
            ON CONFLICT (etf_code, stock_code, data_date)
            DO UPDATE SET
                stock_name = EXCLUDED.stock_name,
                shares     = EXCLUDED.shares,
                weight     = EXCLUDED.weight,
                updated_at = NOW()
        """)

        with ctx.sql_storage.engine.connect() as conn:
            conn.execute(upsert_sql, records)
            conn.commit()

        self.logger.info(f"Saved {len(records)} holdings for {etf_code} on {snapshot_date}")

    def _save_weight_history(self, ctx: PipelineContext, etf_code: str,
                             df, snapshot_date: str):
        """存入 etf_weight_history（含 rank）"""
        from sqlalchemy import text

        sorted_df = df.sort_values("weight", ascending=False).reset_index(drop=True)
        records = [
            {
                "etf_code": etf_code,
                "stock_code": row["code"],
                "stock_name": row["name"],
                "data_date": snapshot_date,
                "weight": float(row["weight"]),
                "shares": int(row.get("shares", 0)),
                "rank": idx + 1,
            }
            for idx, (_, row) in enumerate(sorted_df.iterrows())
        ]

        if not records:
            return

        upsert_sql = text("""
            INSERT INTO etf_weight_history
                (etf_code, stock_code, stock_name, data_date, weight, shares, rank)
            VALUES
                (:etf_code, :stock_code, :stock_name, :data_date, :weight, :shares, :rank)
            ON CONFLICT (etf_code, stock_code, data_date)
            DO UPDATE SET
                stock_name = EXCLUDED.stock_name,
                weight     = EXCLUDED.weight,
                shares     = EXCLUDED.shares,
                rank       = EXCLUDED.rank
        """)

        try:
            with ctx.sql_storage.engine.connect() as conn:
                conn.execute(upsert_sql, records)
                conn.commit()
            self.logger.info(f"Saved weight history for {etf_code}")
        except Exception as e:
            self.logger.warning(f"Weight history save failed for {etf_code}: {e}")

    def _save_aum(self, ctx: PipelineContext, etf_code: str,
                  aum: float, snapshot_date: str):
        """存入 etf_aum"""
        from sqlalchemy import text

        upsert_sql = text("""
            INSERT INTO etf_aum (etf_code, aum_100m_twd, snapshot_date)
            VALUES (:etf_code, :aum_100m_twd, :snapshot_date)
            ON CONFLICT (etf_code, snapshot_date)
            DO UPDATE SET aum_100m_twd = EXCLUDED.aum_100m_twd
        """)

        with ctx.sql_storage.engine.connect() as conn:
            conn.execute(upsert_sql, {
                "etf_code": etf_code,
                "aum_100m_twd": aum,
                "snapshot_date": snapshot_date,
            })
            conn.commit()

        self.logger.info(f"Saved AUM {aum} 億元 for {etf_code}")

    def _save_sectors(self, ctx: PipelineContext, etf_code: str,
                      sectors: list, snapshot_date: str):
        """存入 etf_sectors"""
        from sqlalchemy import text

        records = [
            {
                "etf_code": etf_code,
                "sector_name": s["sector_name"],
                "weight": float(s["weight"]),
                "snapshot_date": snapshot_date,
            }
            for s in sectors
        ]

        if not records:
            return

        upsert_sql = text("""
            INSERT INTO etf_sectors (etf_code, sector_name, weight, snapshot_date)
            VALUES (:etf_code, :sector_name, :weight, :snapshot_date)
            ON CONFLICT (etf_code, sector_name, snapshot_date)
            DO UPDATE SET weight = EXCLUDED.weight
        """)

        with ctx.sql_storage.engine.connect() as conn:
            conn.execute(upsert_sql, records)
            conn.commit()

        self.logger.info(f"Saved {len(records)} sectors for {etf_code}")

    def _compute_diff(
        self,
        ctx: PipelineContext,
        etf_code: str,
        curr_df: pd.DataFrame,
        snapshot_date: str,
    ) -> list[dict[str, Any]]:
        """取前日快照並計算持股異動 diff。

        重複執行同日時取第二新快照（index=1）作為前日基準。

        Args:
            ctx: Pipeline 上下文。
            etf_code: ETF 代碼。
            curr_df: 今日持股 DataFrame（需含 code/name/shares/weight）。
            snapshot_date: 今日資料日期字串（YYYY-MM-DD）。

        Returns:
            diff log 列表，格式與 DiffComputeStep 相同。
        """
        try:
            latest_date_in_db = ctx.storage.get_latest_date(etf_code)
            if latest_date_in_db == snapshot_date:
                # 今日快照已存入 DB，取第二新作為前日基準
                prev_df = ctx.storage.get_snapshot_by_index(etf_code, index=1)
            else:
                prev_df = ctx.storage.get_snapshot_from_date(etf_code, latest_date_in_db) if latest_date_in_db else pd.DataFrame()
        except Exception as e:
            self.logger.warning(f"Could not fetch previous snapshot for {etf_code}: {e}")
            prev_df = pd.DataFrame()

        diff_logs = compute_diff(prev_df, curr_df, etf_code, snapshot_date)
        self.logger.info(f"Computed {len(diff_logs)} diff events for {etf_code}")
        return diff_logs

    def _save_diff_logs(self, ctx: PipelineContext, diff_logs: list[dict[str, Any]]) -> None:
        """Upsert diff logs 到 etf_diff_logs 表。

        Conflict key: (etf_code, stock_code, data_date)。

        Args:
            ctx: Pipeline 上下文。
            diff_logs: compute_diff() 回傳的 log 列表。
        """
        from sqlalchemy import text

        if not diff_logs:
            return

        upsert_sql = text("""
            INSERT INTO etf_diff_logs
                (etf_code, stock_code, stock_name, data_date, change_type,
                 prev_shares, curr_shares, diff_shares,
                 prev_weight, curr_weight, diff_weight,
                 is_significant, description)
            VALUES
                (:etf_code, :stock_code, :stock_name, :data_date, :change_type,
                 :prev_shares, :curr_shares, :diff_shares,
                 :prev_weight, :curr_weight, :diff_weight,
                 :is_significant, :description)
            ON CONFLICT (etf_code, stock_code, data_date)
            DO UPDATE SET
                change_type    = EXCLUDED.change_type,
                stock_name     = EXCLUDED.stock_name,
                prev_shares    = EXCLUDED.prev_shares,
                curr_shares    = EXCLUDED.curr_shares,
                diff_shares    = EXCLUDED.diff_shares,
                prev_weight    = EXCLUDED.prev_weight,
                curr_weight    = EXCLUDED.curr_weight,
                diff_weight    = EXCLUDED.diff_weight,
                is_significant = EXCLUDED.is_significant,
                description    = EXCLUDED.description
        """)

        try:
            with ctx.sql_storage.engine.connect() as conn:
                conn.execute(upsert_sql, diff_logs)
                conn.commit()
            self.logger.info(f"Saved {len(diff_logs)} diff logs for {diff_logs[0]['etf_code']}")
        except Exception as e:
            self.logger.error(f"Failed to save diff logs: {e}")

    def _notify_etf_completion(
        self,
        ctx: PipelineContext,
        etf_code: str,
        df: pd.DataFrame,
        diff_logs: list[dict[str, Any]],
        snapshot_date: str,
    ) -> None:
        """發送 LINE 通知：異動明細 + 完成摘要。

        Args:
            ctx: Pipeline 上下文（透過 ctx.notifier 取得已初始化的 LineNotifier）。
            etf_code: ETF 代碼。
            df: 當日持股 DataFrame。
            diff_logs: 今日 diff logs。
            snapshot_date: 資料日期字串。
        """
        notifier = ctx.notifier

        if diff_logs:
            notifier.notify_diffs(diff_logs, etf_code, snapshot_date)
            self.logger.info(f"Sent {len(diff_logs)} diff notifications for {etf_code}")

        summary: dict[str, Any] = {
            "etf_code": etf_code,
            "data_date": snapshot_date,
            "total_holdings": len(df) if df is not None else 0,
            "sync_days": 0,
            "diff_stats": {
                "total_changes": len(diff_logs),
                "new_in": len([d for d in diff_logs if d["change_type"] == "IN"]),
                "removed": len([d for d in diff_logs if d["change_type"] == "OUT"]),
                "adjusted": len([d for d in diff_logs if d["change_type"] in ["BUY", "SELL"]]),
            },
            "top_changes": sorted(
                diff_logs,
                key=lambda x: abs(x.get("diff_weight", 0)),
                reverse=True,
            )[:10],
            "market_signals": {},
        }
        notifier.notify_completion(summary)
        self.logger.info(f"Completion notification sent for {etf_code}")
