"""backfill_fund_holdings_mops.py

回補 `fund_holdings_monthly` 歷史（MOPS t78sb39_q3，逐月抓取）。

SITCA 月報（IN2629）已知非最新期的 server-side filter 失效，只能查最新一期；
MOPS 這支端點無此限制，可查任意歷史月份，但只揭露 Top 5（SITCA 是 Top 10）。
`source='mops'`，與 `source='sitca'` 同鍵（ym, fund_short, stock_code）共存不互蓋
（PK 含 source）。

用法：
    uv run python ETF/scripts/backfill_fund_holdings_mops.py --from 202604 --to 202606
    uv run python ETF/scripts/backfill_fund_holdings_mops.py --from 202604 --to 202604 --dry-run
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv  # noqa: E402

from ETF.run_fund_holdings_sync import (  # noqa: E402
    _build_normalizer_mapping,
    _iter_yyyymm,
    _load_manager_map,
    _mops_funds_to_monthly_upserts,
    _upsert_monthly,
)

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("backfill_fund_holdings_mops")

_INTER_MONTH_SLEEP = 2.0


def run(from_ym: str, to_ym: str, dry_run: bool) -> int:
    """回補 `from_ym` 到 `to_ym`（含端點）的 MOPS 月報持股。

    Args:
        from_ym: 起始月份 YYYYMM。
        to_ym: 結束月份 YYYYMM（須 >= from_ym）。
        dry_run: True 時只抓取 + 解析，不連 DB、不寫入。

    Returns:
        int: exit code（任一月份抓取失敗則非 0）。
    """
    from ETF.scrapers import mops_fund_scraper

    engine = None
    if dry_run:
        map_rows = _load_manager_map(use_seed=True)
        logger.info("[dry-run] 使用 seed fund_manager_map（%d 筆）", len(map_rows))
    else:
        from ETF.database.sql_storage import SQLStorage

        engine = SQLStorage().engine
        map_rows = _load_manager_map(engine=engine)
        logger.info("已從 DB 載入 fund_manager_map（%d 筆有效）", len(map_rows))

    mapping = _build_normalizer_mapping(map_rows)
    fund_short_to_comid = {row["fund_short"]: row["comid"] for row in map_rows}

    months = _iter_yyyymm(from_ym, to_ym)
    logger.info("回補區間：%s ~ %s（%d 個月）", from_ym, to_ym, len(months))

    exit_code = 0
    total_upserted = 0
    total_unmatched = 0

    for i, ym in enumerate(months):
        try:
            result = mops_fund_scraper.fetch_monthly(ym, mapping=mapping)
        except Exception as exc:  # noqa: BLE001 — 單月失敗不中斷其餘月份
            logger.error("MOPS ym=%s 抓取失敗：%s", ym, exc)
            exit_code = 1
            if i < len(months) - 1:
                time.sleep(_INTER_MONTH_SLEEP)
            continue

        upserts = _mops_funds_to_monthly_upserts(ym, result["funds"], fund_short_to_comid)
        unmatched = result["unmatched"]
        total_unmatched += len(unmatched)

        if dry_run:
            logger.info(
                "[dry-run] %s：%d 檔基金 Top5（%d 筆持股），unmatched %d 筆",
                ym,
                len(result["funds"]),
                len(upserts),
                len(unmatched),
            )
        else:
            n = _upsert_monthly(engine, upserts)
            total_upserted += n
            logger.info("%s：upsert %d 筆，unmatched %d 筆", ym, n, len(unmatched))

        if unmatched:
            logger.warning("%s unmatched：%s", ym, unmatched)

        if i < len(months) - 1:
            time.sleep(_INTER_MONTH_SLEEP)

    logger.info(
        "完成。共處理 %d 個月，累計 upsert %d 筆，累計 unmatched %d 筆",
        len(months),
        total_upserted,
        total_unmatched,
    )
    return exit_code


def main() -> int:
    parser = argparse.ArgumentParser(description="MOPS 基金持股月報歷史回補")
    parser.add_argument("--from", dest="from_ym", required=True, help="起始月份 YYYYMM")
    parser.add_argument("--to", dest="to_ym", required=True, help="結束月份 YYYYMM")
    parser.add_argument("--dry-run", action="store_true", help="只抓取 + 解析，不連 DB、不寫入")
    args = parser.parse_args()

    if (PROJECT_ROOT / ".env.local").exists():
        load_dotenv(str(PROJECT_ROOT / ".env.local"))
    else:
        load_dotenv()

    try:
        return run(args.from_ym, args.to_ym, args.dry_run)
    except Exception as exc:  # noqa: BLE001 — 頂層防護
        logger.error("MOPS 回補失敗：%s", exc, exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
