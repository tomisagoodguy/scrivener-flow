"""
ETF Tracker Main Entry Point

簡化後的進入點，業務邏輯已移至 pipeline/steps/ 目錄。
"""

import os
import sys
import logging
import argparse
import pathlib
from dotenv import load_dotenv

# Load env for local development
if os.path.exists('.env.local'):
    load_dotenv('.env.local')
else:
    load_dotenv()

# Setup paths
PROJECT_ROOT = pathlib.Path(__file__).parent.parent
sys.path.append(str(PROJECT_ROOT))

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("ETF_Main")


def main():
    """ETF Tracker 主進入點"""
    parser = argparse.ArgumentParser(description="ETF Tracker Main Process")
    parser.add_argument("--dry-run", action="store_true", help="Do not save to DB")
    parser.add_argument("--days", type=int, default=250, help="Number of days for OHLCV sync (default: 250)")
    args = parser.parse_args()

    # 環境變數檢查：保護 Finlab 配額
    is_ci = os.getenv("CI", "false").lower() == "true"
    force_run = os.getenv("FORCE_RUN", "false").lower() == "true"
    
    if not is_ci and not force_run:
        logger.warning("🛑 Local execution blocked to protect Finlab quota (5GB/day limit).")
        logger.warning("   Please run via GitHub Actions.")
        logger.warning("   To force run locally, set FORCE_RUN=true in .env")
        sys.exit(0)

    # 建立 Pipeline Context
    from ETF.pipeline import PipelineContext, PipelineOrchestrator
    
    output_dir = PROJECT_ROOT / "ETF" / "history"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    ctx = PipelineContext(
        args=args,
        output_dir=output_dir,
        is_dry_run=args.dry_run,
        is_ci=is_ci,
        force_run=force_run,
    )
    
    # 執行 Pipeline
    if args.dry_run:
        orchestrator = PipelineOrchestrator.create_dry_run()
    else:
        orchestrator = PipelineOrchestrator()
    
    try:
        orchestrator.run(ctx)
        logger.info("✅ ETF Tracker pipeline finished.")
    except Exception as e:
        logger.error(f"❌ Pipeline failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
