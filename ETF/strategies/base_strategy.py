"""BaseStrategy 抽象類別 — 所有量化策略的基礎介面。"""

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

import pandas as pd

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache


class BaseStrategy(ABC):
    """量化策略抽象基底類別。

    每個具體策略須提供：
    - strategy_id: 唯一 kebab-case 識別字串
    - description: 前端顯示用的人類可讀名稱
    - get_positions(cache): 回傳 FinlabDataFrame（index=date, columns=stock_id）
    """

    strategy_id: str
    description: str

    @abstractmethod
    def get_positions(self, cache: 'StrategyDataCache | None' = None) -> pd.DataFrame | None:
        """回傳持倉 DataFrame（Boolean 或 numeric）。

        Args:
            cache: 跨策略共用資料快取，None 時策略自行下載所需資料。

        Returns:
            FinlabDataFrame，index 為 DatetimeIndex，columns 為 stock_id，
            值為 True/False 或 numeric（> 0 代表持有）。
        """
