"""
AUM Sync Step

每日同步各 ETF 的 AUM 到 etf_aum_series 表。
資料來源：MultiEtfStep 在持股爬取時順手抽出的基金資產摘要，
經 PipelineContext.etf_fund_assets 傳入（{aum, nav, units, nav_date}）。

屬於輔助步驟，整體失敗時只 log，不中斷 pipeline。
"""

import logging
from datetime import date
from typing import Optional

from sqlalchemy import text

from ETF.config.etf_registry import get_all_etf_codes
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.pipeline.steps.base import BaseStep

logger = logging.getLogger(__name__)


def compute_premium_pct(close: object, nav: object) -> Optional[float]:
    """折溢價 % = (close - nav) / nav * 100。

    close 或 nav 任一缺（或 nav 為 0）→ None，不以估計值代替。
    輸入容忍 Decimal（DB NUMERIC）與 float。
    """
    if close is None or nav is None:
        return None
    close_f, nav_f = float(close), float(nav)  # type: ignore[arg-type]
    if nav_f == 0:
        return None
    return round((close_f - nav_f) / nav_f * 100, 6)


def compute_decomposition(
    units_t: object,
    nav_t: object,
    units_prev: object,
    nav_prev: object,
) -> tuple[Optional[float], Optional[float]]:
    """AUM 成長拆解（近似式，units 由 AUM/NAV 推算）。

    inflow = (units_t - units_prev) * nav_t（當日淨申購，億元）
    market_pnl = units_prev * (nav_t - nav_prev)（當日市值貢獻，億元）
    前日無資料（units_prev 缺）或當日 units/nav 缺 → (None, None)。
    """
    if units_t is None or nav_t is None or units_prev is None:
        return (None, None)
    units_t_f, nav_t_f = float(units_t), float(nav_t)  # type: ignore[arg-type]
    units_prev_f = float(units_prev)  # type: ignore[arg-type]
    inflow = round((units_t_f - units_prev_f) * nav_t_f, 6)
    market_pnl = None
    if nav_prev is not None:
        market_pnl = round(units_prev_f * (nav_t_f - float(nav_prev)), 6)  # type: ignore[arg-type]
    return (inflow, market_pnl)


class AumSyncStep(BaseStep):
    """同步全部 ETF 每日 AUM 到 etf_aum_series（輔助步驟）"""

    @property
    def name(self) -> str:
        return "AUM Sync"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(
        self, ctx: PipelineContext, services: "PipelineServices"
    ) -> PipelineContext:
        try:
            self._sync_all(ctx, services)
        except Exception as e:
            # 輔助步驟：只 log，不 raise
            self.logger.error(f"AumSyncStep failed: {e}")

        try:
            self._sync_aum_series(ctx, services)
        except Exception as e:
            self.logger.error(f"AumSyncStep._sync_aum_series failed: {e}")

        return ctx

    # ------------------------------------------------------------------ private

    def _sync_all(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")
        fund_assets = ctx.etf_fund_assets or {}

        if not fund_assets:
            self.logger.warning(
                "No fund assets in context (ctx.etf_fund_assets empty); skipping AUM sync"
            )
            return

        records = []
        for etf_code, assets in fund_assets.items():
            row = self._build_row(etf_code, target_date, assets)
            if row:
                records.append(row)

        if not records:
            self.logger.warning("No AUM records produced for %s", target_date)
            return

        # 市場機制欄位（close/premium_pct/inflow/market_pnl）：計算失敗只 log，不中斷
        codes = [r["etf_code"] for r in records]
        try:
            closes = self._fetch_closes(services, codes, target_date)
        except Exception as e:
            self.logger.error("fetch closes failed, premium_pct will be NULL: %s", e)
            closes = {}
        try:
            prev_rows = self._fetch_prev_rows(services, codes, target_date)
        except Exception as e:
            self.logger.error(
                "fetch prev rows failed, inflow/market_pnl will be NULL: %s", e
            )
            prev_rows = {}
        records = self._enrich_mechanics(records, closes, prev_rows)

        self._upsert(services, records)
        self.logger.info("Upserted %d AUM records for %s", len(records), target_date)

    def _build_row(
        self,
        etf_code: str,
        target_date: str,
        assets: dict,
    ) -> Optional[dict]:
        """將 ctx.etf_fund_assets 的單支摘要換算成 etf_aum_series record。

        aum_100m = aum / 1e8（億元）、units = units / 1e8（億份）、nav 不變（元/份）。
        aum 缺失時無法寫入，回 None；nav / units 可為 None。
        """
        aum = assets.get("aum")
        if aum is None:
            logger.debug("ETF %s 無 aum，跳過", etf_code)
            return None

        nav = assets.get("nav")
        units = assets.get("units")

        return {
            "etf_code": etf_code,
            "data_date": target_date,
            "aum_100m": round(float(aum) / 1e8, 6),
            "nav": round(float(nav), 4) if nav is not None else None,
            "units": round(float(units) / 1e8, 6)
            if units is not None
            else None,  # 換算億份
            "inflow_100m": None,  # 由 backfill / flow_compute 另行計算
        }

    def _enrich_mechanics(
        self,
        records: list[dict],
        closes: dict,
        prev_rows: dict,
    ) -> list[dict]:
        """把市場機制四欄併入 records（缺輸入 → None，不估計）。"""
        for r in records:
            code = r["etf_code"]
            close = closes.get(code)
            r["close"] = round(float(close), 4) if close is not None else None
            r["premium_pct"] = compute_premium_pct(close, r["nav"])
            prev = prev_rows.get(code) or {}
            r["inflow"], r["market_pnl"] = compute_decomposition(
                r["units"], r["nav"], prev.get("units"), prev.get("nav")
            )
        return records

    @staticmethod
    def _fetch_closes(
        services: "PipelineServices", codes: list[str], target_date: str
    ) -> dict:
        """取各 ETF 於 target_date 的 FinLab 收盤價。

        只取「當日」收盤價，日期不符不用舊價（避免折溢價失真）；
        該日無資料回空 dict → premium_pct 全 NULL。
        """
        import pandas as pd

        close_df = services.finlab_srv._get_data("close")
        if close_df is None or close_df.empty:
            return {}
        ts = pd.Timestamp(target_date)
        if ts not in close_df.index:
            logger.warning("FinLab close has no row for %s", target_date)
            return {}
        row = close_df.loc[ts]
        result = {}
        for code in codes:
            if code in row.index and pd.notna(row[code]):
                result[code] = float(row[code])
        return result

    @staticmethod
    def _fetch_prev_rows(
        services: "PipelineServices", codes: list[str], target_date: str
    ) -> dict:
        """取各 ETF 在 target_date 之前最近一列的 nav/units（拆解用前值）。"""
        sql = text("""
            SELECT DISTINCT ON (etf_code) etf_code, nav, units
            FROM etf_aum_series
            WHERE etf_code = ANY(:codes)
              AND data_date < :target_date
            ORDER BY etf_code, data_date DESC
        """)
        with services.sql_storage.engine.connect() as conn:
            rows = conn.execute(
                sql, {"codes": codes, "target_date": target_date}
            ).fetchall()
        return {r.etf_code: {"nav": r.nav, "units": r.units} for r in rows}

    @staticmethod
    def _upsert(services: "PipelineServices", records: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_aum_series
                (etf_code, data_date, aum_100m, nav, units, inflow_100m,
                 close, premium_pct, inflow, market_pnl)
            VALUES
                (:etf_code, :data_date, :aum_100m, :nav, :units, :inflow_100m,
                 :close, :premium_pct, :inflow, :market_pnl)
            ON CONFLICT (etf_code, data_date) DO UPDATE SET
                aum_100m    = EXCLUDED.aum_100m,
                nav         = EXCLUDED.nav,
                units       = EXCLUDED.units,
                inflow_100m = COALESCE(EXCLUDED.inflow_100m, etf_aum_series.inflow_100m),
                close       = COALESCE(EXCLUDED.close, etf_aum_series.close),
                premium_pct = COALESCE(EXCLUDED.premium_pct, etf_aum_series.premium_pct),
                inflow      = COALESCE(EXCLUDED.inflow, etf_aum_series.inflow),
                market_pnl  = COALESCE(EXCLUDED.market_pnl, etf_aum_series.market_pnl)
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, records)
            conn.commit()

    def _sync_aum_series(
        self, ctx: PipelineContext, services: "PipelineServices"
    ) -> None:
        """計算並更新 cumulative_inflow_yi 與 inflow_share_of_growth（增量欄位）"""
        all_codes = get_all_etf_codes()
        sql_read = text("""
            SELECT etf_code, data_date, aum_100m, nav, units, inflow_100m
            FROM etf_aum_series
            WHERE etf_code = ANY(:codes)
              AND aum_100m IS NOT NULL
            ORDER BY etf_code, data_date
        """)
        with services.sql_storage.engine.connect() as conn:
            rows = conn.execute(sql_read, {"codes": all_codes}).fetchall()

        if not rows:
            return

        from collections import defaultdict

        by_etf: dict[str, list] = defaultdict(list)
        for r in rows:
            by_etf[r.etf_code].append(r)

        updates = []
        for etf_code, series in by_etf.items():
            cumulative = 0.0
            aum_first = float(series[0].aum_100m)
            for i, r in enumerate(series):
                inflow = float(r.inflow_100m) if r.inflow_100m is not None else 0.0
                if i == 0:
                    inflow = 0.0
                cumulative += inflow

                aum_now = float(r.aum_100m)
                growth = aum_now - aum_first
                if growth > 0:
                    share = cumulative / growth
                else:
                    share = None

                updates.append(
                    {
                        "etf_code": etf_code,
                        "data_date": str(r.data_date),
                        "cumulative_inflow_yi": round(cumulative, 6),
                        "inflow_share_of_growth": round(share, 6)
                        if share is not None
                        else None,
                    }
                )

        sql_update = text("""
            UPDATE etf_aum_series SET
                cumulative_inflow_yi   = :cumulative_inflow_yi,
                inflow_share_of_growth = :inflow_share_of_growth
            WHERE etf_code = :etf_code
              AND data_date = :data_date
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql_update, updates)
            conn.commit()
        logger.info("Updated cumulative_inflow_yi for %d rows", len(updates))
