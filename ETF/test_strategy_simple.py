"""Simple ASCII test script"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from pathlib import Path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from ETF.strategies.low_vol_alpha import LowVolAlphaStrategy
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

strategy = LowVolAlphaStrategy()
selected_df, date_str = strategy.run_selection()

print(f"\n{'='*80}")
print(f"Strategy: {strategy.strategy_name}")
print(f"Date: {date_str}")
print(f"{'='*80}\n")

if not selected_df.empty:
    print(selected_df.to_string(index=False))
    print(f"\nTotal selected: {len(selected_df)} stocks")
else:
    print("No stocks selected")

print(f"\n{'='*80}\n")
