
import sys
import os
import logging
import pandas as pd
from datetime import datetime

# Setup paths
sys.path.append(os.getcwd())

from ETF.database.storage import ETFStorage

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def reimport_csvs():
    logger.info("🚀 Starting re-import of CSV holdings...")
    
    etf_storage = ETFStorage()
    history_dir = os.path.join(os.getcwd(), 'ETF', 'history')
    
    # Files to import (based on user report: 1/3, 2/3)
    # The user said "1/3 2/3-6".
    # Local files found: 
    # 00981A_2026-01-30.csv
    # 00981A_2026-02-03.csv
    
    files_to_import = [
        '00981A_2026-01-30.csv',
        '00981A_2026-02-03.csv'
    ]
    
    for filename in files_to_import:
        file_path = os.path.join(history_dir, filename)
        if not os.path.exists(file_path):
            logger.warning(f"File not found: {file_path}")
            continue
            
        # Extract date from filename: 00981A_YYYY-MM-DD.csv
        try:
            date_part = filename.replace('00981A_', '').replace('.csv', '')
            # Validate date format
            datetime.strptime(date_part, '%Y-%m-%d')
            data_date = date_part
        except ValueError:
            logger.error(f"Could not parse date from filename: {filename}")
            continue
            
        logger.info(f"📂 Reading {filename} for date {data_date}...")
        try:
            df = pd.read_csv(file_path)
            
            # Map CSV columns to match what save_snapshot expects if needed
            # CSV: code,name,shares,weight,...
            # save_snapshot expects df with columns: 'code', 'name', 'shares', 'weight', 'price', ...
            # The CSV headers match exactly based on my read earlier.
            
            logger.info(f"   Found {len(df)} records. Importing to Database...")
            
            # Use save_snapshot
            etf_storage.save_snapshot(df, '00981A', data_date)
            
            logger.info(f"✅ Successfully imported {filename}")
            
        except Exception as e:
            logger.error(f"❌ Failed to import {filename}: {e}")

if __name__ == "__main__":
    reimport_csvs()
