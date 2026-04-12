"""
FinlabService - 向後相容入口

此模組已重構至 ETF/services/finlab/ 目錄。
保留此檔案以維持現有 import 路徑的相容性。
"""

# Re-export from new location for backward compatibility
from ETF.services.finlab.facade import FinlabService

# 也匯出子服務以供直接使用
from ETF.services.finlab import (
    FinlabClient,
    PriceDataService,
    OHLCVService,
    CompanyInfoService,
)

__all__ = [
    "FinlabService",
    "FinlabClient",
    "PriceDataService",
    "OHLCVService",
    "CompanyInfoService",
]
