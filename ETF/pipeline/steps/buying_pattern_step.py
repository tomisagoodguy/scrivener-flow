"""
Buying Pattern Step

每日分類 BUY/IN 事件為 6 種買進模式，並補齊前 35 天事件的前瞻報酬。
屬於輔助步驟，失敗時只 log，不中斷 pipeline。

6 種模式：
  volume_spike   — abs(diff_shares) 超過同股同 ETF 過去 20 交易日的 mean + 5.5×std
  chase_high     — 事件日 close >= high*0.99 且漲幅 >= 3%
  window_break   — 事件日前 60 日內無 BUY/IN 記錄
  sustained_buy  — 過去 20 個 BUY/IN 事件中至少 12 個不同交易日（持續買進）
  new_position   — change_type = 'IN'
  dip_buy        — 事件日 close <= low*1.01 且跌幅 <= -2%

已移除：
  single_lot     — 回測顯示無超額報酬（勝率 27.7%，低於 baseline）
"""

import logging
import time
from datetime import date, timedelta
from typing import Any, TYPE_CHECKING

from psycopg2.extras import execute_values
from sqlalchemy import text

from ETF.analysis.buying_pattern_stats import (
    NEXT_TRADING_SCAN_DAYS,
    build_stats_rows,
    due_missing_horizons,
    plan_return_updates,
)
from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.backfill_future_returns import bulk_merge_future_returns
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

FILL_WINDOW_DAYS = 35  # 最長天期 30 + 往後找 2 天 + 容忍 pipeline 漏跑 3 天

VOLUME_SPIKE_WINDOW = 20
VOLUME_SPIKE_MULTIPLIER = 5.5
WINDOW_BREAK_DAYS = 60
SUSTAINED_BUY_THRESHOLD = 12  # 過去 20 個 BUY/IN 事件中至少有 12 個不同交易日
CHASE_HIGH_RATIO = 0.99
CHASE_HIGH_GAIN = 0.03
DIP_BUY_RATIO = 1.01
DIP_BUY_DROP = -0.02


class BuyingPatternStep(BaseStep):
    """每日分類買進模式並補齊前瞻報酬（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Buying Pattern"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            rows = self._classify_events(ctx, services)
            if rows:
                self._upsert_events(services, rows)
                self.logger.info("Inserted %d pattern rows for %s", len(rows), ctx.date_str)
            else:
                self.logger.info("No buying events to classify for %s", ctx.date_str)
            self._fill_forward_returns(ctx, services)
        except Exception as e:
            self.logger.error("BuyingPatternStep failed: %s", e, exc_info=True)
        self._refresh_stats(services)
        return ctx

    # ------------------------------------------------------------------ classify

    def _classify_events(self, ctx: PipelineContext, services: "PipelineServices") -> list[dict[str, Any]]:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")

        with services.sql_storage.engine.connect() as conn:
            buy_events = self._fetch_buy_events(conn, target_date)
            if not buy_events:
                return []

            stock_etf_pairs = {(e["stock_code"], e["etf_code"]) for e in buy_events}
            stock_codes = {e["stock_code"] for e in buy_events}

            history_map = self._fetch_diff_history(conn, target_date, stock_etf_pairs)
            price_map = self._fetch_prices(conn, target_date, stock_codes)

        rows: list[dict[str, Any]] = []
        for event in buy_events:
            patterns = self._patterns_for_event(event, target_date, history_map, price_map)
            for pattern_type in patterns:
                rows.append({
                    "pattern_type": pattern_type,
                    "stock_code": event["stock_code"],
                    "etf_code": event["etf_code"],
                    "event_date": target_date,
                })
        return rows

    @staticmethod
    def _fetch_buy_events(conn, target_date: str) -> list[dict]:
        rows = conn.execute(text("""
            SELECT stock_code, etf_code, change_type, diff_shares
            FROM etf_diff_logs
            WHERE data_date = :d
              AND change_type IN ('BUY', 'IN')
        """), {"d": target_date})
        return [dict(r._mapping) for r in rows]

    @staticmethod
    def _fetch_diff_history(
        conn, target_date: str, pairs: set[tuple[str, str]]
    ) -> dict[tuple[str, str], list[dict]]:
        """取每個 (stock_code, etf_code) 對在 target_date 前 60 日的 BUY/IN 記錄"""
        if not pairs:
            return {}
        stock_codes = list({p[0] for p in pairs})
        etf_codes = list({p[1] for p in pairs})
        rows = conn.execute(text("""
            SELECT stock_code, etf_code, data_date, diff_shares
            FROM etf_diff_logs
            WHERE data_date >= CAST(:start AS date)
              AND data_date < CAST(:end AS date)
              AND change_type IN ('BUY', 'IN')
              AND stock_code = ANY(CAST(:stocks AS text[]))
              AND etf_code = ANY(CAST(:etfs AS text[]))
            ORDER BY data_date DESC
        """), {
            "start": (date.fromisoformat(target_date) - timedelta(days=WINDOW_BREAK_DAYS)).isoformat(),
            "end": target_date,
            "stocks": "{" + ",".join(stock_codes) + "}",
            "etfs": "{" + ",".join(etf_codes) + "}",
        })
        result: dict[tuple[str, str], list[dict]] = {}
        for r in rows:
            key = (r.stock_code, r.etf_code)
            result.setdefault(key, []).append(dict(r._mapping))
        return result

    @staticmethod
    def _fetch_prices(conn, target_date: str, stock_codes: set[str]) -> dict[str, dict]:
        """取事件日的 close/high/low 及前一日 close"""
        if not stock_codes:
            return {}
        codes_arr = "{" + ",".join(stock_codes) + "}"
        rows = conn.execute(text("""
            WITH ranked AS (
                SELECT stock_code, data_date, close, high, low,
                       LAG(close) OVER (PARTITION BY stock_code ORDER BY data_date) AS prev_close
                FROM stock_prices_daily
                WHERE stock_code = ANY(CAST(:codes AS text[]))
                  AND data_date <= CAST(:d AS date)
                ORDER BY data_date DESC
            )
            SELECT stock_code, data_date, close, high, low, prev_close
            FROM ranked
            WHERE data_date = CAST(:d AS date)
        """), {"codes": codes_arr, "d": target_date})
        return {r.stock_code: dict(r._mapping) for r in rows}

    def _patterns_for_event(
        self,
        event: dict,
        target_date: str,
        history_map: dict,
        price_map: dict,
    ) -> list[str]:
        stock = event["stock_code"]
        etf = event["etf_code"]
        diff_shares = abs(float(event.get("diff_shares") or 0))
        change_type = event["change_type"]
        history = history_map.get((stock, etf), [])
        price_row = price_map.get(stock)

        patterns: list[str] = []

        if change_type == "IN":
            patterns.append("new_position")

        past_vals = [abs(float(h.get("diff_shares") or 0)) for h in history[:VOLUME_SPIKE_WINDOW]]
        if len(past_vals) >= 2:
            import statistics
            mean = statistics.mean(past_vals)
            std = statistics.stdev(past_vals)
            if diff_shares > mean + VOLUME_SPIKE_MULTIPLIER * std:
                patterns.append("volume_spike")

        if not history:
            patterns.append("window_break")

        recent_dates = {h["data_date"] for h in history[:VOLUME_SPIKE_WINDOW]}
        if len(recent_dates) >= SUSTAINED_BUY_THRESHOLD:
            patterns.append("sustained_buy")

        if price_row and price_row.get("prev_close"):
            close = float(price_row["close"] or 0)
            high = float(price_row["high"] or 0)
            low = float(price_row["low"] or 0)
            prev_close = float(price_row["prev_close"] or 0)
            if prev_close > 0:
                change_pct = (close - prev_close) / prev_close
                if high > 0 and close >= high * CHASE_HIGH_RATIO and change_pct >= CHASE_HIGH_GAIN:
                    patterns.append("chase_high")
                if low > 0 and close <= low * DIP_BUY_RATIO and change_pct <= DIP_BUY_DROP:
                    patterns.append("dip_buy")

        return patterns

    # ------------------------------------------------------------------ upsert

    @staticmethod
    def _upsert_events(services: "PipelineServices", rows: list[dict[str, Any]]) -> None:
        """INSERT ON CONFLICT DO NOTHING — 冪等"""
        sql = text("""
            INSERT INTO etf_buying_patterns
                (pattern_type, stock_code, etf_code, event_date)
            VALUES
                (:pattern_type, :stock_code, :etf_code, CAST(:event_date AS date))
            ON CONFLICT (pattern_type, stock_code, etf_code, event_date) DO NOTHING
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, rows)
            conn.commit()

    # ------------------------------------------------------------------ forward returns

    def _fill_forward_returns(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        """補齊窗口內所有到期且缺值的天期（先篩後補、不截斷，批次寫入）"""
        today = date.fromisoformat(ctx.date_str) if ctx.date_str else date.today()
        cutoff = (today - timedelta(days=FILL_WINDOW_DAYS)).isoformat()

        with services.sql_storage.engine.connect() as conn:
            events = self._fetch_window_events(conn, cutoff)
            events = [
                e for e in events
                if due_missing_horizons(e["future_returns"], e["event_date"], today)
            ]
            if not events:
                return
            stock_codes = {e["stock_code"] for e in events}
            price_lookup = self._fetch_price_lookup(conn, stock_codes, cutoff, today.isoformat())

        updates = plan_return_updates(events, price_lookup, today)
        if updates:
            bulk_merge_future_returns(services.sql_storage.engine, updates)
        self.logger.info(
            "Filled forward returns for %d / %d due events", len(updates), len(events)
        )

    @staticmethod
    def _fetch_window_events(conn, cutoff: str) -> list[dict]:
        """取窗口內全部事件（是否需補由 due_missing_horizons 判斷）"""
        rows = conn.execute(text("""
            SELECT id, stock_code, event_date,
                   COALESCE(future_returns, '{}'::jsonb) AS future_returns
            FROM etf_buying_patterns
            WHERE event_date >= CAST(:cutoff AS date)
        """), {"cutoff": cutoff})
        return [dict(r._mapping) for r in rows]

    @staticmethod
    def _fetch_price_lookup(
        conn, stock_codes: set[str], cutoff: str, today: str
    ) -> dict[tuple[str, str], float]:
        """回傳 {(stock_code, date_str): close} 的查表字典"""
        if not stock_codes:
            return {}
        codes_arr = "{" + ",".join(stock_codes) + "}"
        rows = conn.execute(text("""
            SELECT stock_code, data_date, close
            FROM stock_prices_daily
            WHERE stock_code = ANY(CAST(:codes AS text[]))
              AND data_date >= CAST(:cutoff AS date)
              AND data_date <= CAST(:today AS date)
        """), {"codes": codes_arr, "cutoff": cutoff, "today": today})
        return {(r.stock_code, str(r.data_date)): float(r.close) for r in rows if r.close is not None}

    # ------------------------------------------------------------------ baseline stats

    _STATS_COLUMNS = (
        "pattern_type", "horizon", "n", "n_weeks", "win_rate", "avg_return",
        "baseline_n", "baseline_win_rate", "baseline_avg_return",
        "excess_win_lo", "excess_win_hi", "excess_ret_lo", "excess_ret_hi",
        "period_start", "period_end",
    )

    def _refresh_stats(self, services: "PipelineServices") -> None:
        """重算模式 vs 平常日基準統計並整表替換；失敗只 log，保留前次結果。"""
        started = time.monotonic()
        try:
            events, price_lookup = self._fetch_stats_inputs(services.sql_storage.engine)
            rows = build_stats_rows(events, price_lookup)
            if not rows:
                self.logger.info("No buying pattern stats to write")
                return
            self._replace_stats(services.sql_storage.engine, rows)
            self.logger.info(
                "Buying pattern stats: %d rows, baseline_n(h=20)=%s, %.1fs",
                len(rows),
                next((r["baseline_n"] for r in rows if r["horizon"] == 20), None),
                time.monotonic() - started,
            )
        except Exception as e:
            self.logger.error("Buying pattern stats refresh failed: %s", e, exc_info=True)

    @staticmethod
    def _fetch_stats_inputs(engine) -> tuple[list[dict], dict[tuple[str, str], float]]:
        """全部事件 + 事件股票在 [最早事件日, 最晚事件日 + 32 天] 的非 NULL 收盤價"""
        with engine.connect() as conn:
            events = [dict(r._mapping) for r in conn.execute(text("""
                SELECT pattern_type, stock_code, event_date,
                       COALESCE(future_returns, '{}'::jsonb) AS future_returns
                FROM etf_buying_patterns
            """))]
            if not events:
                return [], {}
            start = min(e["event_date"] for e in events)
            end = max(e["event_date"] for e in events) + timedelta(days=30 + NEXT_TRADING_SCAN_DAYS)
            rows = conn.execute(text("""
                SELECT stock_code, data_date, close
                FROM stock_prices_daily
                WHERE stock_code = ANY(CAST(:codes AS text[]))
                  AND data_date >= CAST(:start AS date)
                  AND data_date <= CAST(:end AS date)
                  AND close IS NOT NULL
            """), {
                "codes": "{" + ",".join({e["stock_code"] for e in events}) + "}",
                "start": start.isoformat(),
                "end": end.isoformat(),
            })
            lookup = {(r.stock_code, str(r.data_date)): float(r.close) for r in rows}
        return events, lookup

    @classmethod
    def _replace_stats(cls, engine, rows: list[dict]) -> None:
        """單一交易內 DELETE 全表後 INSERT；任一步失敗 rollback，舊資料保留"""
        columns = cls._STATS_COLUMNS
        template = "(" + ", ".join(f"%({c})s" for c in columns) + ")"
        raw = engine.raw_connection()
        try:
            with raw.cursor() as cur:
                cur.execute("DELETE FROM etf_buying_pattern_stats")
                execute_values(
                    cur,
                    f"INSERT INTO etf_buying_pattern_stats ({', '.join(columns)}) VALUES %s",
                    rows,
                    template=template,
                )
            raw.commit()
        except Exception:
            raw.rollback()
            raise
        finally:
            raw.close()
