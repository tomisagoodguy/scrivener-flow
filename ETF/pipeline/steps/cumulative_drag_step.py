"""
Cumulative Drag Step

從 etf_frontrunning_stats 計算每支 ETF 的年化隱成本：
  excess_volume_shares = max(r_t0 - 1, 0) × baseline_median_vol
  manager_drag_shares  = abs(delta_shares) × max(r_t0 - 1, 0)

年化後除以 AUM（億元）得到 kshares/億 單位指標，寫入 etf_cumulative_drag。

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
"""

import logging
from datetime import date
from statistics import median
from typing import Optional

from sqlalchemy import text

from ETF.config.etf_registry import get_all_etf_codes
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.pipeline.steps.base import BaseStep

logger = logging.getLogger(__name__)

BASELINE_WINDOW = 20   # 與 FrontrunningStep 一致


class CumulativeDragStep(BaseStep):
    """年化 excess_volume / manager_drag 計算（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Cumulative Drag"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            self.logger.error(f"CumulativeDragStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------ private

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        computed_date = ctx.date_str or date.today().strftime("%Y-%m-%d")
        all_codes = get_all_etf_codes()

        events_by_etf = self._fetch_events(ctx, all_codes, services)
        if not events_by_etf:
            self.logger.info("No frontrunning events available; skipping drag computation")
            return

        aum_map = self._fetch_latest_aum(ctx, all_codes, services)
        vol_baseline_map = self._fetch_baseline_volumes(ctx, services)

        records = []
        for etf_code in all_codes:
            events = events_by_etf.get(etf_code, [])
            if not events:
                continue
            rec = self._compute_drag(etf_code, events, aum_map, vol_baseline_map, computed_date)
            if rec:
                records.append(rec)

        if records:
            self._upsert(services, records)
            self.logger.info("Upserted %d drag records for %s", len(records), computed_date)

    def _fetch_events(self, ctx: PipelineContext, all_codes: list[str], services: "PipelineServices") -> dict:
        """從 etf_frontrunning_stats 讀取所有有效事件"""
        sql = text("""
            SELECT etf_code, stock_code, event_date,
                   delta_shares, r_t0
            FROM etf_frontrunning_stats
            WHERE etf_code = ANY(:codes)
              AND r_t0 IS NOT NULL
            ORDER BY etf_code, event_date
        """)
        with services.sql_storage.engine.connect() as conn:
            rows = conn.execute(sql, {"codes": all_codes}).fetchall()

        from collections import defaultdict
        result: dict[str, list] = defaultdict(list)
        for r in rows:
            result[r.etf_code].append({
                "stock_code": r.stock_code,
                "event_date": r.event_date,
                "delta_shares": float(r.delta_shares or 0),
                "r_t0": float(r.r_t0),
            })
        return result

    def _fetch_latest_aum(self, ctx: PipelineContext, all_codes: list[str], services: "PipelineServices") -> dict[str, float]:
        """取各 ETF 最新 AUM（億元）"""
        sql = text("""
            SELECT DISTINCT ON (etf_code) etf_code, aum_100m
            FROM etf_aum_series
            WHERE etf_code = ANY(:codes)
              AND aum_100m IS NOT NULL
            ORDER BY etf_code, data_date DESC
        """)
        with services.sql_storage.engine.connect() as conn:
            rows = conn.execute(sql, {"codes": all_codes}).fetchall()
        return {r.etf_code: float(r.aum_100m) for r in rows}

    def _fetch_baseline_volumes(self, ctx: PipelineContext, services: "PipelineServices") -> dict[str, float]:
        """從 stock_prices_daily 取各股近 20 日成交量 median 作為 baseline"""
        sql = text("""
            SELECT stock_code, volume
            FROM stock_prices_daily
            WHERE volume > 0
              AND date >= CURRENT_DATE - INTERVAL '30 days'
        """)
        from collections import defaultdict
        vols: dict[str, list[float]] = defaultdict(list)
        try:
            with services.sql_storage.engine.connect() as conn:
                rows = conn.execute(sql).fetchall()
            for r in rows:
                vols[r.stock_code].append(float(r.volume))
        except Exception as e:
            logger.warning(f"Could not fetch baseline volumes from DB: {e}")
        return {code: median(vals) for code, vals in vols.items() if vals}

    def _compute_drag(
        self,
        etf_code: str,
        events: list[dict],
        aum_map: dict[str, float],
        vol_baseline_map: dict[str, float],
        computed_date: str,
    ) -> Optional[dict]:
        dates = [ev["event_date"] for ev in events]
        if len(dates) < 2:
            days_span = 1
        else:
            days_span = max((max(dates) - min(dates)).days, 1)

        total_excess = 0.0
        total_drag = 0.0
        for ev in events:
            r0 = ev["r_t0"]
            excess_factor = max(r0 - 1.0, 0.0)
            baseline = vol_baseline_map.get(ev["stock_code"], 0.0)
            total_excess += excess_factor * baseline
            total_drag += abs(ev["delta_shares"]) * excess_factor

        n_events = len(events)
        annualize = 365.0 / days_span

        aum = aum_map.get(etf_code)
        if aum and aum > 0:
            annual_excess = (total_excess / 1000) * annualize / aum   # 千股/億
            annual_drag = (total_drag / 1000) * annualize / aum
        else:
            annual_excess = None
            annual_drag = None

        return {
            "etf_code": etf_code,
            "computed_date": computed_date,
            "n_events": n_events,
            "days_span": days_span,
            "events_per_year": round(n_events * annualize, 4),
            "annual_excess_volume_kshares_per_yi": round(annual_excess, 6) if annual_excess is not None else None,
            "annual_manager_drag_kshares_per_yi": round(annual_drag, 6) if annual_drag is not None else None,
        }

    @staticmethod
    def _upsert(services: "PipelineServices", records: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_cumulative_drag
                (etf_code, computed_date, n_events, days_span, events_per_year,
                 annual_excess_volume_kshares_per_yi, annual_manager_drag_kshares_per_yi)
            VALUES
                (:etf_code, :computed_date, :n_events, :days_span, :events_per_year,
                 :annual_excess_volume_kshares_per_yi, :annual_manager_drag_kshares_per_yi)
            ON CONFLICT (etf_code, computed_date) DO UPDATE SET
                n_events       = EXCLUDED.n_events,
                days_span      = EXCLUDED.days_span,
                events_per_year = EXCLUDED.events_per_year,
                annual_excess_volume_kshares_per_yi = EXCLUDED.annual_excess_volume_kshares_per_yi,
                annual_manager_drag_kshares_per_yi  = EXCLUDED.annual_manager_drag_kshares_per_yi
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, records)
            conn.commit()
