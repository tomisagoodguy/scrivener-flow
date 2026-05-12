"""
Frontrunning Step

分析主動 ETF 揭露日前後的異常成交量：
  - 從 etf_holdings_snapshot 取相鄰揭露日的加碼事件
  - 用 FinLab price:成交股數 計算揭露日 T/T+1/T+2 的異常成交量比率
  - 寫入 etf_frontrunning_stats

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
"""

import logging
from datetime import date
from statistics import median
from typing import Optional

import pandas as pd
from sqlalchemy import text

from ETF.config.etf_registry import get_all_etf_codes
from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

logger = logging.getLogger(__name__)

MIN_DELTA_SHARES = 100_000      # 加碼最低門檻（股）
MIN_DELTA_PCT = 5.0             # 加碼比例門檻（%）
BASELINE_WINDOW = 20            # baseline 成交量天數
MIN_NONZERO_DAYS = 10           # baseline 最少非零天數


class FrontrunningStep(BaseStep):
    """揭露日異常成交量偵測（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Frontrunning Analysis"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        try:
            events = self._build_add_events(ctx)
            if not events:
                self.logger.info("No add events found; skipping frontrunning analysis")
                return ctx

            events = self._attach_volume_ratios(ctx, events)
            self._upsert(ctx, events)
            self.logger.info("Upserted %d frontrunning events", len(events))
        except Exception as e:
            self.logger.error(f"FrontrunningStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------ private

    def _build_add_events(self, ctx: PipelineContext) -> list[dict]:
        """比較相鄰揭露日的持股差異，抽取加碼事件"""
        all_codes = get_all_etf_codes()

        sql = text("""
            SELECT etf_code, stock_code, stock_name, shares, data_date
            FROM etf_holdings_snapshot
            WHERE etf_code = ANY(:codes)
            ORDER BY etf_code, stock_code, data_date
        """)
        with ctx.sql_storage.engine.connect() as conn:
            rows = conn.execute(sql, {"codes": all_codes}).fetchall()

        if not rows:
            return []

        # Group by (etf_code, stock_code) -> sorted list of (date, shares)
        from collections import defaultdict
        grouped: dict[tuple, list] = defaultdict(list)
        for r in rows:
            grouped[(r.etf_code, r.stock_code)].append((r.data_date, float(r.shares or 0), r.stock_name))

        events = []
        for (etf_code, stock_code), history in grouped.items():
            history.sort(key=lambda x: x[0])
            stock_name = history[-1][2] if history else ""

            for i in range(1, len(history)):
                prev_date, prev_shares, _ = history[i - 1]
                cur_date, cur_shares, _ = history[i]

                delta = cur_shares - prev_shares
                is_new = prev_shares == 0 and cur_shares > 0

                if is_new:
                    if cur_shares < MIN_DELTA_SHARES:
                        continue
                    events.append({
                        "etf_code": etf_code,
                        "stock_code": stock_code,
                        "stock_name": stock_name,
                        "event_date": str(cur_date),
                        "delta_shares": cur_shares,
                        "prev_shares": 0.0,
                        "cur_shares": cur_shares,
                        "delta_pct": None,
                        "is_new_position": True,
                    })
                else:
                    if delta < MIN_DELTA_SHARES:
                        continue
                    if prev_shares == 0:
                        continue
                    delta_pct = delta / prev_shares * 100
                    if delta_pct < MIN_DELTA_PCT:
                        continue
                    events.append({
                        "etf_code": etf_code,
                        "stock_code": stock_code,
                        "stock_name": stock_name,
                        "event_date": str(cur_date),
                        "delta_shares": delta,
                        "prev_shares": prev_shares,
                        "cur_shares": cur_shares,
                        "delta_pct": round(delta_pct, 4),
                        "is_new_position": False,
                    })
        return events

    def _attach_volume_ratios(self, ctx: PipelineContext, events: list[dict]) -> list[dict]:
        """用 FinLab 成交股數計算揭露日前後異常量比率"""
        try:
            import finlab.data as fd
            vol_df: pd.DataFrame = fd.get("price:成交股數")
        except Exception as e:
            self.logger.error(f"FinLab volume fetch failed: {e}")
            for ev in events:
                ev["r_t0"] = None
                ev["r_t1"] = None
                ev["r_t2"] = None
            return events

        for ev in events:
            code = ev["stock_code"]
            if code not in vol_df.columns:
                ev["r_t0"] = ev["r_t1"] = ev["r_t2"] = None
                continue

            series = vol_df[code].dropna()
            event_date = pd.Timestamp(ev["event_date"])
            ev["r_t0"] = self._compute_ratio(series, event_date, 0)
            ev["r_t1"] = self._compute_ratio(series, event_date, 1)
            ev["r_t2"] = self._compute_ratio(series, event_date, 2)
        return events

    @staticmethod
    def _compute_ratio(series: pd.Series, event_date: pd.Timestamp, offset: int) -> Optional[float]:
        """計算 vol(event_date + offset trading days) / median(20-day baseline)"""
        trading_dates = series.index[series.index <= event_date + pd.Timedelta(days=30)]
        target_dates_after = [d for d in series.index if d >= event_date]
        if len(target_dates_after) <= offset:
            return None
        target_date = target_dates_after[offset]

        before_dates = [d for d in series.index if d < event_date]
        baseline_window = before_dates[-BASELINE_WINDOW:] if len(before_dates) >= BASELINE_WINDOW else before_dates
        baseline_vals = [float(series[d]) for d in baseline_window if float(series[d]) > 0]

        if len(baseline_vals) < MIN_NONZERO_DAYS:
            return None

        baseline_median = median(baseline_vals)
        if baseline_median == 0:
            return None

        target_vol = float(series.get(target_date, 0))
        return round(target_vol / baseline_median, 4)

    @staticmethod
    def _upsert(ctx: PipelineContext, events: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_frontrunning_stats
                (etf_code, stock_code, event_date, delta_shares, prev_shares, cur_shares,
                 delta_pct, is_new_position, r_t0, r_t1, r_t2)
            VALUES
                (:etf_code, :stock_code, :event_date, :delta_shares, :prev_shares, :cur_shares,
                 :delta_pct, :is_new_position, :r_t0, :r_t1, :r_t2)
            ON CONFLICT (etf_code, stock_code, event_date) DO UPDATE SET
                delta_shares    = EXCLUDED.delta_shares,
                prev_shares     = EXCLUDED.prev_shares,
                cur_shares      = EXCLUDED.cur_shares,
                delta_pct       = EXCLUDED.delta_pct,
                is_new_position = EXCLUDED.is_new_position,
                r_t0            = EXCLUDED.r_t0,
                r_t1            = EXCLUDED.r_t1,
                r_t2            = EXCLUDED.r_t2
        """)
        records = [
            {k: v for k, v in ev.items() if k != "stock_name"}
            for ev in events
        ]
        with ctx.sql_storage.engine.connect() as conn:
            conn.execute(sql, records)
            conn.commit()
