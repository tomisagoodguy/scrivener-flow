"""
Finlab Client

負責 Finlab API 連線與快取管理。
"""

import os
import logging
import pandas as pd
import finlab
from finlab import data
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class FinlabClient:
    """
    Finlab API 連線與快取管理。
    
    職責：
    - API 登入
    - 資料獲取（統一介面）
    - 快取管理
    """
    
    DATA_MAP = {
        "open": "price:開盤價", 
        "high": "price:最高價", 
        "low": "price:最低價", 
        "close": "price:收盤價", 
        "volume": "price:成交股數",
        "amount": "price:成交金額",
        "foreign_buy": "institutional_investors_trading_summary:外陸資買賣超股數(不含外資自營商)",
        "it_buy": "institutional_investors_trading_summary:投信買賣超股數",
        "dealer_buy": "institutional_investors_trading_summary:自營商買賣超股數(自行買賣)",
        "margin_balance": "margin_transactions:融資今日餘額",
        "short_balance": "margin_transactions:融券今日餘額",
        "margin_usage": "margin_transactions:融資使用率",
        "short_usage": "margin_transactions:融券使用率",
        "monthly_revenue": "monthly_revenue:當月營收",
        "monthly_revenue_yoy": "monthly_revenue:去年同月增減(%)",
        'revenue_mom': 'monthly_revenue:前期比較增減(%)',
        'top15_buy': 'etl:broker_transactions:top15_buy',
        "top15_sell": "etl:broker_transactions:top15_sell",
        "market_cap": "etl:market_value",
        "day_trade_vol": "intraday_trading:當日沖銷交易成交股數",
        'gross_margin': 'fundamental_features:營業毛利率',
        'operating_margin': 'fundamental_features:營業利益率',
        'roe': 'fundamental_features:ROE稅後',
        'eps': 'financial_statement:每股盈餘',
        'company_info': 'company_basic_info',
        'inventory': 'inventory'
    }
    
    # 單例模式快取
    _instance: Optional["FinlabClient"] = None
    _cache: Dict[str, pd.DataFrame] = {}
    _logged_in: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.api_key = os.getenv("FINLAB_API_KEY")
    
    def login(self) -> bool:
        """登入 Finlab API"""
        if self._logged_in:
            return True
        try:
            finlab.login()
            self._logged_in = True
            return True
        except Exception as e:
            logger.error(f"Finlab login failed: {e}")
            return False
    
    def get_data(self, key: str) -> pd.DataFrame:
        """
        統一資料獲取介面。
        
        Args:
            key: DATA_MAP 中的 alias 或直接的 finlab 指令
            
        Returns:
            資料 DataFrame（可能為空）
        """
        finlab_cmd = self.DATA_MAP.get(key, key)
        
        if key in self._cache:
            return self._cache[key]
        
        try:
            df = data.get(finlab_cmd)
            self._cache[key] = df
            return df
        except Exception as e:
            logger.error(f"Failed to fetch data '{key}' ({finlab_cmd}): {e}")
            return pd.DataFrame()
    
    def clear_cache(self):
        """清除快取"""
        self._cache.clear()
