import pandas as pd
import pathlib

def inspect():
    path = pathlib.Path(r"c:\Users\user\Documents\GitHub\scrivener-flow\ETF\history\raw_00981A_1769861606.xlsx")
    print(f"Reading {path}...")
    try:
        df = pd.read_excel(path, header=None)
        print("First 20 rows:")
        print(df.head(20).to_string())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
