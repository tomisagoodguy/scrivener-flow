import sys
import os
import pandas as pd
from dotenv import load_dotenv

# Setup paths
sys.path.append(os.getcwd())

# Load env
load_dotenv('.env.local')

from ETF.services.finlab_service import FinlabService
from ETF.database.storage import ETFStorage

def update_stock(code='8358', days=500):
    print(f"Force updating stock {code} for last {days} days...")
    
    finlab = FinlabService()
    if not finlab.login():
        print("Finlab Login failed")
        return

    # Fetch OHLCV + it_buy
    print("Fetching OHLCV + it_buy...")
    # Passing the single code in a list
    df = finlab.get_ohlcv([code], days=days)
    
    if df.empty:
        print("No data returned.")
        return

    # Save to DB
    print("Saving to database via ETFStorage (REST)...")
    storage = ETFStorage()
    storage.save_stock_prices(df)
    
    print("Done!")

if __name__ == "__main__":
    update_stock()
