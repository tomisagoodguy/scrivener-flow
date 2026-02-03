import sys
import os
import logging
from dotenv import load_dotenv

# Setup paths
sys.path.append(os.getcwd())

# Load env
load_dotenv('.env.local')

from ETF.services.finlab_service import FinlabService
from ETF.database.sql_storage import SQLStorage
from ETF.database.storage import ETFStorage

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_all_stocks(days=500):
    logger.info("🚀 Starting force update for ALL stocks...")
    
    # 1. Get Stock List using SQLStorage (direct DB connection)
    try:
        sql_storage = SQLStorage()
        dataset_code = '00981A' # Default ETF code we are tracking
        logger.info(f"Fetching target stock list for {dataset_code}...")
        stock_list = sql_storage.get_target_stocks(dataset_code)
        
        if not stock_list:
            logger.error(f"No stocks found for {dataset_code}.")
            return
            
        logger.info(f"📋 Found {len(stock_list)} stocks to update.")
        
    except Exception as e:
        logger.error(f"Failed to get stock list: {e}")
        return

    # 2. Login to Finlab
    finlab_srv = FinlabService()
    if not finlab_srv.login():
        logger.error("Finlab Login failed")
        return

    # 3. Fetch OHLCV + it_buy in batches (to avoid memory issues/timeouts if list is huge)
    # Although Finlab handles bulk well, let's just do it all at once as Finlab SDK is efficient.
    # get_ohlcv handles the fetching.
    
    logger.info(f"Fetching OHLCV + it_buy data for {len(stock_list)} stocks (last {days} days)...")
    try:
        df = finlab_srv.get_ohlcv(stock_list, days=days)
        
        if df.empty:
            logger.warning("No data returned from Finlab.")
            return

        logger.info(f"📉 Downloaded {len(df)} rows of data.")

        # 4. Save to DB using ETFStorage (REST API)
        logger.info("Saving to database via ETFStorage (REST)...")
        etf_storage = ETFStorage()
        etf_storage.save_stock_prices(df)
        
        logger.info("✅ All stocks updated successfully!")
        
        # 5. Capacity Cleanup
        try:
             logger.info("Running database capacity cleanup...")
             sql_storage.cleanup_old_data()
        except Exception as e:
             logger.error(f"Error during capacity cleanup: {e}")
        
    except Exception as e:
        logger.error(f"Error during update process: {e}")

if __name__ == "__main__":
    update_all_stocks()
