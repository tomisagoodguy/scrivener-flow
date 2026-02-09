"""Debug script to test strategy with full error traceback"""
import logging
import traceback
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from ETF.strategies.low_vol_alpha import LowVolAlphaStrategy

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

if __name__ == '__main__':
    strategy = LowVolAlphaStrategy()
    try:
        selected_df, date_str = strategy.run_selection()
        print(f"\n{'='*80}")
        print(f"📊 {strategy.strategy_name} - {date_str}")
        print(f"{'='*80}\n")
        if not selected_df.empty:
            print(selected_df.to_string(index=False))
        print(f"\n{'='*80}\n")
    except Exception as e:
        print(f"\n❌ 錯誤: {e}\n")
        traceback.print_exc()
        sys.exit(1)
