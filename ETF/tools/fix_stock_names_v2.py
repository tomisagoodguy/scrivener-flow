
import os
import sys
import logging
import pandas as pd
from sqlalchemy import text
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ETF.database.sql_storage import SQLStorage
import finlab
from finlab import data

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    # Load env
    load_dotenv('.env.local')
    
    # Login finlab
    finlab.login(os.getenv("FINLAB_API_KEY"))
    
    storage = SQLStorage()
    
    # 1. Get all stock codes that need names
    with storage.engine.connect() as conn:
        result = conn.execute(text("""
            SELECT DISTINCT stock_code FROM strategy_daily_holdings
            UNION
            SELECT DISTINCT stock_code FROM strategy_changes_log
        """))
        stock_codes = [row[0] for row in result]
    
    logger.info(f"Found {len(stock_codes)} unique stock codes in strategy tables.")
    
    # 2. Fetch company info
    logger.info("Fetching company_basic_info from Finlab...")
    df = data.get('company_basic_info')
    
    # 3. Prepare name map
    # company_basic_info columns might be different, let's check keys
    # Usually: stock_id, 公司簡稱, 公司名稱, ...
    
    # Finlab generic logic
    if 'stock_id' in df.columns:
        df['stock_code'] = df['stock_id']
    elif df.index.name == 'stock_id':
        df['stock_code'] = df.index
        
    df = df.reset_index()
    if 'stock_id' in df.columns and 'stock_code' not in df.columns:
        df['stock_code'] = df['stock_id']
        
    # Filter for our stocks
    # Ensure stock_code is string
    df['stock_code'] = df['stock_code'].astype(str)
    
    # Create map: code -> name
    # Prioritize '公司簡稱', then '公司名稱'
    name_map = {}
    for _, row in df.iterrows():
        code = row['stock_code']
        name = row.get('公司簡稱') or row.get('公司名稱') or row.get('name')
        if name:
            name_map[code] = name
            
    logger.info(f"Loaded {len(name_map)} stock names from Finlab.")
    
    # 4. Update Database
    with storage.engine.connect() as conn:
        # Update stock_basic_info first
        logger.info("Updating stock_basic_info...")
        count_basic = 0
        for code in stock_codes:
            if code in name_map:
                name = name_map[code]
                # Check if exists
                exists = conn.execute(text("SELECT 1 FROM stock_basic_info WHERE stock_code = :code"), {"code": code}).fetchone()
                if exists:
                    conn.execute(text("UPDATE stock_basic_info SET name_short = :name WHERE stock_code = :code"), {"name": name, "code": code})
                else:
                    conn.execute(text("INSERT INTO stock_basic_info (stock_code, name_short) VALUES (:code, :name)"), {"name": name, "code": code})
                count_basic += 1
        
        logger.info(f"Updated {count_basic} records in stock_basic_info")

        # Update strategy tables
        logger.info("Updating strategy tables...")
        count_holdings = 0
        count_logs = 0
        
        for code in stock_codes:
            if code in name_map:
                name = name_map[code]
                
                # Update strategy_changes_log
                res2 = conn.execute(text("""
                    UPDATE strategy_changes_log 
                    SET stock_name = :name 
                    WHERE stock_code = :code AND (stock_name IS NULL OR stock_name = stock_code)
                """), {"name": name, "code": code})
                count_logs += res2.rowcount
                
        conn.commit()
        # logger.info(f"Updated {count_holdings} rows in strategy_daily_holdings")
        logger.info(f"Updated {count_logs} rows in strategy_changes_log")
        
    logger.info("Done!")

if __name__ == "__main__":
    main()
