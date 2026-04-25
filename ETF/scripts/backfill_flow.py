"""
backfill_flow.py

從 etf_diff_logs + stock_prices_daily 重算歷史每日資金流向，
批次寫入 etf_flow_daily。

用法：
  uv run python ETF/scripts/backfill_flow.py [--days N]

  --days  回溯天數，預設 180
"""

import argparse
import logging
import os
import sys
from datetime import date, timedelta

from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

if os.path.exists('.env.local'):
    load_dotenv('.env.local')
else:
    load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description='Backfill ETF daily flow')
    parser.add_argument('--days', type=int, default=180, help='How many days to backfill')
    args = parser.parse_args()

    from ETF.pipeline.context import PipelineContext
    from ETF.pipeline.steps.flow_compute_step import FlowComputeStep
    import argparse as _ap
    import pathlib

    ctx = PipelineContext(
        args=_ap.Namespace(),
        output_dir=pathlib.Path('.'),
        is_dry_run=False,
        is_ci=True,
    )

    step = FlowComputeStep()
    today = date.today()
    failed = []

    for i in range(args.days, -1, -1):
        target = (today - timedelta(days=i)).isoformat()
        ctx.date_str = target
        try:
            step.execute(ctx)
            logger.info("✓ %s", target)
        except Exception as e:
            logger.error("✗ %s: %s", target, e)
            failed.append(target)

    logger.info("Done. %d dates processed, %d failed.", args.days + 1, len(failed))
    if failed:
        logger.warning("Failed dates: %s", failed[:10])


if __name__ == '__main__':
    main()
