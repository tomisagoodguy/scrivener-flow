"""
OHLCV Service

負責 K 線資料獲取（從 get_ohlcv 抽離）。
"""

import logging
import pandas as pd
from typing import List

from ETF.services.finlab.client import FinlabClient

logger = logging.getLogger(__name__)


class OHLCVService:
    """
    OHLCV K 線資料服務。
    
    職責：
    - 獲取歷史 OHLCV 資料
    - 轉換為 long-format
    """
    
    def __init__(self, client: FinlabClient = None):
        self.client = client or FinlabClient()
    
    def get(self, stock_list: List[str], days: int = 250) -> pd.DataFrame:
        """
        獲取 OHLCV 資料。
        
        Args:
            stock_list: 股票代碼清單
            days: 歷史天數
            
        Returns:
            Long-format DataFrame [stock_id, date, open, high, low, close, volume, amount, margin_ratio, it_buy]
        """
        if not self.client.login():
            return pd.DataFrame()

        try:
            logger.info(f"Fetching OHLCV for {len(stock_list)} stocks, last {days} days...")
            
            all_close = self.client.get_data('close')
            if all_close.empty: 
                return pd.DataFrame()

            valid_list = [s for s in stock_list if s in all_close.columns]
            
            if not valid_list:
                logger.warning("No valid stocks found in Finlab data.")
                return pd.DataFrame()
            
            o = self.client.get_data('open')[valid_list].tail(days).stack()
            h = self.client.get_data('high')[valid_list].tail(days).stack()
            l = self.client.get_data('low')[valid_list].tail(days).stack()
            c = all_close[valid_list].tail(days).stack()
            v = self.client.get_data('volume')[valid_list].tail(days).stack()
            amt = self.client.get_data('amount')[valid_list].tail(days).stack()
            
            # 投信買賣超
            it = self.client.get_data('it_buy')
            if not it.empty and not it.columns.empty:
                valid_it_cols = [col for col in valid_list if col in it.columns]
                it_stacked = it[valid_it_cols].tail(days).stack() if valid_it_cols else pd.Series(0, index=o.index)
            else:
                it_stacked = pd.Series(0, index=o.index)
            
            # 融資使用率
            m_raw = self.client.get_data('margin_usage')
            if not m_raw.empty:
                valid_m_cols = [col for col in valid_list if col in m_raw.columns]
                m_ratio = m_raw[valid_m_cols].tail(days).stack() if valid_m_cols else pd.Series(0, index=o.index)
            else:
                m_ratio = pd.Series(0, index=o.index)

            df = pd.concat([o, h, l, c, v, amt, m_ratio, it_stacked], axis=1)
            df.columns = ['open', 'high', 'low', 'close', 'volume', 'amount', 'margin_ratio', 'it_buy']
            df.index.names = ['date', 'stock_id']
            
            df['margin_ratio'] = df['margin_ratio'].fillna(0)
            df['it_buy'] = df['it_buy'].fillna(0)
            
            logger.info(f"OHLCV fetch completed. {len(df)} records.")
            return df.reset_index()
            
        except Exception as e:
            logger.error(f"Error fetching OHLCV from Finlab: {e}")
            return pd.DataFrame()
