"""
ETF Flow Daily Backfill

補寫 etf_flow_daily 缺失日期（不需 FinLab，只用 DB）。

用法：
    uv run python ETF/backfill_flow_daily.py --dates 2026-05-19 2026-05-20
    uv run python ETF/backfill_flow_daily.py --dates 2026-05-19 2026-05-20 --dry-run
"""

import argparse
import logging
import os
import sys

from dotenv import load_dotenv

if os.path.exists('.env.local'):
    load_dotenv('.env.local')
else:
    load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("backfill_flow_daily")


def main():
    parser = argparse.ArgumentParser(description="Backfill etf_flow_daily for missing dates")
    parser.add_argument("--dates", nargs="+", required=True, help="Dates to backfill (YYYY-MM-DD)")
    parser.add_argument("--dry-run", action="store_true", help="Compute but don't write to DB")
    args = parser.parse_args()

    from ETF.database.sql_storage import SQLStorage
    from ETF.pipeline.steps.flow_compute_step import FlowComputeStep
    from ETF.pipeline.context import PipelineContext

    sql_storage = SQLStorage()

    class _FakeCtx:
        """Minimal context for FlowComputeStep"""
        is_dry_run: bool
        date_str: str

    class _FakeServices:
        def __init__(self, storage):
            self.sql_storage = storage

    services = _FakeServices(sql_storage)

    step = FlowComputeStep()

    for date_str in args.dates:
        logger.info(f"Backfilling etf_flow_daily for {date_str} ...")

        ctx = _FakeCtx()
        ctx.date_str = date_str
        ctx.is_dry_run = args.dry_run

        try:
            step._run(ctx, services)
            if args.dry_run:
                logger.info(f"[DRY RUN] Would have written flow data for {date_str}")
            else:
                logger.info(f"Successfully wrote flow data for {date_str}")
        except Exception as e:
            import traceback
            logger.error(f"Failed for {date_str}: {e}\n{traceback.format_exc()}")
            sys.exit(1)

    logger.info("Done.")


if __name__ == "__main__":
    main()
