"""Super888 量化選股策略。

條件：成交金額門檻、處置股過濾、融資適中、YoY 營收前10%、
RSV(180)近高點、月增率前50%、中長期動能、均線多頭、大戶持股趨勢。
取市值最小前5名。
"""

import logging
from typing import TYPE_CHECKING

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)


class Super888Strategy(BaseStrategy):
    """Super888 量化選股策略。

    以大戶持股趨勢、營收動能、動量過濾後，取市值最小前 5 名。
    """

    strategy_id = "super888"
    description = "Super888 量化選股"

    def get_positions(self, cache: 'StrategyDataCache | None' = None):
        return _build_position(cache)


def _build_position(cache: 'StrategyDataCache | None' = None):
    from finlab import data
    from finlab.dataframe import FinlabDataFrame

    if cache is not None:
        c = cache.close
        rev = cache.rev
        yoy = cache.rev_yoy
        cyoy = cache.rev_cyoy
        margin_transaction_ratio = cache.margin_transaction_ratio
        disposal_stocks = cache.disposal_stocks
        cap_raw = cache.cap
        amt = cache.amt
        s = cache.s_holder
    else:
        c = data.get('price:收盤價')
        rev = data.get('monthly_revenue:當月營收')
        yoy = data.get('monthly_revenue:去年同月增減(%)')
        cyoy = data.get('monthly_revenue:前期比較增減(%)')
        margin_transaction_ratio = data.get('margin_transactions:融資使用率').fillna(0)
        disposal_stocks = data.get('etl:disposal_stock_filter')
        cap_raw = data.get('etl:market_value')
        amt = data.get('price:成交金額')
        inv = data.get('inventory')
        h1 = FinlabDataFrame(
            inv[inv.持股分級.astype(int) <= 4]
            .reset_index()
            .groupby(['date', 'stock_id'], observed=True)
            .agg({'持有股數': 'sum'})
            .reset_index()
            .pivot(index='date', columns='stock_id', values='持有股數')
        )
        h2 = FinlabDataFrame(
            inv[(inv.持股分級.astype(int) >= 11) & (inv.持股分級.astype(int) <= 14)]
            .reset_index()
            .groupby(['date', 'stock_id'], observed=True)
            .agg({'持有股數': 'sum'})
            .reset_index()
            .pivot(index='date', columns='stock_id', values='持有股數')
        )
        ratio = h2 / (h1 + h2)
        s = FinlabDataFrame(ratio.diff(6)).rank(axis=1, pct=True) * (c.notna())

    cap = cap_raw.rank(axis=1, pct=True)

    def rsv(n):
        return (c - c.rolling(n, int(n / 2)).min()) / (
            c.rolling(n, int(n / 2)).max() - c.rolling(n, int(n / 2)).min()
        )

    def rs(n):
        return (c / c.shift(n)).rank(pct=True, axis=1)

    def ma(n):
        return c.average(n)  # type: ignore[attr-defined]

    c1 = amt > 1.5 * 10**7
    c2 = disposal_stocks
    c3 = margin_transaction_ratio < 34
    c4 = yoy.rank(pct=True, axis=1) > 0.9
    c5 = rsv(180) > 0.9
    c6 = cyoy.rank(pct=True, axis=1) > 0.5
    c7 = (rs(150) > 0.5) & (rs(200) > 0.5)
    c8 = ma(10).rise() & ma(20).rise()  # type: ignore[attr-defined]
    c9 = s.rank(pct=True, axis=1) > 0.25

    stocks_to_exclude = [
        '2254', '2258', '2432', '3150', '6423', '6534', '6645',
        '6757', '6771', '6794', '6854', '6873', '6902', '6949',
        '6951', '8162', '8487',
    ]

    positionK = (c1 & c2 & c3 & c4 & c5 & c6 & c7 & c8 & c9) * cap
    positionK = positionK[positionK > 0].is_smallest(5)  # type: ignore[attr-defined]
    positionK[stocks_to_exclude] = False
    positionK = positionK.reindex(rev.index_str_to_date().index, method='ffill')  # type: ignore[attr-defined]

    return positionK
