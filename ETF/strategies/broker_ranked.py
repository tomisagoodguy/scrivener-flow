"""BrokerTransactionRanked 券商籌碼排名選股策略。"""

import logging
from typing import TYPE_CHECKING

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)


class BrokerRankedStrategy(BaseStrategy):
    """券商籌碼排名選股策略。

    選股條件：成交金額、營收動能、主力籌碼強度、RSV+RS動量、
    均線多頭、大戶比例、價格位置+共移性，取市值最小的10名。
    """

    strategy_id = "broker_ranked"
    description = "券商籌碼排名選股"

    def get_positions(self, cache: 'StrategyDataCache | None' = None):
        return _build_position(cache)


def _build_position(cache: 'StrategyDataCache | None' = None):
    from finlab import data

    # 從 cache 取基礎資料
    if cache is not None:
        close = cache.close
        rev = cache.rev
        cap = cache.cap
        disposal_stocks = cache.disposal_stocks
        buy_vol = cache.buy_vol
        sell_vol = cache.sell_vol
        s_holder = cache.s_holder  # 大戶比例變化（h1≤4, h2:11-14，與 capital_layer 相同）
        benchmark = cache.benchmark
        amt = cache.amt
    else:
        from finlab.dataframe import FinlabDataFrame
        close = data.get('price:收盤價')
        rev = data.get('monthly_revenue:當月營收')
        cap = data.get('etl:market_value')
        disposal_stocks = data.get('etl:disposal_stock_filter')
        buy_vol = data.get('etl:broker_transactions:top15_buy').fillna(0)
        sell_vol = data.get('etl:broker_transactions:top15_sell').fillna(0)
        inv = data.get('inventory')
        h1 = FinlabDataFrame(
            inv[inv.持股分級.astype(int) <= 4]
            .reset_index().groupby(['date', 'stock_id'], observed=True)
            .agg({'持有股數': 'sum'}).reset_index()
            .pivot(index='date', columns='stock_id', values='持有股數')
        )
        h2 = FinlabDataFrame(
            inv[(inv.持股分級.astype(int) >= 11) & (inv.持股分級.astype(int) <= 14)]
            .reset_index().groupby(['date', 'stock_id'], observed=True)
            .agg({'持有股數': 'sum'}).reset_index()
            .pivot(index='date', columns='stock_id', values='持有股數')
        )
        ratio = h2 / (h1 + h2)
        s_holder = FinlabDataFrame(ratio.diff(6)).rank(axis=1, pct=True) * (close.notna())
        benchmark = data.get('benchmark_return:發行量加權股價報酬指數').iloc[:, 0]
        amt = data.get('price:成交金額')

    # 技術指標（閉包 close / benchmark）
    def rsv(n):
        lo = close.rolling(n, min_periods=int(n / 2)).min()
        hi = close.rolling(n, min_periods=int(n / 2)).max()
        return ((close - lo) / (hi - lo)).rank(pct=True, axis=1)

    def rs(n):
        return (close / close.shift(n)).rank(pct=True, axis=1)

    def conv(n):
        import pandas as pd
        bm: pd.Series = pd.Series(benchmark)
        return (
            (close / close.shift(n) - 1) * (bm / bm.shift(n) - 1)
        ).rank(axis=1, pct=True)

    def price_to_high(n):
        high_ = close.rolling(n, min_periods=int(n / 2)).max()
        return (close / high_).rank(axis=1, pct=True)

    # 主力籌碼（排除 ETF 槓桿/反向：尾碼 L/B）
    net_volume = (buy_vol - sell_vol) * close
    force = net_volume.rolling(60).mean() / net_volume.rolling(60).std()
    force = force[force.columns[~force.columns.str[-1].isin(['L', 'B'])]]

    # 選股條件
    c1 = amt > 1.5 * 10**7
    c2 = (rev.average(3) / rev.average(12)).rank(pct=True, axis=1) > 0.8  # type: ignore[operator]
    c3 = force.rank(pct=True, axis=1) > 0.8
    c4 = (rsv(200) > 0.85) & (rs(150) > 0.65)
    c5 = (
        close.rolling(5).mean().rise() &  # type: ignore[operator]
        (close > close.rolling(5).mean()) &
        (close.rolling(5).mean() / close.rolling(20).mean() > 1)
    )
    c6 = s_holder.rank(pct=True, axis=1) > 0.3
    c7 = (price_to_high(240) + conv(60)) > 0.8

    stocks_to_exclude = [
        '2254', '2258', '2432', '3150', '6423', '6534', '6645',
        '6757', '6771', '6794', '6854', '6873', '6902', '6949',
        '6951', '8162', '8487',
    ]

    positionG = (c1 & c2 & c3 & c4 & c5 & c6 & c7 & disposal_stocks) * cap
    positionG = positionG[positionG > 0].is_smallest(10)  # type: ignore[attr-defined]
    positionG[stocks_to_exclude] = False
    positionG = positionG.reindex(rev.index_str_to_date().index)  # type: ignore[operator]

    return positionG
