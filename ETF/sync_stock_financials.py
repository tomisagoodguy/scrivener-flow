
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

# Add project root to path for imports to enable 'from ETF.xxx import yyy'
ETF_DIR = Path(__file__).parent
project_root = ETF_DIR.parent
sys.path.insert(0, str(project_root))

# Load .env.local from project root
env_path = project_root / '.env.local'
load_dotenv(env_path)

from ETF.services.finlab_service import FinlabService
from ETF.database.sql_storage import SQLStorage
from ETF.processors.revenue_processor import RevenueProcessor
from ETF.processors.shareholder_processor import ShareholderProcessor
from ETF.processors.broker_processor import BrokerProcessor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FinancialsSync:
    def __init__(self):
        self.finlab = FinlabService()
        self.storage = SQLStorage()
    
    def run(self, days=300, skip_shareholder=False, skip_broker=False):
        """執行完整同步流程"""
        logger.info("=" * 60)
        logger.info(f"開始同步個股財務與籌碼數據 (Days: {days}, skip_shareholder={skip_shareholder}, skip_broker={skip_broker})")
        logger.info("=" * 60)

        try:
            # 0. Login
            if not self.finlab.login():
                logger.error("Finlab 登入失敗")
                return

            # 1. 取得目標股票（ETF 成分股 + 策略命中強勢股）
            logger.info("正在獲取目標股票清單...")
            etf_stocks = self.storage.get_all_target_stocks()
            strategy_stocks = self.storage.get_strategy_hit_stocks()
            stock_list = list(set(etf_stocks + strategy_stocks))
            logger.info(
                f"找到 {len(stock_list)} 支目標股票"
                f"（ETF: {len(etf_stocks)}, 策略強勢股: {len(strategy_stocks)}, 去重後: {len(stock_list)}）"
            )

            if not stock_list:
                logger.error("無目標股票，中止同步")
                return

            # 2. 同步券商數據（日排程已含，週排程用 --skip-broker 跳過避免重複下載巨型資料集）
            if not skip_broker:
                logger.info("--- 同步券商交易數據 ---")
                raw_buy, raw_sell, raw_close = self.finlab.get_broker_data()
                broker_records = BrokerProcessor.process(raw_buy, raw_sell, raw_close, stock_list, days=days)
                self.storage.upsert_broker_transactions(broker_records)
            else:
                logger.info("--- 跳過券商交易數據（skip_broker=True，日排程已同步）---")

            # 3. 同步營收
            logger.info("--- 同步月營收數據 ---")
            raw_rev, raw_yoy, raw_mom = self.finlab.get_revenue_data()
            months = max(3, days // 30)
            rev_records = RevenueProcessor.process(raw_rev, raw_yoy, raw_mom, stock_list, months=months)
            self.storage.upsert_revenue_data(rev_records)

            # 4. 同步股權分散（TDCC 週更新，daily 跳過，改由 equity_weekly.yml 週排程負責）
            if not skip_shareholder:
                logger.info("--- 同步股權分散數據 ---")
                raw_inv = self.finlab.get_shareholder_data()
                weeks = max(4, days // 7)
                inv_records = ShareholderProcessor.process(raw_inv, stock_list, weeks=weeks)
                self.storage.upsert_shareholder_data(inv_records)
            else:
                logger.info("--- 跳過股權分散數據（skip_shareholder=True）---")

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
    parser.add_argument("--skip-shareholder", action="store_true", help="Skip raw shareholder sync (TDCC weekly data, handled by equity_weekly.yml)")
    parser.add_argument("--skip-broker", action="store_true", help="Skip broker transaction sync (large dataset, already synced by daily workflow)")
    args = parser.parse_args()

    sync = FinancialsSync()
    sync.run(days=args.days, skip_shareholder=args.skip_shareholder, skip_broker=args.skip_broker)
