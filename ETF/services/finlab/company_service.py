"""
Company Info Service

負責公司基本資訊獲取（從 get_company_info 抽離）。
"""

import logging
import pandas as pd
from typing import List

from ETF.services.finlab.client import FinlabClient

logger = logging.getLogger(__name__)


class CompanyInfoService:
    """
    公司基本資訊服務。
    
    職責：
    - 獲取公司簡稱、全名、產業類別
    """
    
    def __init__(self, client: FinlabClient = None):
        self.client = client or FinlabClient()
    
    def get(self, stock_list: List[str]) -> pd.DataFrame:
        """
        獲取公司基本資訊。
        
        Args:
            stock_list: 股票代碼清單
            
        Returns:
            DataFrame [stock_code, name_short, name_full, industry]
        """
        if not self.client.login():
            return pd.DataFrame()

        try:
            logger.info(f"Fetching company info for {len(stock_list)} stocks...")
            
            df = self.client.get_data('company_info')
            
            if df.empty:
                return pd.DataFrame()
            
            # 篩選欄位
            target_cols = ["stock_id", "公司簡稱", "公司名稱", "產業類別"]
            df = df[target_cols]
            
            # 重新命名
            df = df.rename(columns={
                "stock_id": "stock_code",
                "公司簡稱": "name_short",
                "公司名稱": "name_full",
                "產業類別": "industry"
            })
            
            # 篩選股票清單
            df['stock_code'] = df['stock_code'].astype(str).str.strip()
            df = df[df['stock_code'].isin([str(s).strip() for s in stock_list])]
            
            logger.info(f"Company info fetch completed. {len(df)} records.")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching company info from Finlab: {e}")
            return pd.DataFrame()
