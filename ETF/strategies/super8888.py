"""超級8888量化選股策略。

從 super8888_draft.py 整合而來。每日選出符合所有條件的前 5 支個股。
"""

import logging
import numpy as np
from typing import TYPE_CHECKING

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)


class Super8888Strategy(BaseStrategy):
    """超級8888 量化選股策略。

    選股條件：成交量突破、200日新高、營收加速、蠟燭低波動、
    融資適中、營收持續成長、無近期新低、去年同月正成長，
    加上大戶持股、動量調整周轉率、風險調整指標，取前5名。
    """

    strategy_id = "super8888"
    description = "超級8888 量化選股"

    def get_positions(self, cache: 'StrategyDataCache | None' = None):
        return _build_position(cache)


def _build_position(cache: 'StrategyDataCache | None' = None):
    from finlab import data
    from finlab.dataframe import FinlabDataFrame

    # 從 cache 取基礎資料，cache 無則自行下載
    if cache is not None:
        c = cache.close
        v = cache.v
        rev = cache.rev
        cap = cache.cap
        margin_transaction_ratio = cache.margin_transaction_ratio
        amt = cache.amt
        disposal_stocks = cache.disposal_stocks
        inv = cache.inv
        volatility = cache.candle_volatility
        rev_year_growth = cache.rev_yoy
        share = cache.share
    else:
        c = data.get("price:收盤價")
        v = data.get("price:成交股數")
        rev = data.get('monthly_revenue:當月營收')
        cap = data.get('etl:market_value')
        margin_transaction_ratio = data.get('margin_transactions:融資使用率').fillna(0)
        amt = data.get('price:成交金額')
        disposal_stocks = data.get('etl:disposal_stock_filter')
        inv = data.get('inventory')
        volatility = _compute_candle_volatility(c)
        rev_year_growth = data.get('monthly_revenue:去年同月增減(%)')
        share = data.get('financial_statement:普通股股本')

    v = v / 1000

    # 股東持股結構（super8888 使用 ≤5 / 11-15，與其他策略不同，獨立計算）
    h1 = FinlabDataFrame(
        inv[inv.持股分級.astype(int) <= 5]
        .reset_index()
        .groupby(['date', 'stock_id'], observed=True)
        .agg({'持有股數': 'sum'})
        .reset_index()
        .pivot(index='date', columns='stock_id', values='持有股數')
    )
    h2 = FinlabDataFrame(
        inv[(inv.持股分級.astype(int) >= 11) & (inv.持股分級.astype(int) <= 15)]
        .reset_index()
        .groupby(['date', 'stock_id'], observed=True)
        .agg({'持有股數': 'sum'})
        .reset_index()
        .pivot(index='date', columns='stock_id', values='持有股數')
    )
    h = (FinlabDataFrame(h2 / (h1 + h2)).rank(pct=True, axis=1) * (c.notna()))

    # 選股條件
    c1 = (amt > 2 * 10**7) & (amt > amt.average(60) * 1.3) & (amt / cap).rolling(5).mean().rise()  # type: ignore[attr-defined]
    c2 = (c == c.rolling(200, 120).max())
    c3 = (rev.average(6) == rev.average(6).rolling(20, 16).max())  # type: ignore[attr-defined]
    c4 = ((volatility < 10).sustain(3) & (volatility > 2))  # type: ignore[attr-defined]
    c5 = ((margin_transaction_ratio < 34) & (margin_transaction_ratio > 2)).sustain(3, 2)  # type: ignore[attr-defined]
    c6 = ((rev.rolling(12).min()) / (rev) < 0.8).sustain(2, 1)  # type: ignore[attr-defined]
    c7 = ~(rev_year_growth < 0)
    c8 = ((c == c.rolling(15).min()).rolling(4).sum() == 0)

    # 動量（成交量調整）
    weights = np.arange(1, 6)
    momentum = amt.pct_change(10, fill_method=None).rolling(5).apply(
        lambda x: np.dot(x, weights) / weights.sum(), raw=True
    )
    momentum_adjusted_turnover_rate = (
        v.rolling(5).mean() / (share / 10)
    ) * (momentum.rank(axis=1, pct=True))
    turnover_rank_momentum = momentum_adjusted_turnover_rate.rank(axis=1, ascending=True, pct=True)

    # 風險調整指標
    drawdown = c / c.cummax() - 1
    vol_120 = c.pct_change(fill_method=None).rolling(120).std()
    risk_adjusted_drawdown = drawdown.rolling(120).min() / vol_120.rank(axis=1, pct=True)
    maxdrawdown = risk_adjusted_drawdown.rank(axis=1, pct=True)
    returns = c.pct_change(fill_method=None)
    sharpe_ratio = (returns.rolling(120).mean() / returns.rolling(120).std()) * np.sqrt(240)
    risk_adjusted_metric = maxdrawdown * sharpe_ratio.rank(axis=1, pct=True)

    # 排除名單
    stocks_to_exclude = [
        '2254', '2258', '2432', '3150', '6423', '6534', '6645',
        '6757', '6771', '6794', '6854', '6873', '6902', '6949',
        '6951', '8162', '8487',
    ]

    # 合併所有條件，取前5名
    positionJ = (c1 & c2 & c3 & c4 & c5 & c6 & c7 & c8 & disposal_stocks) * \
        h * turnover_rank_momentum * risk_adjusted_metric

    positionJ = positionJ[positionJ > 0].is_largest(5)  # type: ignore[attr-defined]
    positionJ[stocks_to_exclude] = False
    positionJ = positionJ.reindex(rev.index_str_to_date().index)  # type: ignore[attr-defined]

    return positionJ


def _compute_candle_volatility(c, timeperiod=20):
    from finlab import data
    from finlab.dataframe import FinlabDataFrame
    import numpy as np

    high = data.get("price:最高價")
    low = data.get("price:最低價")
    open_ = data.get("price:開盤價")

    bullish_candle = c >= open_
    bullish_volatility = (
        abs(c.shift() - open_) + abs(open_ - low) +
        abs(low - high) + abs(high - c)
    )
    bearish_volatility = (
        abs(c.shift() - open_) + abs(open_ - high) +
        abs(high - low) + abs(low - c)
    )
    candle_volatility = FinlabDataFrame(np.nan, index=c.index, columns=c.columns)
    candle_volatility[bullish_candle] = bullish_volatility
    candle_volatility[~bullish_candle] = bearish_volatility
    return candle_volatility.average(timeperiod) / c.average(timeperiod) * 100
