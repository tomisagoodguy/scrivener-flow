"""Capital Layer 多層篩選量化選股策略。"""

import logging
import numpy as np
from typing import TYPE_CHECKING

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)


class CapitalLayerStrategy(BaseStrategy):
    """Capital Layer 多層籌碼選股策略。

    選股條件：成交活躍度、營收動能、年增率、RSV強度、均線多頭排列、
    60日動量、融資適中。透過五層篩選（營收成長→大戶籌碼→主力強度→
    動量調整→市值），最終取市值最小的 8 名。
    """

    strategy_id = "capital_layer"
    description = "Capital Layer 多層籌碼選股"

    def get_positions(self, cache: 'StrategyDataCache | None' = None):
        return _build_position(cache)


def _build_position(cache: 'StrategyDataCache | None' = None):
    import talib
    from finlab import data

    # 從 cache 取基礎資料
    if cache is not None:
        close = cache.close
        high = cache.high
        low = cache.low
        rev = cache.rev
        cap = cache.cap
        amt = cache.amt
        v = cache.v
        margin_transaction_ratio = cache.margin_transaction_ratio
        disposal_stocks = cache.disposal_stocks
        buy_vol = cache.buy_vol
        sell_vol = cache.sell_vol
        s_holder = cache.s_holder  # 大戶比例變化（h1≤4, h2:11-14，與 broker_ranked 相同）
        yoy = cache.rev_yoy
    else:
        from finlab.dataframe import FinlabDataFrame
        close = data.get('price:收盤價')
        high = data.get("price:最高價")
        low = data.get("price:最低價")
        rev = data.get('monthly_revenue:當月營收')
        cap = data.get('etl:market_value')
        amt = data.get('price:成交金額')
        v = data.get("price:成交股數")
        margin_transaction_ratio = data.get('margin_transactions:融資使用率').fillna(0)
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
        yoy = data.get('monthly_revenue:去年同月增減(%)')

    # 主力籌碼強度指標
    net_volume = (buy_vol - sell_vol) * close
    force = (
        net_volume.rolling(60, min_periods=30).mean() /
        net_volume.rolling(60, min_periods=30).std()
    )

    # RSV 指標（未成熟隨機值）
    def rsv(n):
        lo = close.rolling(n, min_periods=int(n / 2)).min()
        hi = close.rolling(n, min_periods=int(n / 2)).max()
        return ((close - lo) / (hi - lo)).rank(pct=True, axis=1)

    # 選股條件
    c1 = (amt > 1.5 * 10**7) & ((amt / cap).rolling(5).mean().rise())  # type: ignore[attr-defined]
    c2 = (rev.average(3) / rev.average(12)).rank(pct=True, axis=1) > 0.8  # type: ignore[attr-defined]
    c3 = yoy.rank(pct=True, axis=1) > 0.85
    c4 = rsv(180) > 0.9
    c5 = (
        (close > close.average(5)) &  # type: ignore[attr-defined]
        (close.average(5) > close.average(20)) &  # type: ignore[attr-defined]
        close.average(20).rise()  # type: ignore[attr-defined]
    )
    c6 = (
        close.rolling(60).mean()
        .pipe(lambda df: df / df.shift(60) - 1)
        .rank(pct=True, axis=1)
    ) > 0.5
    c7 = margin_transaction_ratio < 34

    conditions = c1 & c2 & c3 & c4 & c5 & c6 & c7 & disposal_stocks

    stocks_to_exclude = [
        '2254', '2258', '2432', '3150', '6423', '6534', '6645',
        '6757', '6771', '6794', '6854', '6873', '6902', '6949',
        '6951', '8162', '8487',
    ]
    conditions[stocks_to_exclude] = False

    # 營收成長斜率（線性回歸斜率÷截距）
    def rev_growth_func(series):
        slope = talib.LINEARREG_SLOPE(series, timeperiod=12)
        intercept = talib.LINEARREG_INTERCEPT(series, timeperiod=12)
        return slope / intercept

    rev_growth = rev.apply(rev_growth_func)

    # 第一層：營收成長前100名
    positionH = rev_growth * conditions
    positionH = positionH[positionH > 0].is_largest(100)  # type: ignore[attr-defined]

    # 第二層：大戶籌碼前50名
    positionH = s_holder * positionH
    positionH = positionH[positionH > 0].is_largest(50)  # type: ignore[attr-defined]

    # 第三層：主力強度前20名
    positionH = force * positionH
    positionH = positionH[positionH > 0].is_largest(20)  # type: ignore[attr-defined]

    # 第四層：動量調整前15名（Parkinson 波動率修正）
    m = v.rolling(60).sum()
    log_hl_sq = (high / low).transform(np.log) ** 2  # type: ignore[union-attr]
    parkinson_vol = np.sqrt((1 / (4 * np.log(2))) * log_hl_sq.rolling(60).mean())  # type: ignore[union-attr]
    s_momentum = close / close.shift(60) - 1
    positionH = ((s_momentum * m) / parkinson_vol) * positionH
    positionH = positionH[positionH > 0].is_largest(15)  # type: ignore[attr-defined]

    # 第五層：市值最小8名
    positionH = cap * positionH
    positionH = positionH[positionH > 0].is_smallest(8)  # type: ignore[attr-defined]

    positionH = positionH.reindex(rev.index_str_to_date().index)  # type: ignore[attr-defined]
    return positionH
