"""Simple test to check Finlab data date range"""
from finlab import data
import pandas as pd

print("Testing Finlab data...")

with data.universe('TSE_OTC'):
    close = data.get('price:收盤價')
    print(f"\n收盤價資料日期範圍:")
    print(f"  起始日: {close.index[0]}")
    print(f"  結束日: {close.index[-1]}")
    print(f"  總交易日數: {len(close.index)}")
    print(f"\n最後 5 個交易日:")
    for date in close.index[-5:]:
        print(f"  - {date.strftime('%Y-%m-%d %A')}")
