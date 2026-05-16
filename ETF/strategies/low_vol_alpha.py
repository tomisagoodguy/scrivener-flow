"""LowVol Alpha YOY 低波動年增率選股策略。"""

import logging
from typing import TYPE_CHECKING

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)


class LowVolAlphaStrategy(BaseStrategy):
    """低波動 Alpha 年增率選股策略。

    在 TSE_OTC 全市場中，篩選成交金額、RSV動量、低波動、RS相對強度、
    NATR低波動、營收動能、均線多頭等條件，取年增率最大的10名。
    使用 data.universe('TSE_OTC') context，資料集獨立於共用快取。
    """

    strategy_id = "low_vol_alpha"
    description = "低波動 Alpha 年增率選股"

    def get_positions(self, cache: 'StrategyDataCache | None' = None):
        return _build_position()


def _build_position():
    from finlab import data

    with data.universe('TSE_OTC'):
        close = data.get('price:收盤價')
        amt = data.get('price:成交金額')
        rev = data.get('monthly_revenue:當月營收')
        (natr,) = data.indicator('NATR', timeperiod=120)
        rev_yoy_growth = data.get('monthly_revenue:去年同月增減(%)')

    # 技術指標
    n_std, n_rsv, n_rs, n_high = 150, 180, 100, 260

    std_rank = (
        close.pct_change(fill_method=None)
        .rolling(n_std, min_periods=int(n_std / 2))
        .std()
        .rank(axis=1, pct=True)
    )
    rsv_rank = (
        (close - close.rolling(n_rsv, min_periods=int(n_rsv / 2)).min()) /
        (close.rolling(n_rsv, min_periods=int(n_rsv / 2)).max() -
         close.rolling(n_rsv).min())
    ).rank(axis=1, pct=True)
    rs_rank = (close / close.shift(n_rs)).rank(pct=True, axis=1)
    price_to_high_rank = (
        close / close.rolling(n_high, min_periods=int(n_high / 2)).max()
    ).rank(axis=1, pct=True)

    ma5 = close.rolling(5).mean()
    ma60 = close.rolling(60).mean()
    ma240 = close.rolling(240).mean()

    # 選股條件
    position_condition = (
        (amt > 1.5 * 10**7) &
        (rsv_rank > 0.9) &
        (std_rank < 0.92) &
        (rs_rank > 0.5) &
        (natr.rank(axis=1, pct=True) < 0.65) &
        ((rev.rolling(3).mean() / rev.rolling(12).mean()).rank(pct=True, axis=1) > 0.8) &
        ma5.diff().gt(0) &
        (price_to_high_rank > 0.85) &
        (close > ma60) &
        (close > ma240) &
        (ma5 > ma60)
    )

    stocks_to_exclude = [
        '2254', '2258', '2432', '3150', '6423', '6534', '6645',
        '6757', '6771', '6794', '6854', '6873', '6902', '6949',
        '6951', '8162', '8487',
    ]

    position = rev_yoy_growth[position_condition].is_largest(10)
    positionC = position.reindex(rev.index)
    positionC[stocks_to_exclude] = False

    return positionC
