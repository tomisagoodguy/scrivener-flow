"""Standalone backfill script for etf_buying_patterns.future_returns.

Scans all records where any standard horizon key is null or missing,
queries stock_prices_daily, and applies incremental merges.

Idempotent: re-running produces the same result.

Usage:
    uv run python ETF/pipeline/steps/backfill_future_returns.py
"""

import json
import logging
import sys
from datetime import date, timedelta
from typing import Any

from sqlalchemy import text

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

STANDARD_HORIZONS = [1, 5, 10, 20]
BATCH_SIZE = 500


def filter_incomplete_events(
    events: list[dict[str, Any]], horizons: list[int]
) -> list[dict[str, Any]]:
    """Return only events where at least one horizon key is missing or null."""
    str_horizons = {str(h) for h in horizons}
    result = []
    for event in events:
        fr = event.get("future_returns") or {}
        if isinstance(fr, str):
            fr = json.loads(fr)
        if any(fr.get(h) is None for h in str_horizons):
            result.append(event)
    return result


def compute_missing_returns(
    event: dict[str, Any],
    price_lookup: dict[tuple[str, str], float],
    today: date,
) -> dict[str, float]:
    """Compute return values for horizons that are missing in event['future_returns'].

    Only adds keys that are absent or null. Never overwrites existing non-null values.
    Returns empty dict if base price (event_date close) is unavailable.
    """
    existing = event.get("future_returns") or {}
    if isinstance(existing, str):
        existing = json.loads(existing)

    event_date = event["event_date"]
    if isinstance(event_date, str):
        event_date = date.fromisoformat(event_date)

    close_t = price_lookup.get((event["stock_code"], event_date.isoformat()))
    if not close_t or close_t == 0:
        return {}

    new_data: dict[str, float] = {}
    for h in STANDARD_HORIZONS:
        key = str(h)
        if existing.get(key) is not None:
            continue
        target_day = event_date + timedelta(days=h)
        if target_day > today:
            continue
        close_td = price_lookup.get((event["stock_code"], target_day.isoformat()))
        if close_td is None:
            continue
        new_data[key] = round((close_td - close_t) / close_t, 6)

    return new_data


def run_backfill(engine, cutoff: str | None = None) -> int:
    """Run full or partial backfill. Returns count of updated records."""
    today = date.today()
    where_clause = "WHERE 1=1" if cutoff is None else "WHERE event_date >= CAST(:cutoff AS date)"
    params: dict[str, Any] = {}
    if cutoff:
        params["cutoff"] = cutoff

    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT id, stock_code, event_date,
                   COALESCE(future_returns, '{{}}'::jsonb) AS future_returns
            FROM etf_buying_patterns
            {where_clause}
            ORDER BY event_date DESC
            LIMIT {BATCH_SIZE}
        """), params)
        events = [dict(r._mapping) for r in rows]

    events = filter_incomplete_events(events, STANDARD_HORIZONS)
    if not events:
        return 0

    stock_codes = {e["stock_code"] for e in events}
    min_date = min(
        (e["event_date"] if isinstance(e["event_date"], date) else date.fromisoformat(e["event_date"]))
        for e in events
    )
    codes_arr = "{" + ",".join(stock_codes) + "}"

    with engine.connect() as conn:
        price_rows = conn.execute(text("""
            SELECT stock_code, data_date, close
            FROM stock_prices_daily
            WHERE stock_code = ANY(CAST(:codes AS text[]))
              AND data_date >= CAST(:min_date AS date)
              AND data_date <= CAST(:today AS date)
        """), {"codes": codes_arr, "min_date": min_date.isoformat(), "today": today.isoformat()})
        price_lookup = {
            (r.stock_code, str(r.data_date)): float(r.close)
            for r in price_rows
            if r.close is not None
        }

    updated = 0
    with engine.connect() as conn:
        for event in events:
            new_data = compute_missing_returns(event, price_lookup, today)
            if not new_data:
                continue
            conn.execute(text("""
                UPDATE etf_buying_patterns
                SET future_returns = COALESCE(future_returns, '{}'::jsonb) || CAST(:new_data AS jsonb)
                WHERE id = :id
            """), {"id": event["id"], "new_data": json.dumps(new_data)})
            updated += 1
        conn.commit()

    return updated


def main() -> int:
    import os
    from dotenv import load_dotenv
    from sqlalchemy import create_engine

    if os.path.exists('.env.local'):
        load_dotenv('.env.local')
    else:
        load_dotenv()

    db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not db_url:
        print("ERROR: DATABASE_URL or SUPABASE_DB_URL not set", file=sys.stderr)
        return 1

    engine = create_engine(db_url)
    logger.info("Starting full-history future_returns backfill...")
    updated = run_backfill(engine, cutoff=None)

    if updated == 0:
        print("No records need backfill")
    else:
        print(f"Updated future_returns for {updated} records")

    return 0


if __name__ == "__main__":
    sys.exit(main())
