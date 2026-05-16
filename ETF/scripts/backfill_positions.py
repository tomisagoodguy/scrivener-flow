"""
backfill_positions.py

從既有的 etf_diff_logs + stock_prices_daily 重算所有歷史
etf_position_summary 與 etf_pnl_series。

用法：
  uv run python ETF/scripts/backfill_positions.py [--days N]

  --days  回溯天數，預設 365
"""

import argparse
import logging
import os
import sys
from datetime import date, timedelta

from dotenv import load_dotenv

# 確保 project root 在 sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

if os.path.exists('.env.local'):
    load_dotenv('.env.local')
else:
    load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description='Backfill ETF position summary')
    parser.add_argument('--days', type=int, default=365, help='How many days to backfill')
    args = parser.parse_args()

    from ETF.database.sql_storage import SQLStorage
    from ETF.pipeline.context import PipelineContext
    from ETF.pipeline.services import PipelineServices
    from ETF.pipeline.steps.position_summary_step import PositionSummaryStep
    import argparse as _ap
    import pathlib

    # 建立最小 ctx
    ctx = PipelineContext(
        args=_ap.Namespace(),
        output_dir=pathlib.Path('.'),
        is_dry_run=False,
        is_ci=True,
    )

    sql_storage = SQLStorage()
    services = PipelineServices(storage=None, notifier=None, finlab_srv=None, sql_storage=sql_storage)

    step = PositionSummaryStep()
    today = date.today()
    failed = []

    for i in range(args.days, -1, -1):
        target = (today - timedelta(days=i)).isoformat()
        ctx.date_str = target
        try:
            step.execute(ctx, services)
            logger.info("✓ %s", target)
        except Exception as e:
            logger.error("✗ %s: %s", target, e)
            failed.append(target)

    logger.info("Done. %d dates processed, %d failed.", args.days + 1, len(failed))
    if failed:
        logger.warning("Failed dates: %s", failed[:10])


if __name__ == '__main__':
    main()
