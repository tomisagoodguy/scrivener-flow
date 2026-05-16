"""
Matched Pairs Step

找出同時被主動與被動 ETF 加碼的股票，比較兩者異常成交量差異：
  - 主動 ETF add events 從 etf_frontrunning_stats 讀取
  - 被動 ETF add events 用 FinLab 指數成分（0050/0056）計算相同門檻的加碼事件
  - 過濾出主動 ≥2 events 且被動 ≥2 events 的重疊股票
  - 計算 active_median_r / passive_median_r / diff_median
  - 寫入 etf_matched_pairs 與 etf_matched_pairs_summary

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
"""

import logging
from collections import defaultdict
from datetime import date
from statistics import median
from typing import Optional

import pandas as pd
from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.pipeline.steps.base import BaseStep

logger = logging.getLogger(__name__)

PASSIVE_INDICES = ["0050", "0056"]   # 被動基準指數
MIN_EVENTS = 2                        # 最少事件數（主動 + 被動各自）
MIN_DELTA_SHARES = 100_000
MIN_DELTA_PCT = 5.0
BASELINE_WINDOW = 20
MIN_NONZERO_DAYS = 10


class MatchedPairsStep(BaseStep):
    """主動/被動 ETF 加碼配對 abnormal vol 比較（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Matched Pairs"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            self.logger.error(f"MatchedPairsStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------ private

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        computed_date = ctx.date_str or date.today().strftime("%Y-%m-%d")

        active_events = self._fetch_active_events(ctx, services)
        if not active_events:
            self.logger.info("No active ETF frontrunning events; skipping matched pairs")
            return

        passive_events = self._compute_passive_events(ctx)
        if not passive_events:
            self.logger.info("No passive ETF add events computed; skipping matched pairs")
            return

        detail_rows, summary = self._build_pairs(active_events, passive_events, computed_date)
        if not detail_rows:
            self.logger.info("No overlap stocks with sufficient events")
            return

        self._upsert_detail(services, detail_rows)
        self._upsert_summary(services, summary)
        self.logger.info(
            "Upserted %d matched-pair rows + summary for %s", len(detail_rows), computed_date
        )

    def _fetch_active_events(self, ctx: PipelineContext, services: "PipelineServices") -> dict[str, list[dict]]:
        """從 etf_frontrunning_stats 讀取主動 ETF 事件（含 r_t0）"""
        sql = text("""
            SELECT stock_code, event_date, r_t0
            FROM etf_frontrunning_stats
            WHERE r_t0 IS NOT NULL
            ORDER BY stock_code, event_date
        """)
        with services.sql_storage.engine.connect() as conn:
            rows = conn.execute(sql).fetchall()

        result: dict[str, list[dict]] = defaultdict(list)
        for r in rows:
            result[r.stock_code].append({"event_date": r.event_date, "r_t0": float(r.r_t0)})
        return result

    def _compute_passive_events(self, ctx: PipelineContext) -> dict[str, list[dict]]:
        """用 FinLab 指數成分計算被動 ETF 加碼事件（與主動 ETF 相同門檻）"""
        try:
            import finlab.data as fd
            components: pd.DataFrame = fd.get("index_components:成分股")
            vol_df: pd.DataFrame = fd.get("price:成交股數")
        except Exception as e:
            self.logger.error(f"FinLab passive index fetch failed: {e}")
            return {}

        result: dict[str, list[dict]] = defaultdict(list)

        for index_code in PASSIVE_INDICES:
            if index_code not in components.columns:
                continue

            series = components[index_code].dropna()
            dates = sorted(series.index)

            for i in range(1, len(dates)):
                prev_date, cur_date = dates[i - 1], dates[i]
                prev_set = set(series[prev_date]) if isinstance(series[prev_date], (list, set)) else set()
                cur_set = set(series[cur_date]) if isinstance(series[cur_date], (list, set)) else set()

                # 新進成分股 = add event (is_new_position)
                new_stocks = cur_set - prev_set
                for stock_code in new_stocks:
                    r_t0 = self._compute_ratio_from_df(vol_df, stock_code, pd.Timestamp(cur_date), 0)
                    if r_t0 is None:
                        continue
                    result[stock_code].append({"event_date": cur_date, "r_t0": r_t0})

        return result

    @staticmethod
    def _compute_ratio_from_df(
        vol_df: pd.DataFrame, stock_code: str, event_date: pd.Timestamp, offset: int
    ) -> Optional[float]:
        if stock_code not in vol_df.columns:
            return None
        series = vol_df[stock_code].dropna()
        after = [d for d in series.index if d >= event_date]
        if len(after) <= offset:
            return None
        target_date = after[offset]
        before = [d for d in series.index if d < event_date]
        baseline_window = before[-BASELINE_WINDOW:]
        baseline_vals = [float(series[d]) for d in baseline_window if float(series[d]) > 0]
        if len(baseline_vals) < MIN_NONZERO_DAYS:
            return None
        bm = median(baseline_vals)
        if bm == 0:
            return None
        return round(float(series.get(target_date, 0)) / bm, 4)

    def _build_pairs(
        self,
        active_events: dict[str, list[dict]],
        passive_events: dict[str, list[dict]],
        computed_date: str,
    ) -> tuple[list[dict], dict]:
        overlap_stocks = set(active_events) & set(passive_events)
        detail_rows = []
        for stock_code in overlap_stocks:
            a_evts = active_events[stock_code]
            p_evts = passive_events[stock_code]
            if len(a_evts) < MIN_EVENTS or len(p_evts) < MIN_EVENTS:
                continue

            active_median_r = round(median([e["r_t0"] for e in a_evts]), 4)
            passive_median_r = round(median([e["r_t0"] for e in p_evts]), 4)
            diff_median = round(active_median_r - passive_median_r, 4)

            detail_rows.append({
                "computed_date": computed_date,
                "stock_code": stock_code,
                "stock_name": None,   # 可由前端 JOIN stock_basic_info 補填
                "n_active_events": len(a_evts),
                "n_passive_events": len(p_evts),
                "active_median_r": active_median_r,
                "passive_median_r": passive_median_r,
                "diff_median": diff_median,
            })

        if not detail_rows:
            return [], {}

        diffs = [r["diff_median"] for r in detail_rows]
        summary = {
            "computed_date": computed_date,
            "n_pairs": len(detail_rows),
            "n_active_higher": sum(1 for d in diffs if d > 0),
            "n_passive_higher": sum(1 for d in diffs if d < 0),
            "median_of_diffs": round(median(diffs), 4),
        }
        return detail_rows, summary

    @staticmethod
    def _upsert_detail(services: "PipelineServices", records: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_matched_pairs
                (computed_date, stock_code, stock_name, n_active_events, n_passive_events,
                 active_median_r, passive_median_r, diff_median)
            VALUES
                (:computed_date, :stock_code, :stock_name, :n_active_events, :n_passive_events,
                 :active_median_r, :passive_median_r, :diff_median)
            ON CONFLICT (computed_date, stock_code) DO UPDATE SET
                stock_name       = EXCLUDED.stock_name,
                n_active_events  = EXCLUDED.n_active_events,
                n_passive_events = EXCLUDED.n_passive_events,
                active_median_r  = EXCLUDED.active_median_r,
                passive_median_r = EXCLUDED.passive_median_r,
                diff_median      = EXCLUDED.diff_median
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, records)
            conn.commit()

    @staticmethod
    def _upsert_summary(services: "PipelineServices", summary: dict) -> None:
        sql = text("""
            INSERT INTO etf_matched_pairs_summary
                (computed_date, n_pairs, n_active_higher, n_passive_higher, median_of_diffs)
            VALUES
                (:computed_date, :n_pairs, :n_active_higher, :n_passive_higher, :median_of_diffs)
            ON CONFLICT (computed_date) DO UPDATE SET
                n_pairs          = EXCLUDED.n_pairs,
                n_active_higher  = EXCLUDED.n_active_higher,
                n_passive_higher = EXCLUDED.n_passive_higher,
                median_of_diffs  = EXCLUDED.median_of_diffs
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, [summary])
            conn.commit()
