
import sys
import os
import logging
from sqlalchemy import text

# Setup paths
sys.path.append(os.getcwd())

from ETF.database.sql_storage import SQLStorage

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_schema():
    logger.info("🔧 Starting Schema Fix for etf_holdings_snapshot...")
    
    storage = SQLStorage()
    
    with storage.engine.connect() as conn:
        trans = conn.begin()
        try:
            logger.info("Dropping old PRIMARY KEY...")
            conn.execute(text("ALTER TABLE etf_holdings_snapshot DROP CONSTRAINT IF EXISTS etf_holdings_snapshot_pkey;"))
            
            logger.info("Adding new PRIMARY KEY (etf_code, stock_code, data_date)...")
            conn.execute(text("ALTER TABLE etf_holdings_snapshot ADD CONSTRAINT etf_holdings_snapshot_pkey PRIMARY KEY (etf_code, stock_code, data_date);"))
            
            trans.commit()
            logger.info("✅ Schema fix successful!")
        except Exception as e:
            trans.rollback()
            logger.error(f"❌ Schema fix failed: {e}")

if __name__ == "__main__":
    fix_schema()
