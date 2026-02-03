import os
import sys
import logging
import argparse
import pathlib
import subprocess
from datetime import datetime
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

from ETF.scrapers.fhtrust_scraper import FhTrustScraper
from ETF.database.storage import ETFStorage
from ETF.processors.diff_engine import compute_diff
from ETF.notifiers.line_notifier import LineNotifier
from ETF.services.finlab_service import FinlabService
from ETF.database.sql_storage import SQLStorage

def main():
    parser = argparse.ArgumentParser(description="ETF Tracker Main Process")
    parser.add_argument("--dry-run", action="store_true", help="Do not save to DB")
    parser.add_argument("--days", type=int, default=250, help="Number of days for OHLCV sync (default: 250)")
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
        # A. Previous Snapshot (Try to get snapshot from 5 days ago)
        prev_df = storage.get_snapshot_days_ago(etf_code, days_ago=5)
        
        # If no historical data found (first runs), fallback to latest
        if prev_df.empty:
            logger.info("No 5-day history found, falling back to latest snapshot.")
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

    # 6. Company Info Sync (Industry, Full Name)
    try:
        logger.info("Syncing company basic info and industry categories...")
        company_df = finlab_srv.get_company_info(df['code'].tolist())
        if not company_df.empty:
            storage.save_company_info(company_df)
            logger.info("Company info sync completed.")
    except Exception as e:
        logger.error(f"Error during company info sync: {e}")

    # 7. Historical Data Sync (Slow - for K-line charts)
    try:
        if len(numeric_codes) > 10:
            logger.info(f"Syncing historical OHLCV for charts ({args.days} days, this may take a while)...")
            ohlcv_df = finlab_srv.get_ohlcv(df['code'].tolist(), days=args.days)
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

    # 8. Capacity Cleanup (Prevent Database Overflow)
    try:
        logger.info("Running database capacity cleanup...")
        sql_storage = SQLStorage()
        sql_storage.cleanup_old_data()
    except Exception as e:
        logger.error(f"Error during capacity cleanup: {e}")

    # 9. Global Completion Notify
    try:
        notifier.send_text(f"✅ ETF 數據同步完成\n📅 日期: {date_str}\n📊 ETF: {etf_code}\n⚙️ 同步圍: {args.days} 天")
    except Exception as e:
        logger.error(f"Final notification failed: {e}")

    logger.info("✅ ETF Tracker pipeline finished.")

if __name__ == "__main__":
    main()
