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

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        try:
            self._sync_all(ctx)
        except Exception as e:
            # 輔助步驟：只 log，不 raise
            self.logger.error(f"AumSyncStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------ private

    def _sync_all(self, ctx: PipelineContext) -> None:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")
        all_codes = get_all_etf_codes()

        nav_df, units_df = self._fetch_finlab_etf_data(ctx)
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

        self._upsert(ctx, records)
        self.logger.info("Upserted %d AUM records for %s", len(records), target_date)

    def _fetch_finlab_etf_data(self, ctx):
        """從 FinLab 取 ETF NAV 與流通單位數 DataFrame"""
        client = ctx.finlab_srv._client if hasattr(ctx.finlab_srv, "_client") else None
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
    def _upsert(ctx: PipelineContext, records: list[dict]) -> None:
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
        with ctx.sql_storage.engine.connect() as conn:
            conn.execute(sql, records)
            conn.commit()
