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
from ETF.services.finlab_service import FinlabService

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
    finlab_srv = FinlabService(stock_list=df['code'].tolist())

    # 4. Fetch/Attach Prices
    try:
        # Check if codes look like TW stocks
        numeric_codes = [c for c in df['code'].head(20).tolist() if str(c).strip().isdigit()]
        if len(numeric_codes) > 10:
            logger.info("Detected Taiwan stocks. Fetching prices, amounts and margins...")
            df = finlab_srv.attach_prices(df, date_str)
        else:
            logger.info("Codes do not look like Taiwan stocks. Skipping Finlab price fetch.")
            df['price'] = None
            df['amount'] = None
            df['margin_ratio'] = 0
            df['currency'] = None
    except Exception as e:
        logger.error(f"Error during price attachment: {e}")

    # 5. Business Logic (Save Snapshot & Diffs)
    try:
        # A. Previous Snapshot
        prev_df = storage.get_latest_snapshot(etf_code)
        
        diff_logs = compute_diff(prev_df, df, etf_code, date_str)
        
        # B. Save Diff & Periods
        if diff_logs:
            logger.info(f"Found {len(diff_logs)} diff events.")
            storage.save_diff_logs(diff_logs)
            storage.update_holding_periods(diff_logs)
            
            # C. Notify
            notifier.notify_diffs(diff_logs, etf_code, date_str)
        else:
            logger.info("No significant changes found.")

        # D. Update Snapshot (Essential for List UI)
        storage.save_snapshot(df, etf_code, date_str)
        logger.info("Snapshot updated successfully.")
        
    except Exception as e:
        logger.error(f"Error in business logic: {e}")

    # 6. Historical Data Sync (Slow - for K-line charts)
    try:
        if len(numeric_codes) > 10:
            logger.info("Syncing historical OHLCV for charts (this may take a while)...")
            ohlcv_df = finlab_srv.get_ohlcv(df['code'].tolist(), days=250)
            if not ohlcv_df.empty:
                storage.save_stock_prices(ohlcv_df)
                logger.info("OHLCV sync completed.")
    except Exception as e:
        logger.error(f"Error during OHLCV sync: {e}")

    # 7. CSV Archive
    try:
        csv_filename = f"{etf_code}_{date_str}.csv"
        csv_path = output_dir / csv_filename
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        logger.info(f"Saved CSV archive: {csv_path}")
    except Exception as e:
        logger.error(f"Error saving CSV: {e}")

    logger.info("✅ ETF Tracker pipeline finished.")

if __name__ == "__main__":
    main()
