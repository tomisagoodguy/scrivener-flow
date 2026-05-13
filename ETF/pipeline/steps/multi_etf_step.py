"""
Multi-ETF Step

爬取全部次要主動式 ETF 的持股快照、AUM、產業分布，
並存入 Supabase。與現有 00981A pipeline 並行，不影響主流程。

ETF 清單從 ETF/config/etf_registry.py 動態讀取（data_source='pocket'）。
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from typing import Any, TYPE_CHECKING

import pandas as pd

from ETF.config.etf_registry import ETF_META, get_secondary_etf_codes
from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext
from ETF.processors.diff_engine import compute_diff

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

# ETF 清單從 etf_registry 動態讀取，請勿在此處 hardcode


class MultiEtfStep(BaseStep):
    """爬取並儲存次要 ETF 的持股、AUM、產業資料（asyncio 並行）"""

    @property
    def name(self) -> str:
        return "Multi-ETF Scrape & Save"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        secondary_etf_codes = get_secondary_etf_codes()
        results = asyncio.run(self._scrape_all(ctx, services, secondary_etf_codes))

        all_secondary_codes: list[str] = []
        for result in results:
            if isinstance(result, Exception):
                self.logger.error(f"ETF scrape task failed: {result}")
                continue
            etf_code, codes, summary = result
            if codes:
                all_secondary_codes.extend(codes)
            if summary:
                ctx.all_etf_summaries.append(summary)

        if all_secondary_codes:
            ctx.secondary_stock_codes = list(set(all_secondary_codes))
            self.logger.info(
                f"Collected {len(ctx.secondary_stock_codes)} unique stock codes "
                f"from {len(secondary_etf_codes)} secondary ETFs"
            )
        return ctx

    async def _scrape_all(
        self,
        ctx: PipelineContext,
        services: "PipelineServices",
        etf_codes: list[str],
    ) -> list[Any]:
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(None, self._scrape_one, ctx, services, code)
            for code in etf_codes
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)

    def _scrape_one(
        self,
        ctx: PipelineContext,
        services: "PipelineServices",
        etf_code: str,
    ) -> tuple[str, list[str], dict | None]:
        """Scrape & save one ETF. Returns (etf_code, stock_codes, summary_or_None)."""
        from ETF.scrapers import official_api_scraper, pocket_scraper

        fallback_date = ctx.date_str or date.today().strftime("%Y-%m-%d")
        entry = ETF_META.get(etf_code)
        name = entry.name if entry else etf_code
        self.logger.info(f"Processing {etf_code} ({name})...")

        try:
            if entry and entry.source == "official_api":
                df = official_api_scraper.fetch_holdings(etf_code, ctx.date_str)
                data_date = ctx.date_str or fallback_date
                if df.empty:
                    self.logger.warning(
                        f"[OFFICIAL_API] {etf_code} 回傳空資料，fallback → pocket_scraper"
                    )
                    df, data_date = pocket_scraper.scrape_holdings(etf_code)
            else:
                df, data_date = pocket_scraper.scrape_holdings(etf_code)

            if df is None or df.empty:
                self.logger.warning(f"No holdings data for {etf_code}")
                return etf_code, [], None

            snapshot_date = (data_date or fallback_date).replace("/", "-")

            try:
                df = services.finlab_srv.attach_prices(df, snapshot_date)
                self.logger.info(f"FinLab price attach succeeded for {etf_code}")
            except Exception as e:
                self.logger.warning(f"FinLab price attach failed for {etf_code}: {e}")

            services.storage.save_snapshot(df, etf_code, snapshot_date)
            self._save_weight_history(services, etf_code, df, snapshot_date)

            stock_codes = df["code"].tolist()

            diff_logs: list[dict] = []
            try:
                diff_logs = self._compute_diff(services, etf_code, df, snapshot_date)
                if diff_logs:
                    self._save_diff_logs(services, diff_logs)
            except Exception as e:
                self.logger.error(f"Diff/collect failed for {etf_code}: {e}")

            summary = {
                "etf_code": etf_code,
                "etf_name": name,
                "data_date": snapshot_date,
                "total_holdings": len(df),
                "diff_logs": diff_logs,
                "diff_stats": {
                    "total_changes": len(diff_logs),
                    "new_in": len([d for d in diff_logs if d["change_type"] == "IN"]),
                    "removed": len([d for d in diff_logs if d["change_type"] == "OUT"]),
                    "adjusted": len([d for d in diff_logs if d["change_type"] in ["BUY", "SELL"]]),
                },
            }
            return etf_code, stock_codes, summary

        except Exception as e:
            self.logger.error(f"Holdings scrape failed for {etf_code}: {e}")
            return etf_code, [], None

    # ------------------------------------------------------------------ helpers

    def _save_weight_history(
        self, services: "PipelineServices", etf_code: str, df: pd.DataFrame, snapshot_date: str
    ) -> None:
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
            with services.sql_storage.engine.connect() as conn:
                conn.execute(upsert_sql, records)
                conn.commit()
            self.logger.info(f"Saved weight history for {etf_code}")
        except Exception as e:
            self.logger.warning(f"Weight history save failed for {etf_code}: {e}")

    def _compute_diff(
        self,
        services: "PipelineServices",
        etf_code: str,
        curr_df: pd.DataFrame,
        snapshot_date: str,
    ) -> list[dict[str, Any]]:
        latest_date_in_db = None
        prev_df = pd.DataFrame()
        try:
            latest_date_in_db = services.storage.get_latest_date(etf_code)
            if latest_date_in_db == snapshot_date:
                prev_df = services.storage.get_snapshot_by_index(etf_code, index=1)
            else:
                prev_df = (
                    services.storage.get_snapshot_from_date(etf_code, latest_date_in_db)
                    if latest_date_in_db
                    else pd.DataFrame()
                )
        except Exception as e:
            self.logger.warning(f"Could not fetch previous snapshot for {etf_code}: {e}")

        if prev_df.empty and latest_date_in_db is not None:
            self.logger.warning(
                f"Previous snapshot empty despite DB history for {etf_code} "
                f"(latest_date={latest_date_in_db}). Skipping diff."
            )
            return []

        diff_logs = compute_diff(prev_df, curr_df, etf_code, snapshot_date)
        self.logger.info(f"Computed {len(diff_logs)} diff events for {etf_code}")
        return diff_logs

    def _save_diff_logs(
        self, services: "PipelineServices", diff_logs: list[dict[str, Any]]
    ) -> None:
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
            with services.sql_storage.engine.connect() as conn:
                conn.execute(upsert_sql, diff_logs)
                conn.commit()
            self.logger.info(
                f"Saved {len(diff_logs)} diff logs for {diff_logs[0]['etf_code']}"
            )
        except Exception as e:
            self.logger.error(f"Failed to save diff logs: {e}")
