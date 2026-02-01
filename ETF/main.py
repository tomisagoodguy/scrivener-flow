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

    # 4. Fetch Prices from Finlab (Only if Taiwan Stocks)
    try:
        # Check if codes look like TW stocks (numeric and 4-5 chars)
        # Be more lenient: if majority are numeric
        numeric_codes = [c for c in df['code'].head(20).tolist() if str(c).strip().isdigit()]
        is_tw_stocks = len(numeric_codes) > 10
        
        if is_tw_stocks:
            logger.info(f"Detected Taiwan stocks ({len(numeric_codes)}/20 numeric). Fetching prices from Finlab...")
            # Use Finlab to get prices
            if finlab_srv.login():
                from finlab import data
                price_df = data.get('price:收盤價')
                # Get the latest price for each stock
                # Normalize date_str to YYYY-MM-DD
                clean_date = date_str.replace("-", "").replace("/", "")
                try:
                    target_date = datetime.strptime(clean_date, "%Y%m%d").strftime("%Y-%m-%d")
                except:
                    logger.warning(f"Could not parse date_str '{date_str}'. Using current date.")
                    target_date = datetime.today().strftime("%Y-%m-%d")
                
                if target_date in price_df.index:
                    latest_prices = price_df.loc[target_date]
                    logger.info(f"Using prices from target date: {target_date}")
                else:
                    logger.warning(f"Target date {target_date} not in Finlab. Using the most recent available price.")
                    latest_prices = price_df.iloc[-1]
                
                # Cleanup symbols in index just in case
                latest_prices.index = latest_prices.index.astype(str).str.strip()
                
                df['price'] = df['code'].str.strip().map(latest_prices)
                df['currency'] = 'TWD'
                
                valid_prices = df['price'].notnull().sum()
                logger.info(f"Successfully attached {valid_prices} prices from Finlab.")
                
                # --- NEW: Sync Historical OHLCV for Charts ---
                try:
                    logger.info("Syncing historical OHLCV data for K-line charts...")
                    ohlcv_df = finlab_srv.get_ohlcv(df['code'].tolist(), days=250)
                    if not ohlcv_df.empty:
                        storage.save_stock_prices(ohlcv_df)
                except Exception as ex:
                    logger.error(f"Failed to sync OHLCV: {ex}")
                # ---------------------------------------------
            else:
                logger.warning("Finlab login failed. Proceeding without prices.")
        else:
            logger.info("Codes do not look like Taiwan stocks. Skipping Finlab price fetch.")
            df['price'] = None
            df['currency'] = None
    except Exception as e:
        logger.error(f"Error fetching Finlab prices: {e}")

    # 5. Logic
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
        logger.info(f"Columns in DF: {df.columns.tolist()}")
        logger.info(f"Sample data:\n{df[['code', 'name', 'price']].head()}")
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
