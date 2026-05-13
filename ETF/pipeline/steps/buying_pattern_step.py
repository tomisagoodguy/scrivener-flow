"""
Buying Pattern Step

每日分類 BUY/IN 事件為 7 種買進模式，並補齊前 30 天事件的前瞻報酬。
屬於輔助步驟，失敗時只 log，不中斷 pipeline。

7 種模式：
  volume_spike   — abs(diff_shares) 超過同股同 ETF 過去 20 交易日的 mean + 5.5×std
  chase_high     — 事件日 close >= high*0.99 且漲幅 >= 3%
  single_lot     — abs(diff_shares) 介於 800~1200
  window_break   — 事件日前 60 日內無 BUY/IN 記錄
  sustained_buy  — 過去 20 個交易日均有 BUY/IN（全 20 日）
  new_position   — change_type = 'IN'
  dip_buy        — 事件日 close <= low*1.01 且跌幅 <= -2%
"""

import json
import logging
from datetime import date, timedelta
from typing import Any, TYPE_CHECKING

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

HORIZONS = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30]
FILL_WINDOW_DAYS = 30
FILL_BATCH_SIZE = 500

VOLUME_SPIKE_WINDOW = 20
VOLUME_SPIKE_MULTIPLIER = 5.5
SINGLE_LOT_MIN = 800
SINGLE_LOT_MAX = 1200
WINDOW_BREAK_DAYS = 60
SUSTAINED_BUY_THRESHOLD = 20
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

        if SINGLE_LOT_MIN <= diff_shares <= SINGLE_LOT_MAX:
            patterns.append("single_lot")

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
        """補齊最近 30 天事件的前瞻報酬（增量更新，批次 ≤ 500）"""
        today = date.fromisoformat(ctx.date_str) if ctx.date_str else date.today()
        cutoff = (today - timedelta(days=FILL_WINDOW_DAYS)).isoformat()

        with services.sql_storage.engine.connect() as conn:
            events = self._fetch_incomplete_events(conn, cutoff)
            if not events:
                return

            events = events[:FILL_BATCH_SIZE]
            stock_codes = {e["stock_code"] for e in events}
            price_lookup = self._fetch_price_lookup(conn, stock_codes, cutoff, today.isoformat())

        updated = 0
        for event in events:
            new_data = self._compute_missing_returns(event, price_lookup, today)
            if new_data:
                self._merge_returns(services, event["id"], new_data)
                updated += 1

        self.logger.info("Filled forward returns for %d events", updated)

    @staticmethod
    def _fetch_incomplete_events(conn, cutoff: str) -> list[dict]:
        """取 future_returns 還沒齊所有天期的事件"""
        rows = conn.execute(text("""
            SELECT id, stock_code, event_date,
                   COALESCE(future_returns, '{}'::jsonb) AS future_returns
            FROM etf_buying_patterns
            WHERE event_date >= CAST(:cutoff AS date)
            ORDER BY event_date DESC
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

    def _compute_missing_returns(
        self,
        event: dict,
        price_lookup: dict[tuple[str, str], float],
        today: date,
    ) -> dict[str, float]:
        existing = event["future_returns"] if isinstance(event["future_returns"], dict) else {}
        if isinstance(existing, str):
            existing = json.loads(existing)

        event_date = event["event_date"]
        if isinstance(event_date, str):
            event_date = date.fromisoformat(event_date)

        close_t = price_lookup.get((event["stock_code"], event_date.isoformat()))
        if not close_t or close_t == 0:
            return {}

        new_data: dict[str, float] = {}
        for d in HORIZONS:
            key = str(d)
            if key in existing:
                continue
            target_day = event_date + timedelta(days=d)
            if target_day > today:
                continue
            close_td = price_lookup.get((event["stock_code"], target_day.isoformat()))
            if close_td is None:
                continue
            new_data[key] = round((close_td - close_t) / close_t, 6)

        return new_data

    @staticmethod
    def _merge_returns(services: "PipelineServices", event_id: int, new_data: dict[str, float]) -> None:
        """jsonb merge（|| 運算子）：只補新天期，不覆蓋舊值"""
        sql = text("""
            UPDATE etf_buying_patterns
            SET future_returns = COALESCE(future_returns, '{}'::jsonb) || CAST(:new_data AS jsonb)
            WHERE id = :id
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, {"id": event_id, "new_data": json.dumps(new_data)})
            conn.commit()
