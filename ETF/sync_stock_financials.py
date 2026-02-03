
"""
Investment Dashboard Enhancement - Stock Financials Sync
同步個股營收與股權分散數據到 Supabase

主要職責：協調器 (Orchestrator)
1. Fetcher: 獲取資料 (FinlabService)
2. Processor: 處理資料 (Processors)
3. Storage: 存儲資料 (SQLStorage)
"""
import sys
import logging
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Add ETF directory to path for imports
ETF_DIR = Path(__file__).parent
sys.path.insert(0, str(ETF_DIR))

# Load .env.local from project root
project_root = ETF_DIR.parent
env_path = project_root / '.env.local'
load_dotenv(env_path)

from services.finlab_service import FinlabService
from database.sql_storage import SQLStorage
from processors.revenue_processor import RevenueProcessor
from processors.shareholder_processor import ShareholderProcessor
from processors.broker_processor import BrokerProcessor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FinancialsSync:
    def __init__(self):
        self.finlab = FinlabService()
        self.storage = SQLStorage()
    
    def run(self, days=300):
        """執行完整同步流程"""
        logger.info("=" * 60)
        logger.info(f"開始同步個股財務與籌碼數據 (Days: {days})")
        logger.info("=" * 60)
        
        try:
            # 0. Login
            if not self.finlab.login():
                logger.error("Finlab 登入失敗")
                return

            # 1. 取得目標股票
            logger.info("正在獲取目標股票清單...")
            stock_list = self.storage.get_target_stocks('00981A')
            logger.info(f"找到 {len(stock_list)} 支成分股")
            
            if not stock_list:
                logger.error("無目標股票，中止同步")
                return
            
            # 2. 同步券商數據 (Priority)
            logger.info("--- 同步券商交易數據 ---")
            raw_buy, raw_sell, raw_close = self.finlab.get_broker_data()
            broker_records = BrokerProcessor.process(raw_buy, raw_sell, raw_close, stock_list, days=days)
            self.storage.upsert_broker_transactions(broker_records)

            # 3. 同步營收
            logger.info("--- 同步月營收數據 ---")
            raw_rev, raw_yoy, raw_mom = self.finlab.get_revenue_data()
            rev_records = RevenueProcessor.process(raw_rev, raw_yoy, raw_mom, stock_list)
            self.storage.upsert_revenue_data(rev_records)
            
            # 4. 同步股權分散
            logger.info("--- 同步股權分散數據 ---")
            raw_inv = self.finlab.get_shareholder_data()
            inv_records = ShareholderProcessor.process(raw_inv, stock_list)
            self.storage.upsert_shareholder_data(inv_records)
            
            # 5. 清除舊資料 (自動維護)
            self.storage.cleanup_old_data()
            
            logger.info("=" * 60)
            logger.info("✅ 所有數據同步完成")
            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"同步過程發生錯誤: {e}", exc_info=True)
            raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Financials Sync Process")
    parser.add_argument("--days", type=int, default=300, help="Number of days for broker data sync (default: 300)")
    args = parser.parse_args()
    
    sync = FinancialsSync()
    sync.run(days=args.days)
