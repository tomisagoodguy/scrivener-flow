"""Standalone backfill script for etf_buying_patterns.future_returns.

以 id 鍵集分頁走完全表，對每筆事件補齊所有到期且缺值的天期（10 個日曆天天期），
計算口徑與 BuyingPatternStep 共用 ETF.analysis.buying_pattern_stats。

Idempotent: re-running produces the same result.

Usage:
    uv run python ETF/pipeline/steps/backfill_future_returns.py
"""

import json
import logging
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from psycopg2.extras import execute_values
from sqlalchemy import text

# 以 `python ETF/pipeline/steps/backfill_future_returns.py` 直接執行時 repo 根目錄不在 sys.path；
# 被 pipeline 匯入時不動全域狀態
if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from ETF.analysis.buying_pattern_stats import (  # noqa: E402
    NEXT_TRADING_SCAN_DAYS,
    due_missing_horizons,
    plan_return_updates,
)

logger = logging.getLogger(__name__)

PAGE_SIZE = 1000
MERGE_PAGE_SIZE = 1000

_MERGE_SQL = """
    UPDATE etf_buying_patterns AS t
    SET future_returns = COALESCE(t.future_returns, '{}'::jsonb) || v.new_data::jsonb
    FROM (VALUES %s) AS v(id, new_data)
    WHERE t.id = v.id
"""


def bulk_merge_future_returns(engine, updates: list[tuple[int, dict[str, float]]]) -> None:
    """以 execute_values 每 MERGE_PAGE_SIZE 筆一次來回，jsonb `||` 增量合併。

    `||` 會以 new_data 覆蓋同名 key，呼叫端只傳缺值天期（compute_missing_returns 保證）。
    """
    if not updates:
        return
    rows = [(event_id, json.dumps(new_data)) for event_id, new_data in updates]
    raw = engine.raw_connection()
    try:
        with raw.cursor() as cur:
            execute_values(cur, _MERGE_SQL, rows, page_size=MERGE_PAGE_SIZE)
        raw.commit()
    except Exception:
        raw.rollback()
        raise
    finally:
        raw.close()


def _fetch_page(conn, last_id: int, page_size: int) -> list[dict[str, Any]]:
    rows = conn.execute(text("""
        SELECT id, stock_code, event_date,
               COALESCE(future_returns, '{}'::jsonb) AS future_returns
        FROM etf_buying_patterns
        WHERE id > :last_id
        ORDER BY id
        LIMIT :page_size
    """), {"last_id": last_id, "page_size": page_size})
    return [dict(r._mapping) for r in rows]


def _fetch_price_lookup(
    engine, events: list[dict[str, Any]], today: date
) -> dict[tuple[str, str], float]:
    """該頁事件股票從最早事件日到最晚到期日（含往後找交易日）的收盤價。"""
    dates = [
        e["event_date"] if isinstance(e["event_date"], date) else date.fromisoformat(e["event_date"])
        for e in events
    ]
    end = min(today, max(dates) + timedelta(days=30 + NEXT_TRADING_SCAN_DAYS))
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT stock_code, data_date, close
            FROM stock_prices_daily
            WHERE stock_code = ANY(CAST(:codes AS text[]))
              AND data_date >= CAST(:start AS date)
              AND data_date <= CAST(:end AS date)
        """), {
            "codes": "{" + ",".join({e["stock_code"] for e in events}) + "}",
            "start": min(dates).isoformat(),
            "end": end.isoformat(),
        })
        return {(r.stock_code, str(r.data_date)): float(r.close) for r in rows if r.close is not None}


def run_backfill(engine, today: date | None = None, page_size: int = PAGE_SIZE) -> int:
    """全歷史分頁回補，回傳更新筆數。"""
    today = today or date.today()
    last_id = 0
    updated = 0
    while True:
        with engine.connect() as conn:
            page = _fetch_page(conn, last_id, page_size)
        if not page:
            break
        last_id = page[-1]["id"]
        due = [e for e in page if due_missing_horizons(e["future_returns"], e["event_date"], today)]
        if not due:
            continue
        updates = plan_return_updates(due, _fetch_price_lookup(engine, due, today), today)
        bulk_merge_future_returns(engine, updates)
        updated += len(updates)
        logger.info("Page up to id=%d: %d / %d due events updated", last_id, len(updates), len(due))
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

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(db_url)
    logger.info("Starting full-history future_returns backfill...")
    updated = run_backfill(engine)

    if updated == 0:
        print("No records need backfill")
    else:
        print(f"Updated future_returns for {updated} records")

    return 0


if __name__ == "__main__":
    sys.exit(main())
