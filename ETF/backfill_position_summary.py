"""
Backfill etf_position_summary + etf_pnl_series

基於 etf_diff_logs 中已有的所有日期，逐日重新計算損益並寫入 DB。
使用 PositionSummaryStep 的相同邏輯，避免重複實作。

用法：
    uv run python ETF/backfill_position_summary.py              # 回溯全部日期
    uv run python ETF/backfill_position_summary.py --days 90   # 只回溯最近 90 天
    uv run python ETF/backfill_position_summary.py --dry-run   # 只顯示日期，不寫 DB
"""

import argparse
import logging
import sys
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
load_dotenv(project_root / ".env.local")

from ETF.pipeline.steps.position_summary_step import PositionSummaryStep

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


class _MinimalCtx:
    """只帶 date_str 和 sql_storage 的輕量 context，給 PositionSummaryStep 使用。"""

    def __init__(self, target_date: str):
        self.date_str = target_date
        self.is_dry_run = False
        self._sql_storage = None

    @property
    def sql_storage(self):
        if self._sql_storage is None:
            from ETF.database.sql_storage import SQLStorage
            self._sql_storage = SQLStorage()
        return self._sql_storage


def get_distinct_dates(ctx: _MinimalCtx, since: str | None) -> list[str]:
    """從 etf_diff_logs 撈出所有有資料的日期，依時間升序。"""
    with ctx.sql_storage.engine.connect() as conn:
        if since:
            rows = conn.execute(text(
                "SELECT DISTINCT data_date FROM etf_diff_logs WHERE data_date >= :since ORDER BY data_date"
            ), {"since": since})
        else:
            rows = conn.execute(text(
                "SELECT DISTINCT data_date FROM etf_diff_logs ORDER BY data_date"
            ))
        return [str(r[0]) for r in rows]


def backfill(days: int | None, dry_run: bool) -> None:
    # 先用任意日期初始化 ctx，後面會逐日更換 date_str
    ctx = _MinimalCtx("")

    since = None
    if days:
        since = (date.today() - timedelta(days=days)).strftime("%Y-%m-%d")

    target_dates = get_distinct_dates(ctx, since)
    if not target_dates:
        logger.warning("etf_diff_logs 中找不到任何日期，請先執行 backfill_diff_logs.py")
        return

    logger.info("準備回溯 %d 個日期：%s → %s", len(target_dates), target_dates[0], target_dates[-1])

    if dry_run:
        logger.info("Dry-run 模式，不寫入 DB。日期列表：%s", target_dates)
        return

    step = PositionSummaryStep()
    success = 0
    for d in target_dates:
        ctx.date_str = d
        try:
            step._run(ctx)
            success += 1
            logger.info("[%d/%d] %s 完成", success, len(target_dates), d)
        except Exception as e:
            logger.error("日期 %s 失敗：%s", d, e)

    logger.info("Backfill 完成：%d / %d 個日期成功寫入", success, len(target_dates))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill etf_position_summary from etf_diff_logs")
    parser.add_argument("--days", type=int, default=None,
                        help="只回溯最近 N 天（預設：全部）")
    parser.add_argument("--dry-run", action="store_true",
                        help="只列出日期，不寫入 DB")
    args = parser.parse_args()

    backfill(days=args.days, dry_run=args.dry_run)
