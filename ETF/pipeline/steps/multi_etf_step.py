"""
Multi-ETF Step

爬取全部次要主動式 ETF 的持股快照、AUM、產業分布，
並存入 Supabase。與現有 00981A pipeline 並行，不影響主流程。

ETF 清單從 ETF/config/etf_registry.py 動態讀取（data_source='pocket'）。
"""

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, TYPE_CHECKING

import pandas as pd

from ETF.config.etf_registry import ETF_META, get_secondary_etf_codes
from ETF.pipeline.steps.base import BaseStep, StepDomain
from ETF.pipeline.context import PipelineContext
from ETF.processors.diff_engine import compute_diff

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

# ETF 清單從 etf_registry 動態讀取，請勿在此處 hardcode


def _get_today_trading_date() -> str:
    """回傳今日交易日（台灣時間，15:00 前取前一交易日）。

    邏輯同 ScrapeStep._last_weekday()，用於 gap-fill 判斷。
    """
    tw_now = datetime.now(timezone(timedelta(hours=8)))
    if tw_now.hour < 15:
        tw_now -= timedelta(days=1)
    d = tw_now.date()
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d.isoformat()


class MultiEtfStep(BaseStep):
    """爬取並儲存次要 ETF 的持股、AUM、產業資料（asyncio 並行）"""

    @property
    def name(self) -> str:
        return "Multi-ETF Scrape & Save"

    @property
    def domain(self) -> StepDomain:
        return StepDomain.SCRAPING

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(
        self, ctx: PipelineContext, services: "PipelineServices"
    ) -> PipelineContext:
        secondary_etf_codes = get_secondary_etf_codes()
        results = asyncio.run(self._scrape_all(ctx, services, secondary_etf_codes))

        all_secondary_codes: list[str] = []
        for result in results:
            if isinstance(result, Exception):
                self.logger.error(f"ETF scrape task failed: {result}")
                continue
            etf_code, codes, summary, scrape_result, fund_assets = result
            ctx.scrape_results.append(scrape_result)
            if codes:
                all_secondary_codes.extend(codes)
            if summary:
                ctx.all_etf_summaries.append(summary)
            # 基金資產摘要傳給 AumSyncStep；無摘要的 ETF 不寫入
            if fund_assets:
                ctx.etf_fund_assets[etf_code] = fund_assets

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
    ) -> tuple[str, list[str], dict | None, dict, dict | None]:
        """Scrape & save one ETF.

        Returns (etf_code, stock_codes, summary_or_None, scrape_result, fund_assets_or_None).

        Three-layer fallback chain: official_api → moneydj → pocket.
        No exception propagates regardless of which layers fail.
        """
        fallback_date = ctx.date_str or date.today().strftime("%Y-%m-%d")
        entry = ETF_META.get(etf_code)
        name = entry.name if entry else etf_code
        self.logger.info(f"Processing {etf_code} ({name})...")

        df, data_date, source, used_fallback, fund_assets = self._fetch_with_fallback(
            ctx, etf_code, fallback_date
        )
        scrape_result = {
            "etf_code": etf_code,
            "source": source,
            "used_fallback": used_fallback,
            "data_date": data_date,
        }

        try:
            if df is None or df.empty:
                self.logger.warning(f"No holdings data for {etf_code}")
                return etf_code, [], None, scrape_result, fund_assets

            snapshot_date = (data_date or fallback_date).replace("/", "-")

            try:
                df = services.finlab_srv.attach_prices(df, snapshot_date)
                self.logger.info(f"FinLab price attach succeeded for {etf_code}")
            except Exception as e:
                self.logger.warning(f"FinLab price attach failed for {etf_code}: {e}")

            services.storage.save_snapshot(df, etf_code, snapshot_date)
            self._save_weight_history(services, etf_code, df, snapshot_date)

            # 補齊交易日空白：Pocket.tw 可能數天才更新一次，來源日期舊於今日
            # 時仍寫入今日快照，確保時序無斷點。
            # Ref: stock-data-ai/stock-data etf_utils.py::record_unchanged_snapshot()
            self._fill_trading_day_gap(services, etf_code, df, snapshot_date)

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
                    "adjusted": len(
                        [d for d in diff_logs if d["change_type"] in ["BUY", "SELL"]]
                    ),
                },
            }
            return etf_code, stock_codes, summary, scrape_result, fund_assets

        except Exception as e:
            self.logger.error(f"Holdings scrape failed for {etf_code}: {e}")
            return etf_code, [], None, scrape_result, fund_assets

    # ------------------------------------------------------------------ fallback chain

    def _fetch_with_fallback(
        self,
        ctx: PipelineContext,
        etf_code: str,
        fallback_date: str,
    ) -> tuple[pd.DataFrame | None, str | None, str, bool, dict | None]:
        """Fixed three-layer fallback: official_api → moneydj → pocket.

        Returns (df, data_date, source, used_fallback, fund_assets).
        fund_assets 僅 official_api 來源可能帶有（{aum, nav, units, nav_date}），
        moneydj / pocket fallback 無基金資產摘要，回 None。
        All layer exceptions are caught; logs each failure reason when all layers fail.
        """
        from ETF.scrapers import official_api_scraper, moneydj_scraper, pocket_scraper

        layer_errors: dict[str, str] = {}
        # 債券型 ETF（如富邦 00982D/00983D）持股為空但仍可能有資產摘要；
        # 空持股走 fallback 時保留 official_api 的 fund_assets，避免 NAV 遺失。
        official_assets: dict | None = None

        # Layer 1: official_api
        try:
            df = official_api_scraper.fetch_holdings(etf_code, ctx.date_str)
            official_assets = df.attrs.get("fund_assets") if df is not None else None
            if df is not None and not df.empty:
                self.logger.info(f"[{etf_code}] official_api succeeded")
                return (
                    df,
                    ctx.date_str or fallback_date,
                    "official_api",
                    False,
                    official_assets,
                )
            layer_errors["official_api"] = "empty DataFrame"
        except Exception as e:
            layer_errors["official_api"] = str(e)
            self.logger.warning(f"[{etf_code}] official_api raised: {e}")

        # Layer 2: moneydj (1s delay to avoid anti-scraping)
        try:
            import time

            time.sleep(1)
            moneydj_df = moneydj_scraper.scrape_moneydj(etf_code)
            if moneydj_df is not None and not moneydj_df.empty:
                data_date = moneydj_df.attrs.get("data_date", fallback_date)
                # Normalize column names: scrape_moneydj returns code/name/weight/shares already
                self.logger.info(
                    f"[{etf_code}] moneydj fallback succeeded (data_date={data_date})"
                )
                return moneydj_df, data_date, "moneydj", True, official_assets
            layer_errors["moneydj"] = "None or empty DataFrame"
        except Exception as e:
            layer_errors["moneydj"] = str(e)
            self.logger.warning(f"[{etf_code}] moneydj raised: {e}")

        # Layer 3: pocket
        try:
            pocket_df, pocket_date = pocket_scraper.scrape_holdings(etf_code)
            if pocket_df is not None and not pocket_df.empty:
                self.logger.info(
                    f"[{etf_code}] pocket fallback succeeded (data_date={pocket_date})"
                )
                return (
                    pocket_df,
                    pocket_date or fallback_date,
                    "pocket",
                    True,
                    official_assets,
                )
            layer_errors["pocket"] = "None or empty DataFrame"
        except Exception as e:
            layer_errors["pocket"] = str(e)
            self.logger.warning(f"[{etf_code}] pocket raised: {e}")

        # All three layers failed（仍回傳 official_assets，AUM sync 可用）
        for layer_name, err in layer_errors.items():
            self.logger.error(f"[{etf_code}] {layer_name} failed: {err}")
        self.logger.error(f"[{etf_code}] All three layers failed, skipping this ETF")
        return None, None, "none", False, official_assets

    # ------------------------------------------------------------------ helpers

    def _fill_trading_day_gap(
        self,
        services: "PipelineServices",
        etf_code: str,
        df: pd.DataFrame,
        source_date: str,
    ) -> None:
        """來源未更新時，補寫今日交易日快照，確保 etf_holdings_snapshot / etf_weight_history 無空白。

        Pocket.tw 的 data_date 反映 ETF 公告日，可能數天才更新一次（正常行為）。
        若不補齊，前端時序圖會出現缺口，buyingPattern / weightHistory 也會斷裂。

        邏輯：
          1. 計算今日交易日 today_str
          2. 若 source_date == today_str → 資料是新的，無需補齊
          3. 若 DB 最新日期已是 today_str → 本次 pipeline 已寫入，跳過
          4. 否則以相同 df 寫入 today_str 快照（upsert 安全）

        Ref: stock-data-ai/stock-data etf_utils.py::record_unchanged_snapshot()
        """
        today_str = _get_today_trading_date()
        if source_date == today_str:
            return  # 資料是最新的，不需補齊

        try:
            latest_in_db = services.storage.get_latest_date(etf_code)
            if latest_in_db == today_str:
                self.logger.debug(f"[GAP-FILL] {etf_code}: {today_str} 已在 DB，跳過")
                return

            services.storage.save_snapshot(df, etf_code, today_str)
            self._save_weight_history(services, etf_code, df, today_str)
            self.logger.info(
                f"[GAP-FILL] {etf_code}: 來源未更新（{source_date}），"
                f"記錄 {today_str} 快照（持股同 {source_date}）"
            )
        except Exception as e:
            # gap-fill 是輔助行為，失敗不應中斷主流程
            self.logger.warning(f"[GAP-FILL] {etf_code}: 補齊失敗 — {e}")

    def _save_weight_history(
        self,
        services: "PipelineServices",
        etf_code: str,
        df: pd.DataFrame,
        snapshot_date: str,
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
            self.logger.warning(
                f"Could not fetch previous snapshot for {etf_code}: {e}"
            )

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
