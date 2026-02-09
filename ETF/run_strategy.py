"""
策略執行腳本 - 執行量化選股並寫入資料庫

Usage:
    python ETF/run_strategy.py --strategy low_vol_alpha_yoy
"""

import logging
import argparse
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from ETF.strategies.low_vol_alpha import LowVolAlphaStrategy
from ETF.database.sql_storage import SQLStorage
from ETF.notifiers.line_notifier import LineNotifier

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description='Execute quantitative strategy selection')
    parser.add_argument('--strategy', default='low_vol_alpha_yoy', help='Strategy code to run')
    parser.add_argument('--notify', action='store_true', help='Send LINE notification for changes')
    args = parser.parse_args()
    
    logger.info(f"🚀 開始執行策略: {args.strategy}")
    
    # 初始化
    storage = SQLStorage()
    strategy = LowVolAlphaStrategy()
    
    if args.notify:
        notifier = LineNotifier()
    
    # 執行選股
    try:
        selected_df, data_date = strategy.run_selection()
        
        if selected_df.empty:
            logger.warning("⚠️  今日無符合條件的股票，跳過資料庫寫入")
            return
        
        # 顯示選股結果
        logger.info(f"\n{'='*80}")
        logger.info(f"📊 選股結果 ({data_date})")
        logger.info(f"{'='*80}\n")
        for _, row in selected_df.iterrows():
            logger.info(
                f"#{row['rank_position']:2d} {row['stock_code']} | "
                f"價格: ${row['close_price']:.2f} | "
                f"營收YoY: {row['revenue_yoy']:.1f}% | "
                f"營收MoM: {row['revenue_mom']:.1f}%"
            )
        logger.info(f"{'='*80}\n")
        
        # 儲存結果到資料庫
        logger.info("寫入資料庫...")
        storage.upsert_strategy_holdings(
            strategy_code=strategy.strategy_code,
            data_date=data_date,
            holdings_df=selected_df
        )
        
        # 分析異動並記錄
        logger.info("分析持股異動...")
        changes = storage.detect_strategy_changes(
            strategy_code=strategy.strategy_code,
            current_date=data_date
        )
        
        if changes:
            logger.info(f"檢測到 {len(changes)} 筆持股異動")
            storage.log_strategy_changes(changes)
            
            # 發送 LINE 通知（若啟用）
            if args.notify:
                logger.info("發送 LINE 異動通知...")
                notifier.notify_strategy_changes(
                    strategy_name=strategy.strategy_name,
                    changes=changes,
                    date_str=data_date
                )
        else:
            logger.info("✅ 持股無異動")
        
        logger.info("✅ 策略執行完成")
        
    except Exception as e:
        logger.error(f"❌ 策略執行失敗: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
