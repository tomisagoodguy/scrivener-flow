
import sys
from pathlib import Path
from dotenv import load_dotenv
import pandas as pd
import finlab
from finlab import data

# Add ETF directory to path for imports
ETF_DIR = Path(__file__).parent
sys.path.insert(0, str(ETF_DIR))

# Load .env.local from project root
project_root = ETF_DIR.parent
env_path = project_root / '.env.local'
load_dotenv(env_path)

def diagnose_all_dates():
    print("Logging in to Finlab...")
    finlab.login()

    datasets = {
        'Top15 Buy': 'etl:broker_transactions:top15_buy',
        'Top15 Sell': 'etl:broker_transactions:top15_sell',
        'Close Price': 'price:收盤價'
    }

    results = {}

    for name, key in datasets.items():
        print(f"\nFetching '{name}' ({key})...")
        try:
            df = data.get(key)
            if df is None or df.empty:
                print(f"  -> Empty!")
                results[name] = (None, None)
            else:
                start = df.index.min()
                end = df.index.max()
                print(f"  -> Range: {start} to {end}")
                results[name] = (start, end)
        except Exception as e:
            print(f"  -> Error: {e}")

    # Check intersection
    print("\n--- Intersection Analysis ---")
    dates = []
    for name, (start, end) in results.items():
        if end is not None:
            dates.append(end)
    
    if dates:
        print(f"Min of max dates (Bottle neck): {min(dates)}")
    else:
        print("No valid dates found.")

if __name__ == "__main__":
    diagnose_all_dates()
