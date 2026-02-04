"""
Backfill ETF diff logs from existing snapshots.

用途：
- 依照 `etf_holdings_snapshot` 內已存在的所有日期，從最早一路算到最新，
  逐日計算「今日 vs 前一個 snapshot」的異動紀錄，重建 `etf_diff_logs`。

注意：
- 預設會先刪除該 ETF 既有的 `etf_diff_logs`，再整批重算寫回去。
"""

import logging
from typing import List

import requests

from ETF.database.storage import ETFStorage
from ETF.processors.diff_engine import compute_diff


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def get_all_snapshot_dates(storage: ETFStorage, etf_code: str) -> List[str]:
    """
    從 etf_holdings_snapshot 撈出指定 ETF 的所有資料日期，依時間排序。
    """
    url = f"{storage.supabase_url}/rest/v1/etf_holdings_snapshot"
    params = {
        "etf_code": f"eq.{etf_code}",
        "select": "data_date",
        "order": "data_date.asc",
    }
    resp = requests.get(url, headers=storage.headers, params=params)
    resp.raise_for_status()
    rows = resp.json()
    dates = sorted({r["data_date"] for r in rows})
    return dates


def clear_diff_logs(storage: ETFStorage, etf_code: str) -> None:
    """
    刪除指定 ETF 既有的 etf_diff_logs 紀錄，避免重覆 / 舊邏輯殘留。
    """
    url = f"{storage.supabase_url}/rest/v1/etf_diff_logs"
    params = {"etf_code": f"eq.{etf_code}"}
    resp = requests.delete(url, headers=storage.headers, params=params)
    resp.raise_for_status()
    logger.info("Cleared existing diff logs for %s", etf_code)


def backfill_diff_logs(etf_code: str = "00981A", dry_run: bool = False) -> None:
    storage = ETFStorage()

    dates = get_all_snapshot_dates(storage, etf_code)
    if len(dates) < 2:
        logger.warning("Not enough snapshot dates for %s, found: %s", etf_code, dates)
        return

    logger.info("Found %d snapshot dates for %s: %s", len(dates), etf_code, dates)

    all_logs = []

    # 逐日計算：第二天開始，每天 vs 前一天
    for i in range(1, len(dates)):
        prev_date = dates[i - 1]
        curr_date = dates[i]

        logger.info("Computing diff: %s vs %s", prev_date, curr_date)

        prev_df = storage.get_snapshot_from_date(etf_code, prev_date)
        curr_df = storage.get_snapshot_from_date(etf_code, curr_date)

        if prev_df.empty and curr_df.empty:
            logger.warning("Both prev and curr snapshots are empty for %s -> %s, skip", prev_date, curr_date)
            continue

        logs = compute_diff(prev_df, curr_df, etf_code, curr_date)
        logger.info("Generated %d logs for %s", len(logs), curr_date)
        all_logs.extend(logs)

    logger.info("Total diff logs to write: %d", len(all_logs))

    if dry_run:
        logger.info("Dry-run mode, no changes will be written to database.")
        return

    # 清除既有 log 後重寫
    clear_diff_logs(storage, etf_code)
    if all_logs:
        storage.save_diff_logs(all_logs)
        logger.info("Backfill completed: wrote %d diff logs for %s", len(all_logs), etf_code)
    else:
        logger.info("No logs generated during backfill for %s", etf_code)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Backfill ETF diff logs from existing snapshots.")
    parser.add_argument("--etf", dest="etf_code", default="00981A", help="ETF code to backfill (default: 00981A)")
    parser.add_argument("--dry-run", action="store_true", help="Compute logs but do not write to database")

    args = parser.parse_args()
    backfill_diff_logs(etf_code=args.etf_code, dry_run=args.dry_run)

