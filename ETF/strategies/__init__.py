"""策略 Registry — 所有啟用策略的統一清單。

新增策略只需：
1. 建立繼承 BaseStrategy 的類別
2. 在此 append 實例至 ALL_STRATEGIES
"""

from ETF.strategies.base_strategy import BaseStrategy
from ETF.strategies.super8888 import Super8888Strategy

ALL_STRATEGIES: list[BaseStrategy] = [
    Super8888Strategy(),
]
