"""
Finlab Services Module

拆分後的 FinlabService，以 Facade 模式保持向後相容。
"""

from ETF.services.finlab.client import FinlabClient
from ETF.services.finlab.price_service import PriceDataService
from ETF.services.finlab.ohlcv_service import OHLCVService
from ETF.services.finlab.company_service import CompanyInfoService
from ETF.services.finlab.facade import FinlabService

__all__ = [
    "FinlabClient",
    "PriceDataService",
    "OHLCVService",
    "CompanyInfoService",
    "FinlabService",
]
