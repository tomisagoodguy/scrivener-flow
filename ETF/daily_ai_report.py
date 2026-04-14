import os
import sys
import logging
import argparse

# Setup Path
try:
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.append(project_root)
except Exception:
    sys.path.append(os.getcwd())

from ETF.ai_report.reporter import AIReporter  # noqa: E402

ETF_CODES = ["00981A", "00980A", "00991A"]
MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-3-flash",
    "gemini-2.5-flash-lite",
    "gemma-3-27b",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


def run_report(etf_code: str, dry_run: bool = False) -> None:
    """為單一 ETF 執行 AI 報告生成。

    Args:
        etf_code: ETF 代碼，例如 "00981A"。
        dry_run: True 時印出報告前 200 字，不發送 LINE 通知。
    """
    logger.info(f"Starting AI report for {etf_code}...")
    AIReporter(etf_code, MODELS_TO_TRY).run(dry_run=dry_run)
    logger.info(f"AI report for {etf_code} completed.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate AI Investment Report")
    parser.add_argument(
        "--dry-run", action="store_true", help="Generate report without sending to LINE"
    )
    args = parser.parse_args()

    for etf_code in ETF_CODES:
        try:
            run_report(etf_code, dry_run=args.dry_run)
        except Exception as e:
            logger.error(f"AI report for {etf_code} failed: {e}", exc_info=True)


if __name__ == "__main__":
    main()
