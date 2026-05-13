"""
Backfill future_returns for all etf_buying_patterns events.

比原本 _fill_forward_returns 快：一次撈全部 prices，Python 批次計算，
最後 batch UPDATE。

執行：
  uv run python ETF/scripts/backfill_buying_pattern_returns.py
"""

import json
import os
import sys
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

HORIZONS = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30]
TODAY = date.today()


def main():
    # 1. 取所有事件（強制重算全部 horizons，不跳過 existing）
    import sys
    force = "--force" in sys.argv
    with engine.connect() as conn:
        events = [
            dict(r._mapping) for r in conn.execute(text("""
                SELECT id, stock_code, event_date,
                       COALESCE(future_returns, '{}'::jsonb) AS future_returns
                FROM etf_buying_patterns
                ORDER BY event_date
            """))
        ]
    logger.info(f"Total events: {len(events)}")

    # 2. 撈所有需要的股價（event_date ~ event_date+31 天）
    stock_codes = list({e["stock_code"] for e in events})
    earliest = min(e["event_date"] for e in events)
    latest_needed = (TODAY + timedelta(days=1)).isoformat()

    logger.info(f"Fetching prices for {len(stock_codes)} stocks from {earliest} to {latest_needed}...")
    with engine.connect() as conn:
        price_rows = conn.execute(text("""
            SELECT stock_code, data_date, close
            FROM stock_prices_daily
            WHERE stock_code = ANY(CAST(:codes AS text[]))
              AND data_date >= CAST(:start AS date)
              AND data_date <= CAST(:end AS date)
              AND close IS NOT NULL
        """), {
            "codes": "{" + ",".join(stock_codes) + "}",
            "start": str(earliest),
            "end": latest_needed,
        }).fetchall()

    price_lookup: dict[tuple[str, str], float] = {
        (r.stock_code, str(r.data_date)): float(r.close)
        for r in price_rows
    }
    logger.info(f"Price lookup: {len(price_lookup)} entries")

    # 3. 計算每個 event 的 future_returns
    updates = []  # (id, new_returns_json)
    skipped_no_price = 0
    skipped_complete = 0

    for event in events:
        event_date = event["event_date"]
        if isinstance(event_date, str):
            event_date = date.fromisoformat(event_date)

        existing = event["future_returns"]
        if isinstance(existing, str):
            existing = json.loads(existing)
        if not isinstance(existing, dict):
            existing = {}
        if force:
            existing = {}  # 強制重算所有天期

        close_t = price_lookup.get((event["stock_code"], event_date.isoformat()))
        if not close_t or close_t == 0:
            skipped_no_price += 1
            continue

        new_data: dict[str, float] = {}
        for d in HORIZONS:
            key = str(d)
            if key in existing:
                continue
            target_day = event_date + timedelta(days=d)
            if target_day > TODAY:
                continue
            # 掃最多 +2 天找最近的交易日（處理週末/假日）
            close_td = None
            for offset in range(3):
                close_td = price_lookup.get((event["stock_code"], (target_day + timedelta(days=offset)).isoformat()))
                if close_td is not None:
                    break
            if close_td is None:
                continue
            new_data[key] = round((close_td - close_t) / close_t, 6)

        if not new_data:
            skipped_complete += 1
            continue

        updates.append((event["id"], json.dumps(new_data)))

    logger.info(f"Events to update: {len(updates)}")
    logger.info(f"  skipped (no t0 price): {skipped_no_price}")
    logger.info(f"  skipped (already complete or future): {skipped_complete}")

    if not updates:
        logger.info("Nothing to update.")
        return

    # 4. Batch UPDATE（500 筆一批）
    BATCH = 500
    total_updated = 0
    update_sql = text("""
        UPDATE etf_buying_patterns
        SET future_returns = COALESCE(future_returns, '{}'::jsonb) || CAST(:new_data AS jsonb)
        WHERE id = :id
    """)

    for i in range(0, len(updates), BATCH):
        batch = updates[i:i + BATCH]
        params = [{"id": eid, "new_data": nd} for eid, nd in batch]
        with engine.connect() as conn:
            conn.execute(update_sql, params)
            conn.commit()
        total_updated += len(batch)
        logger.info(f"  Updated {total_updated}/{len(updates)}...")

    # 5. 統計
    with engine.connect() as conn:
        stats = conn.execute(text("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN future_returns != '{}' AND future_returns IS NOT NULL THEN 1 END) as with_returns,
                COUNT(CASE WHEN future_returns ? '30' THEN 1 END) as complete_30d
            FROM etf_buying_patterns
        """)).fetchone()

    if stats:
        logger.info(f"Final: total={stats[0]}, with_returns={stats[1]}, complete_30d={stats[2]}")


if __name__ == "__main__":
    main()
