"""
測試策略選股 + 資料庫寫入的完整流程
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from ETF.strategies.low_vol_alpha import LowVolAlphaStrategy
from ETF.database.sql_storage import SQLStorage
import logging
from dotenv import load_dotenv

# 載入環境變數 (支援 .env.local)
env_path = project_root / '.env.local'
if env_path.exists():
    load_dotenv(env_path)
    print(f"Loaded .env.local from {env_path}")
else:
    print(f".env.local not found at {env_path}")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """測試完整流程"""
    import finlab
    import os
    finlab.login(os.getenv("FINLAB_API_KEY"))
    
    # Step 1: 執行策略選股
    logger.info("=" * 80)
    logger.info("Step 1: 執行策略選股")
    logger.info("=" * 80)
    
    strategy = LowVolAlphaStrategy()
    selected_df, data_date = strategy.run_selection()
    
    if selected_df.empty:
        logger.error("❌ 選股結果為空")
        return
    
    logger.info(f"✅ 選出 {len(selected_df)} 檔股票")
    logger.info(f"📅 資料日期: {data_date}")
    print("\n選股結果:")
    print(selected_df[['stock_code', 'rank_position', 'close_price', 'revenue_yoy']].to_string(index=False))
    
    logger.info("\n" + "=" * 80)
    logger.info("Step 2: 寫入策略持股到資料庫")
    logger.info("=" * 80)
    
    storage = SQLStorage()
    storage.upsert_strategy_holdings(
        strategy_code=strategy.strategy_code,
        data_date=data_date,  # data_date 已經是字串格式 'YYYY-MM-DD'
        holdings_df=selected_df
    )
    
    # Step 3: 檢測異動
    logger.info("\n" + "=" * 80)
    logger.info("Step 3: 檢測持股異動")
    logger.info("=" * 80)
    
    changes = storage.detect_strategy_changes(
        strategy_code=strategy.strategy_code,
        current_date=data_date  # data_date 已經是字串格式
    )
    
    if changes:
        logger.info(f"📊 檢測到 {len(changes)} 筆異動:")
        for change in changes:
            change_type = change['change_type']
            stock_code = change['stock_code']
            
            if change_type == 'IN':
                logger.info(f"  🆕 新進: {stock_code} (排名: {change.get('new_rank', 'N/A')})")
            elif change_type == 'OUT':
                logger.info(f"  ❌移除: {stock_code} (原排名: {change.get('prev_rank', 'N/A')})")
            else:
                logger.info(f"  🔄 變動: {stock_code}")
        
        # 記錄異動
        storage.log_strategy_changes(changes)
    else:
        logger.info("📋 無持股異動")
    
    # Step 4: 驗證資料庫內容
    logger.info("\n" + "=" * 80)
    logger.info("Step 4: 驗證資料庫內容")
    logger.info("=" * 80)
    
    from sqlalchemy import text
    with storage.engine.connect() as conn:
        # 檢查持股記錄
        result = conn.execute(text("""
            SELECT data_date, COUNT(*) as stock_count
            FROM strategy_daily_holdings
            WHERE strategy_code = 'low_vol_alpha_yoy'
            GROUP BY data_date
            ORDER BY data_date DESC
            LIMIT 5
        """))
        
        logger.info("最近 5 天的持股記錄:")
        for row in result:
            logger.info(f"  {row[0]}: {row[1]} 檔股票")
    
    logger.info("\n" + "=" * 80)
    logger.info("✅ 測試完成！")
    logger.info("=" * 80)

if __name__ == '__main__':
    main()
