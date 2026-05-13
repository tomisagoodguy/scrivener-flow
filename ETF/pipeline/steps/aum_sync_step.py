"""
AUM Sync Step

每日同步各 ETF 的 AUM 到 etf_aum_series 表。
資料來源優先順序：
  1. FinLab ETF 基金資料（fund_price 系列）
  2. 若 FinLab 無資料，跳過該 ETF

屬於輔助步驟，整體失敗時只 log，不中斷 pipeline。
"""

import logging
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import text

from ETF.config.etf_registry import get_all_etf_codes
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.pipeline.steps.base import BaseStep

logger = logging.getLogger(__name__)

# FinLab 的 ETF 基金資料表名稱（依可用性嘗試）
_NAV_TABLE_CANDIDATES = [
    "fund_price:收盤價",
    "etf:nav",
]
_UNITS_TABLE_CANDIDATES = [
    "fund_price:已發行受益權單位數",
    "etf:units",
]


class AumSyncStep(BaseStep):
    """同步全部 ETF 每日 AUM 到 etf_aum_series（輔助步驟）"""

    @property
    def name(self) -> str:
        return "AUM Sync"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
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
        all_codes = get_all_etf_codes()

        nav_df, units_df = self._fetch_finlab_etf_data(ctx, services)
        if nav_df is None or units_df is None:
            self.logger.warning("FinLab ETF fund data not available; skipping AUM sync")
            return

        records = []
        for etf_code in all_codes:
            row = self._build_row(etf_code, target_date, nav_df, units_df)
            if row:
                records.append(row)

        if not records:
            self.logger.warning("No AUM records produced for %s", target_date)
            return

        self._upsert(services, records, services)
        self.logger.info("Upserted %d AUM records for %s", len(records), target_date)

    def _fetch_finlab_etf_data(self, ctx, services: "PipelineServices"):
        """從 FinLab 取 ETF NAV 與流通單位數 DataFrame"""
        client = services.finlab_srv._client if hasattr(services.finlab_srv, "_client") else None
        if client and not client.login():
            return None, None

        import finlab.data as fd

        nav_df = self._try_tables(fd, _NAV_TABLE_CANDIDATES)
        units_df = self._try_tables(fd, _UNITS_TABLE_CANDIDATES)
        return nav_df, units_df

    @staticmethod
    def _try_tables(fd, candidates: list[str]):
        """嘗試多個 FinLab 資料表名稱，回傳第一個成功的 DataFrame"""
        for table in candidates:
            try:
                df = fd.get(table)
                if df is not None and not df.empty:
                    return df
            except Exception as e:
                logger.debug("FinLab table '%s' not available: %s", table, e)
        return None

    def _build_row(
        self,
        etf_code: str,
        target_date: str,
        nav_df,
        units_df,
    ) -> Optional[dict]:
        """從 FinLab DataFrame 中取得指定 ETF 在 target_date 最近可用的 NAV/units"""
        code_upper = etf_code.upper()

        if code_upper not in nav_df.columns or code_upper not in units_df.columns:
            logger.debug("ETF %s not found in FinLab ETF fund data", etf_code)
            return None

        nav_series = nav_df[code_upper].dropna()
        units_series = units_df[code_upper].dropna()

        nav = self._latest_value(nav_series, target_date)
        units = self._latest_value(units_series, target_date)

        if nav is None or units is None:
            return None

        # AUM（億元）= NAV（元/份）× 流通單位數（份）/ 1e8
        aum_100m = float(nav) * float(units) / 1e8

        return {
            "etf_code": etf_code,
            "data_date": target_date,
            "aum_100m": round(aum_100m, 6),
            "nav": round(float(nav), 4),
            "units": round(float(units) / 1e8, 6),  # 換算億份
            "inflow_100m": None,  # 由 backfill / flow_compute 另行計算
        }

    @staticmethod
    def _latest_value(series, target_date: str):
        """取 ≤ target_date 的最新值"""
        from datetime import datetime
        target_dt = datetime.strptime(target_date, "%Y-%m-%d").date()
        past_rows = [
            (idx, val)
            for idx, val in series.items()
            if (idx.date() if hasattr(idx, "date") else idx) <= target_dt
        ]
        if not past_rows:
            return None
        return max(past_rows, key=lambda x: x[0])[1]

    @staticmethod
    def _upsert(services: "PipelineServices", records: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_aum_series
                (etf_code, data_date, aum_100m, nav, units, inflow_100m)
            VALUES
                (:etf_code, :data_date, :aum_100m, :nav, :units, :inflow_100m)
            ON CONFLICT (etf_code, data_date) DO UPDATE SET
                aum_100m    = EXCLUDED.aum_100m,
                nav         = EXCLUDED.nav,
                units       = EXCLUDED.units,
                inflow_100m = COALESCE(EXCLUDED.inflow_100m, etf_aum_series.inflow_100m)
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, records)
            conn.commit()

    def _sync_aum_series(self, ctx: PipelineContext, services: "PipelineServices") -> None:
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

                updates.append({
                    "etf_code": etf_code,
                    "data_date": str(r.data_date),
                    "cumulative_inflow_yi": round(cumulative, 6),
                    "inflow_share_of_growth": round(share, 6) if share is not None else None,
                })

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
