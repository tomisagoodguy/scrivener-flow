"""LowVol Alpha（市值版）低波動市值選股策略。"""

import logging
from typing import TYPE_CHECKING

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)


class LowVolCapStrategy(BaseStrategy):
    """低波動市值選股策略。

    在 TSE_OTC 全市場中，篩選成交金額、RSV動量、低波動、RS相對強度、
    NATR低波動、營收動能、MA5上升、價格近高點等條件，取市值最小的10名。
    使用 data.universe('TSE_OTC') context，資料集獨立於共用快取。
    """

    strategy_id = "low_vol_cap"
    description = "低波動市值選股"

    def get_positions(self, cache: 'StrategyDataCache | None' = None):
        return _build_position()


def _build_position():
    from finlab import data

    with data.universe('TSE_OTC'):
        close = data.get('price:收盤價')
        amt = data.get('price:成交金額')
        rev = data.get('monthly_revenue:當月營收')
        cap = data.get('etl:market_value')
        _natr = data.indicator('NATR', timeperiod=120)
        natr = _natr[0] if isinstance(_natr, tuple) else _natr

    # 技術指標
    n_std, n_rsv, n_rs, n_high = 150, 180, 100, 260

    std150 = (
        close.pct_change(fill_method=None)
        .rolling(n_std, min_periods=int(n_std / 2))
        .std()
        .rank(axis=1, pct=True)
    )
    rolling_min = close.rolling(n_rsv, min_periods=int(n_rsv / 2)).min()
    rolling_max = close.rolling(n_rsv, min_periods=int(n_rsv / 2)).max()
    rsv180 = ((close - rolling_min) / (rolling_max - rolling_min)).rank(axis=1, pct=True)
    rs100 = (close / close.shift(n_rs)).rank(pct=True, axis=1)
    price_to_high = (
        close / close.rolling(n_high, min_periods=int(n_high / 2)).max()
    ).rank(axis=1, pct=True)

    # 選股條件
    position_cond = (
        (amt > 1.5 * 10**7) &
        (rsv180 > 0.85) &
        (std150 < 0.92) &
        (rs100 > 0.5) &
        (natr.rank(axis=1, pct=True) < 0.65) &
        ((rev.average(3) / rev.average(12)).rank(pct=True, axis=1) > 0.8) &
        close.average(5).rise() &  # type: ignore[attr-defined]
        (price_to_high > 0.85)
    )

    stocks_to_exclude = [
        '2254', '2258', '2432', '3150', '6423', '6534', '6645',
        '6757', '6771', '6794', '6854', '6873', '6902', '6949',
        '6951', '8162', '8487',
    ]

    positionB = cap[position_cond].is_smallest(10)  # type: ignore[attr-defined]
    positionB = positionB.reindex(rev.index_str_to_date().index)  # type: ignore[attr-defined]
    positionB.loc[:, stocks_to_exclude] = False

    return positionB
