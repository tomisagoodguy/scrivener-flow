
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
from ETF.utils.tdcc_schedule import (
    expected_tdcc_friday,
    format_staleness_error,
    is_tdcc_data_fresh,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def _check_shareholder_freshness(upsert_result: dict, *, is_retry_run: bool = False) -> None:
    """週排程專用：FinLab 未提供新一期時中止，避免 CI 誤判成功。"""
    source_dates = upsert_result.get("source_dates") or []
    if not source_dates:
        return

    finlab_max = source_dates[-1]
    db_max = upsert_result.get("db_max_date")
    expected = expected_tdcc_friday().isoformat()

    if finlab_max >= expected:
        logger.info(
            "✅ 集保數據已同步至 FinLab 最新期 %s（TDCC 預期截止 %s）",
            finlab_max,
            expected,
        )
        return

    if upsert_result.get("written", 0) > 0:
        logger.info(
            "集保寫入 %d 筆（FinLab 最新 %s，TDCC 預期 %s；FinLab 尚未更新至預期期數）",
            upsert_result["written"],
            finlab_max,
            expected,
        )
        return

    retry_hint = (
        "週一重試仍失敗，請人工確認 FinLab 是否已更新 inventory。"
        if is_retry_run
        else "FinLab 上游延遲，週一 09:00 將自動重試 equity_weekly。"
    )
    raise RuntimeError(
        format_staleness_error(
            finlab_max=finlab_max,
            db_max=db_max,
            expected=expected,
            retry_hint=retry_hint,
        )
    )

class FinancialsSync:
    def __init__(self):
        self.finlab = FinlabService()
        self.storage = SQLStorage()
    
    def run(
        self,
        days=300,
        skip_shareholder=False,
        skip_broker=False,
        skip_revenue=False,
        skip_if_fresh=False,
        is_retry_run=False,
    ):
        """執行完整同步流程"""
        logger.info("=" * 60)
        logger.info(
            "開始同步個股財務與籌碼數據 (Days: %d, skip_shareholder=%s, skip_broker=%s, "
            "skip_revenue=%s, skip_if_fresh=%s, is_retry_run=%s)",
            days,
            skip_shareholder,
            skip_broker,
            skip_revenue,
            skip_if_fresh,
            is_retry_run,
        )
        logger.info("=" * 60)

        try:
            expected = expected_tdcc_friday().isoformat()

            if not skip_shareholder and skip_if_fresh:
                db_max = self.storage.get_max_shareholder_date()
                if is_tdcc_data_fresh(db_max):
                    logger.info(
                        "✅ 集保 DB 已至 %s（>= TDCC 預期 %s），略過 FinLab 同步",
                        db_max,
                        expected,
                    )
                    logger.info("=" * 60)
                    logger.info("✅ 所有數據同步完成（無需更新）")
                    logger.info("=" * 60)
                    return

            if not self.finlab.login():
                raise RuntimeError("Finlab 登入失敗，中止同步以避免靜默成功")

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
                raise RuntimeError("無目標股票，中止同步以避免靜默成功")

            # 2. 同步券商數據（日排程已含，週排程用 --skip-broker 跳過避免重複下載巨型資料集）
            if not skip_broker:
                logger.info("--- 同步券商交易數據 ---")
                raw_buy, raw_sell, raw_close = self.finlab.get_broker_data()
                # 防呆：抓到空券商資料（多為 FinLab 認證/配額失敗）必須中止，
                # 不可讓流程靜默寫 0 筆後回報「✅ 同步完成」、CI 綠燈、無告警
                if raw_buy.empty or raw_sell.empty:
                    raise RuntimeError(
                        "券商資料為空，疑似 FinLab 認證或配額失敗；中止同步以避免靜默成功"
                    )
                broker_records = BrokerProcessor.process(raw_buy, raw_sell, raw_close, stock_list, days=days)
                self.storage.upsert_broker_transactions(broker_records)
            else:
                logger.info("--- 跳過券商交易數據（skip_broker=True，日排程已同步）---")

            # 3. 同步營收（日排程已含，週排程用 --skip-revenue 跳過）
            if not skip_revenue:
                logger.info("--- 同步月營收數據 ---")
                raw_rev, raw_yoy, raw_mom = self.finlab.get_revenue_data()
                months = max(3, days // 30)
                rev_records = RevenueProcessor.process(raw_rev, raw_yoy, raw_mom, stock_list, months=months)
                self.storage.upsert_revenue_data(rev_records)
            else:
                logger.info("--- 跳過月營收數據（skip_revenue=True，日排程已同步）---")

            # 4. 同步股權分散（TDCC 週更新，daily 跳過，改由 equity_weekly.yml 週排程負責）
            if not skip_shareholder:
                logger.info("--- 同步股權分散數據 ---")
                raw_inv = self.finlab.get_shareholder_data()
                # 防呆：抓到空股權分散資料（多為 FinLab 配額/資料異常）必須中止，
                # 不可讓流程靜默寫 0 筆後回報「✅ 同步完成」、CI 綠燈、無告警
                if raw_inv.empty:
                    raise RuntimeError(
                        "股權分散資料為空，疑似 FinLab 配額或資料異常；中止同步以避免靜默成功"
                    )
                weeks = max(4, days // 7)
                inv_records = ShareholderProcessor.process(raw_inv, stock_list, weeks=weeks)
                upsert_result = self.storage.upsert_shareholder_data(inv_records)
                _check_shareholder_freshness(upsert_result, is_retry_run=is_retry_run)
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
    parser.add_argument("--skip-revenue", action="store_true", help="Skip revenue sync (already synced by daily workflow, use in weekly shareholder-only runs)")
    parser.add_argument(
        "--skip-if-fresh",
        action="store_true",
        help="Skip shareholder sync when DB already has expected TDCC week (Monday retry mode)",
    )
    parser.add_argument(
        "--retry-run",
        action="store_true",
        help="Mark as Monday auto-retry run (stricter failure message if FinLab still lags)",
    )
    args = parser.parse_args()

    sync = FinancialsSync()
    sync.run(
        days=args.days,
        skip_shareholder=args.skip_shareholder,
        skip_broker=args.skip_broker,
        skip_revenue=args.skip_revenue,
        skip_if_fresh=args.skip_if_fresh,
        is_retry_run=args.retry_run,
    )
