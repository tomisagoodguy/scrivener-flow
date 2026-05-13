"""
Backfill etf_buying_patterns from etf_diff_logs history.

執行：
  uv run python ETF/scripts/backfill_buying_patterns.py
"""

import os
import sys
import statistics
import logging
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(".env.local")

from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

VOLUME_SPIKE_WINDOW = 20
VOLUME_SPIKE_MULTIPLIER = 5.5
WINDOW_BREAK_DAYS = 60
SUSTAINED_BUY_THRESHOLD = 12
CHASE_HIGH_RATIO = 0.99
CHASE_HIGH_GAIN = 0.03
DIP_BUY_RATIO = 1.01
DIP_BUY_DROP = -0.02

INSERT_SQL = text("""
    INSERT INTO etf_buying_patterns
        (pattern_type, stock_code, etf_code, event_date)
    VALUES
        (:pattern_type, :stock_code, :etf_code, CAST(:event_date AS date))
    ON CONFLICT (pattern_type, stock_code, etf_code, event_date) DO NOTHING
""")


def classify_date(conn, target_date: str) -> list[dict]:
    buy_events = [
        dict(r._mapping) for r in conn.execute(text("""
            SELECT stock_code, etf_code, change_type, diff_shares
            FROM etf_diff_logs
            WHERE data_date = :d AND change_type IN ('BUY', 'IN')
        """), {"d": target_date})
    ]
    if not buy_events:
        return []

    stock_codes = list({e["stock_code"] for e in buy_events})
    etf_codes = list({e["etf_code"] for e in buy_events})

    hist_rows = [
        dict(r._mapping) for r in conn.execute(text("""
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
    ]

    history_map: dict = {}
    for r in hist_rows:
        key = (r["stock_code"], r["etf_code"])
        history_map.setdefault(key, []).append(r)

    price_rows = [
        dict(r._mapping) for r in conn.execute(text("""
            WITH ranked AS (
                SELECT stock_code, data_date, close, high, low,
                       LAG(close) OVER (PARTITION BY stock_code ORDER BY data_date) AS prev_close
                FROM stock_prices_daily
                WHERE stock_code = ANY(CAST(:codes AS text[]))
                  AND data_date <= CAST(:d AS date)
            )
            SELECT stock_code, data_date, close, high, low, prev_close
            FROM ranked
            WHERE data_date = CAST(:d AS date)
        """), {
            "codes": "{" + ",".join(stock_codes) + "}",
            "d": target_date,
        })
    ]
    price_map = {r["stock_code"]: r for r in price_rows}

    rows = []
    for event in buy_events:
        stock = event["stock_code"]
        etf = event["etf_code"]
        diff_shares = abs(float(event.get("diff_shares") or 0))
        history = history_map.get((stock, etf), [])
        price_row = price_map.get(stock)
        patterns = []

        if event["change_type"] == "IN":
            patterns.append("new_position")

        past_vals = [abs(float(h.get("diff_shares") or 0)) for h in history[:VOLUME_SPIKE_WINDOW]]
        if len(past_vals) >= 2:
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

        for p in patterns:
            rows.append({
                "pattern_type": p,
                "stock_code": stock,
                "etf_code": etf,
                "event_date": target_date,
            })
    return rows


def main():
    with engine.connect() as conn:
        dates = [
            str(r[0]) for r in conn.execute(text("""
                SELECT DISTINCT data_date
                FROM etf_diff_logs
                WHERE change_type IN ('BUY', 'IN')
                ORDER BY data_date
            """))
        ]
    logger.info(f"Found {len(dates)} trading dates to process")

    total_inserted = 0
    for d in dates:
        with engine.connect() as conn:
            rows = classify_date(conn, d)
        if not rows:
            logger.info(f"  {d}: no patterns")
            continue
        with engine.connect() as conn:
            conn.execute(INSERT_SQL, rows)
            conn.commit()
        total_inserted += len(rows)
        logger.info(f"  {d}: {len(rows)} patterns inserted")

    with engine.connect() as conn:
        total = conn.execute(text("SELECT COUNT(*) FROM etf_buying_patterns")).scalar()
    logger.info(f"Done. Total rows in etf_buying_patterns: {total} (inserted {total_inserted} this run)")


if __name__ == "__main__":
    main()
