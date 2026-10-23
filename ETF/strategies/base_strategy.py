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

    def get_signal_metadata(
        self, cache: 'StrategyDataCache | None' = None
    ) -> dict[str, dict] | None:
        """（選用）回傳最新交易日入選股的中繼資料，由 StrategySignalStep 寫入 conditions。

        StrategySignalStep 在 get_positions 之後呼叫；策略可在 get_positions 內把中間
        結果存在實例上重用，避免重算。預設不提供中繼資料（conditions 維持 null）。

        Args:
            cache: 跨策略共用資料快取，與 get_positions 傳入的相同。

        Returns:
            dict[stock_id, dict]（值須可 JSON 序列化），或 None 表示無中繼資料。
            不在 dict 內的股票 conditions 為 null。
        """
        return None
