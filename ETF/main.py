import os
import sys
import logging
import argparse
import pathlib
import subprocess
from datetime import datetime

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

from ETF.scrapers.fhtrust_scraper import FhTrustScraper
from ETF.database.storage import ETFStorage
from ETF.processors.diff_engine import compute_diff
from ETF.notifiers.line_notifier import LineNotifier

def main():
    parser = argparse.ArgumentParser(description="ETF Tracker Main Process")
    parser.add_argument("--dry-run", action="store_true", help="Do not save to DB")
    args = parser.parse_args()

    logger.info("🚀 Starting ETF Tracker V1...")

    # 1. Output Dir
    output_dir = PROJECT_ROOT / "ETF" / "history"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 2. Scrape
    scraper = FhTrustScraper(output_dir)
    df, date_str = scraper.run()
    
    if df is None or df.empty:
        logger.error("Scraping returned no data. Aborting.")
        sys.exit(1)
        
    etf_code = "00981A"
    records_count = len(df)
    logger.info(f"Scraped data for {date_str}. Records: {records_count}")

    if args.dry_run:
        logger.info("[Dry Run] Skipping DB / Notify / Git.")
        return

    # 3. Connection Components
    storage = ETFStorage()
    notifier = LineNotifier()

    # 4. Logic
    try:
        # A. Previous Snapshot
        prev_df = storage.get_latest_snapshot(etf_code)
        
        # B. Compute Diff
        if prev_df.empty:
            logger.info("No previous snapshot found (First Run?). Treating all as IN.")
            # We can fake prev_df as empty, diff engine handles it.
        
        diff_logs = compute_diff(prev_df, df, etf_code, date_str)
        
        # C. Save Diff & Periods
        if diff_logs:
            logger.info(f"Found {len(diff_logs)} diff events.")
            storage.save_diff_logs(diff_logs)
            storage.update_holding_periods(diff_logs)
            
            # D. Notify (Only if IN/OUT)
            notifier.notify_diffs(diff_logs, etf_code, date_str)
        else:
            logger.info("No significant changes found.")

        # E. Update Snapshot (Always update to latest)
        storage.save_snapshot(df, etf_code, date_str)
        
        # F. CSV Archive
        csv_filename = f"{etf_code}_{date_str}.csv"
        csv_path = output_dir / csv_filename
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        logger.info(f"Saved CSV archive: {csv_path}")
        
        logger.info("✅ ETF Tracker finished successfully.")
        
    except Exception as e:
        logger.error(f"Critical Error in Main Process: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
