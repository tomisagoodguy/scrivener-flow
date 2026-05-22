"""
FinlabService Facade

保持向後相容的 Facade，委派至專責服務。
"""

import logging
import pandas as pd
from typing import List, Optional

from ETF.services.finlab.client import FinlabClient
from ETF.services.finlab.price_service import PriceDataService
from ETF.services.finlab.ohlcv_service import OHLCVService
from ETF.services.finlab.company_service import CompanyInfoService

logger = logging.getLogger(__name__)


class FinlabService:
    """
    FinlabService Facade。
    
    保持原有 API 簽章，內部委派至專責服務以維持向後相容。
    """
    
    # 繼承 DATA_MAP 以供舊程式碼使用
    DATA_MAP = FinlabClient.DATA_MAP
    
    def __init__(self, stock_list: Optional[List[str]] = None):
        self.stock_list = stock_list or ["00981"]
        self.client = FinlabClient()
        self._price_service = None
        self._ohlcv_service = None
        self._company_service = None
        
        # 相容性屬性
        self.all_data = {}
        self.raw_cache = self.client._cache
        self.params = {'max_data_days': 2500}
    
    @property
    def price_service(self) -> PriceDataService:
        if self._price_service is None:
            self._price_service = PriceDataService(self.client)
        return self._price_service
    
    @property
    def ohlcv_service(self) -> OHLCVService:
        if self._ohlcv_service is None:
            self._ohlcv_service = OHLCVService(self.client)
        return self._ohlcv_service
    
    @property
    def company_service(self) -> CompanyInfoService:
        if self._company_service is None:
            self._company_service = CompanyInfoService(self.client)
        return self._company_service
    
    def login(self) -> bool:
        """API 登入（委派至 Client）"""
        return self.client.login()
    
    def _get_data(self, key: str) -> pd.DataFrame:
        """統一資料獲取（委派至 Client）"""
        return self.client.get_data(key)
    
    def attach_prices(self, df: pd.DataFrame, date_str: str) -> pd.DataFrame:
        """附加價格資料（委派至 PriceDataService）"""
        return self.price_service.attach(df, date_str)
    
    def get_ohlcv(self, stock_list: List[str], days: int = 250) -> pd.DataFrame:
        """獲取 OHLCV 資料（委派至 OHLCVService）"""
        return self.ohlcv_service.get(stock_list, days)
    
    def get_company_info(self, stock_list: List[str]) -> pd.DataFrame:
        """獲取公司資訊（委派至 CompanyInfoService）"""
        return self.company_service.get(stock_list)
    
    def get_revenue_data(self):
        """獲取營收資料（保持相容）"""
        return (
            self._get_data('monthly_revenue'),
            self._get_data('monthly_revenue_yoy'),
            self._get_data('revenue_mom')
        )

    def get_shareholder_data(self):
        """獲取股權分布資料（保持相容）"""
        return self._get_data('inventory')

    def get_broker_data(self):
        """獲取券商買賣超資料（保持相容）"""
        return (
            self._get_data('top15_buy'),
            self._get_data('top15_sell'),
            self._get_data('close')
        )
    
    def preload_market_data(self):
        """預加載市場資料（保持相容，但標記為 deprecated）"""
        logger.warning("preload_market_data() is deprecated. Use specific services instead.")
        # 保持原有功能但簡化
        if not self.login():
            return
        
        for name in self.DATA_MAP:
            full_df = self._get_data(name)
            if not full_df.empty and self.stock_list:
                valid_stocks = [s for s in self.stock_list if s in full_df.columns]
                if valid_stocks:
                    self.all_data[name] = full_df[valid_stocks]
