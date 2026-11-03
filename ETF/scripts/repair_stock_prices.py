"""修復 stock_prices_daily 中 close 為 NULL 的列（一次性）。

找出 --since 起有 NULL close 的股票，向 FinLab 重抓期間內 OHLCV，
只 upsert 有收盤價的列（SQLStorage.upsert_stock_prices，單一交易）。
FinLab 當天也無價（無成交、下市）的列維持 NULL，結束時回報剩餘筆數。

執行：
  uv run python ETF/scripts/repair_stock_prices.py --since 2026-04-01 --dry-run
  uv run python ETF/scripts/repair_stock_prices.py --since 2026-04-01
"""

import argparse
import logging
import sys
from datetime import date
from pathlib import Path

import pandas as pd

if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import text  # noqa: E402

from ETF.database.sql_storage import build_price_records  # noqa: E402

logger = logging.getLogger(__name__)

_NULL_CLOSE_STOCKS_SQL = text("""
    SELECT DISTINCT stock_code FROM stock_prices_daily
    WHERE close IS NULL AND data_date >= CAST(:since AS date)
    ORDER BY stock_code
""")
_REMAINING_NULL_SQL = text("""
    SELECT count(*) FROM stock_prices_daily
    WHERE close IS NULL AND data_date >= CAST(:since AS date)
""")


def repair(storage, finlab, codes: list[str], since: date, dry_run: bool) -> int:
    """重抓 codes 自 since 起的 OHLCV 並寫入有價列；回傳寫入（或 dry-run 預計）筆數。"""
    close_index = finlab._get_data("close").index
    days = int((close_index >= pd.Timestamp(since)).sum())
    if not codes or days == 0:
        print("Nothing to repair")
        return 0

    frame = finlab.get_ohlcv(codes, days=days)
    if frame.empty:
        print("FinLab returned no OHLCV data")
        return 0
    frame = frame[pd.to_datetime(frame["date"]) >= pd.Timestamp(since)]

    if dry_run:
        planned = len(build_price_records(frame))
        print(f"{planned} rows would be repaired ({len(codes)} stocks, {days} trading days)")
        return planned

    written = storage.upsert_stock_prices(frame)
    print(f"Repaired {written} rows ({len(codes)} stocks, {days} trading days)")
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--since", required=True, type=date.fromisoformat)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    sys.stdout.reconfigure(encoding="utf-8")

    from ETF.database.sql_storage import SQLStorage
    from ETF.services.finlab.facade import FinlabService

    storage = SQLStorage()
    finlab = FinlabService()
    if not finlab.login():
        print("FinLab login failed", file=sys.stderr)
        return 1

    with storage.engine.connect() as conn:
        codes = [r[0] for r in conn.execute(_NULL_CLOSE_STOCKS_SQL, {"since": args.since.isoformat()})]
    print(f"{len(codes)} stocks have NULL close since {args.since}")

    repair(storage, finlab, codes, args.since, args.dry_run)

    with storage.engine.connect() as conn:
        remaining = conn.execute(_REMAINING_NULL_SQL, {"since": args.since.isoformat()}).scalar()
    print(f"Rows still NULL since {args.since}: {remaining}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
