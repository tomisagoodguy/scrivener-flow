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

ETF_CODE = "00981A"
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate AI Investment Report")
    parser.add_argument(
        "--dry-run", action="store_true", help="Generate report without sending to LINE"
    )
    args = parser.parse_args()

    AIReporter(ETF_CODE, MODELS_TO_TRY).run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
