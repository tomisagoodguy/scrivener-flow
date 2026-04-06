"""
Pipeline Context

Pipeline 執行過程中各步驟共享的狀態容器。
"""

import argparse
import pathlib
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

import pandas as pd


@dataclass
class PipelineContext:
    """
    Pipeline 上下文，步驟間共享狀態。
    
    Attributes:
        args: argparse 解析結果
        output_dir: 輸出目錄
        etf_code: ETF 代碼
        df: 持股 DataFrame
        date_str: 資料日期字串
        diff_logs: 異動事件列表
        is_dry_run: 是否為乾跑模式
        is_ci: 是否在 CI 環境執行
    """
    # 必要參數
    args: argparse.Namespace
    output_dir: pathlib.Path
    
    # ETF 識別
    etf_code: str = "00981A"
    
    # 執行過程中動態更新的狀態
    df: Optional[pd.DataFrame] = None
    date_str: str = ""
    diff_logs: Optional[List[Dict[str, Any]]] = None
    secondary_stock_codes: List[str] = field(default_factory=list)  # 00980A/00991A 成分股代碼
    
    # 執行標誌
    is_dry_run: bool = False
    is_ci: bool = False
    force_run: bool = False
    
    # 服務實例 (步驟可共享)
    _storage: Any = field(default=None, repr=False)
    _notifier: Any = field(default=None, repr=False)
    _finlab_srv: Any = field(default=None, repr=False)
    _sql_storage: Any = field(default=None, repr=False)
    
    @property
    def storage(self):
        """延遲初始化 ETFStorage"""
        if self._storage is None:
            from ETF.database.storage import ETFStorage
            self._storage = ETFStorage()
        return self._storage
    
    @property
    def notifier(self):
        """延遲初始化 LineNotifier"""
        if self._notifier is None:
            import os
            from dotenv import load_dotenv
            from ETF.notifiers.line_notifier import LineNotifier
            
            # Load env vars to check for specific bot config
            if os.path.exists('.env.local'):
                load_dotenv('.env.local')
            else:
                load_dotenv()

            # Prioritize STOCK_ specific bot
            if os.getenv("STOCK_LINE_CHANNEL_ACCESS_TOKEN"):
                self._notifier = LineNotifier(
                    token_env="STOCK_LINE_CHANNEL_ACCESS_TOKEN", 
                    user_id_env="STOCK_LINE_USER_ID"
                )
            else:
                # Fallback to default
                self._notifier = LineNotifier()
        return self._notifier
    
    @property
    def finlab_srv(self):
        """延遲初始化 FinlabService"""
        if self._finlab_srv is None:
            from ETF.services.finlab_service import FinlabService
            stock_list = self.df['code'].tolist() if self.df is not None else []
            self._finlab_srv = FinlabService(stock_list=stock_list)
        return self._finlab_srv
    
    @property
    def sql_storage(self):
        """延遲初始化 SQLStorage"""
        if self._sql_storage is None:
            from ETF.database.sql_storage import SQLStorage
            self._sql_storage = SQLStorage()
        return self._sql_storage
    
    def update_finlab_stock_list(self):
        """
        當 df 更新後，重新初始化 FinlabService
        同時合併策略選股的股票，確保這些股票也有完整的歷史資料
        """
        stock_list = []
        
        # 1. 加入 ETF 持股
        if self.df is not None:
            stock_list.extend(self.df['code'].tolist())
        
        # 2. 加入策略選股（從資料庫讀取最近 3 個月的策略股票）
        try:
            strategy_stocks = self._get_strategy_tracked_stocks()
            stock_list.extend(strategy_stocks)
        except Exception as e:
            # 如果查詢失敗，不影響主流程
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"無法載入策略股票清單: {e}")
        
        # 3. 去重並初始化
        if stock_list:
            stock_list = list(set(stock_list))  # 去重
            from ETF.services.finlab_service import FinlabService
            self._finlab_srv = FinlabService(stock_list=stock_list)
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"📋 Finlab 追蹤清單已更新: {len(stock_list)} 檔股票 "
                       f"(ETF持股 + 策略選股)")
    
    def _get_strategy_tracked_stocks(self) -> list:
        """從資料庫讀取最近 3 個月的策略選股股票"""
        from sqlalchemy import text
        
        with self.sql_storage.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT DISTINCT stock_code
                FROM strategy_daily_holdings
                WHERE data_date >= CURRENT_DATE - INTERVAL '3 months'
                ORDER BY stock_code
            """))
            return [row[0] for row in result.fetchall()]
