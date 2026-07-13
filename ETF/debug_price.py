import finlab
from finlab import data
from dotenv import load_dotenv
import pandas as pd
from datetime import datetime

load_dotenv('.env.local')

def debug_price():
    finlab.login()
    df = pd.DataFrame({'code': ['2330', '8299', '2308']})
    date_str = "20260130"
    target_date = datetime.strptime(date_str, "%Y%m%d").strftime("%Y-%m-%d")
    
    price_df = data.get('price:收盤價')
    print(f"Price DF index type: {type(price_df.index[0])}")
    print(f"Target date: {target_date}")
    
    if target_date in price_df.index:
        latest_prices = price_df.loc[target_date]
        print("Target date found!")
    else:
        print("Target date NOT found!")
        latest_prices = price_df.iloc[-1]
        
    print(f"Latest prices index head: {latest_prices.index[:5]}")
    print(f"Mapping result:\n{df['code'].map(pd.Series(latest_prices))}")

if __name__ == "__main__":
    debug_price()
