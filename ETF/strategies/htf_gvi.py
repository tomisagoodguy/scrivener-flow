"""HTF GVI 多因子選股策略。

選股邏輯：GVI 指數（低PB + 低ROE離群值）x 營收斜率動能 x 大戶7日籌碼變化排名
x RS150 x 技術條件（RSV突破 + 低NATR + 低蠟燭波動），取動量調整周轉率加權後前8名。
"""

import logging
import numpy as np
import pandas as pd
from typing import TYPE_CHECKING

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)

STOCKS_TO_EXCLUDE = [
    '2254', '2258', '2432', '3150', '6423', '6534', '6645',
    '6757', '6771', '6794', '6854', '6873', '6902', '6949',
    '6951', '8162', '8487',
]


class HtfGviStrategy(BaseStrategy):
    """HTF GVI 多因子選股策略。

    特色：PB＋ROE離群值過濾（GVI）、線性迴歸營收斜率、7日大戶籌碼變化、
    RSV多框架動量突破、低NATR、低蠟燭波動、動量調整周轉率，取前8檔。
    """

    strategy_id = "htf_gvi"
    description = "HTF GVI 多因子選股"

    def get_positions(self, cache: 'StrategyDataCache | None' = None):
        return _build_position(cache)


def _rev_growth_col(col: pd.Series) -> pd.Series:
    """對單一股票的月營收序列計算線性迴歸斜率相對截距。"""
    import talib
    arr = np.asarray(col.values, dtype=np.float64)
    slope = talib.LINEARREG_SLOPE(arr, timeperiod=9)
    intercept = talib.LINEARREG_INTERCEPT(arr, timeperiod=9)
    result = np.zeros(len(col), dtype=float)
    eps = 1e-6
    for i in range(len(col)):
        ic = intercept[i]
        sl = slope[i]
        if abs(ic) < eps:
            result[i] = 0.0 if sl == 0 else (np.inf if sl > 0 else -np.inf)
        else:
            result[i] = sl / ic
    return pd.Series(result, index=col.index)


def _build_position(cache: 'StrategyDataCache | None' = None):
    from finlab import data
    from finlab.dataframe import FinlabDataFrame

    # ── 基礎資料（優先從 cache 取） ────────────────────────────────────────────
    if cache is not None:
        close = cache.close
        amt = cache.amt
        vol = cache.v
        rev = cache.rev
        disposal_stocks = cache.disposal_stocks
        inv = cache.inv
        volatility = cache.candle_volatility
        share = cache.share
    else:
        close = data.get('price:收盤價')
        amt = data.get('price:成交金額')
        vol = data.get('price:成交股數')
        rev = data.get('monthly_revenue:當月營收')
        disposal_stocks = data.get('etl:disposal_stock_filter')
        inv = data.get('inventory')
        share = data.get('financial_statement:普通股股本')
        volatility = _compute_candle_volatility(close)

    # ── 策略獨用資料（不在 cache，自行下載） ──────────────────────────────────
    BP_ratio = data.get('price_earning_ratio:股價淨值比')
    net_income = data.get('fundamental_features:經常稅後淨利')
    natr_raw = data.indicator('NATR', timeperiod=50)
    natr = natr_raw[0] if isinstance(natr_raw, tuple) else natr_raw

    # ── GVI 指數（PB > 1 且 ROE < 80th pct） ─────────────────────────────────
    ROE = net_income.rolling(window=12, min_periods=1).sum() / \
        np.minimum(net_income.rolling(window=12, min_periods=1).count(), 12)

    ROE = FinlabDataFrame(ROE)
    gvi_index = (BP_ratio > 1) * (ROE < ROE.quantile_row(0.8))

    # ── 營收線性斜率動能 ──────────────────────────────────────────────────────
    rev_growth = rev.apply(_rev_growth_col)

    # ── 大戶7日籌碼變化排名（h1=≤4，h2=11–14，與 capital_layer 相同分組） ──
    if cache is not None:
        h1 = cache.h1_le4
        h2 = cache.h2_11_14
    else:
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
    s1 = (
        FinlabDataFrame(ratio.diff(7)).rank(axis=1, pct=True) * close.notna()
    ).rank(pct=True, axis=1)

    # ── RSV 函數 ───────────────────────────────────────────────────────────────
    def rsv(n: int):
        mn = close.rolling(n, min_periods=int(n / 2)).min()
        mx = close.rolling(n, min_periods=int(n / 2)).max()
        return (close - mn) / (mx - mn)

    def rs(n: int):
        return (close / close.shift(n)).rank(pct=True, axis=1)

    # ── 選股條件 ──────────────────────────────────────────────────────────────
    cond1 = amt > 2e7
    cond2 = (rsv(50) > 0.85) & (rsv(100) > 0.85) & (rsv(150) > 0.8) & (rs(100) > 0.5)
    cond3 = natr.rank(axis=1, pct=True) < 0.7
    cond4 = volatility <= 9.5

    score = (
        gvi_index * rev_growth * s1 * rs(150) *
        (cond1 & cond2 & cond3 & cond4 & disposal_stocks)
    )

    # ── 動量調整周轉率（低周轉率得分更高）──────────────────────────────────────
    momentum = close.pct_change(10, fill_method=None).rolling(5).mean()
    mat = (vol.rolling(5).mean() / (share / 10)) * momentum.rank(axis=1, pct=True)
    turnover_rank = mat.rank(axis=1, ascending=True, pct=True)

    final_score = score * turnover_rank

    position = final_score.is_largest(8)  # type: ignore[attr-defined]
    position[STOCKS_TO_EXCLUDE] = False
    position = position.reindex(rev.index_str_to_date().index)  # type: ignore[attr-defined]

    return position


def _compute_candle_volatility(close, timeperiod: int = 20):
    from finlab import data
    from finlab.dataframe import FinlabDataFrame
    high = data.get('price:最高價')
    low = data.get('price:最低價')
    open_ = data.get('price:開盤價')
    bullish = close >= open_
    bull_vol = (
        abs(close.shift() - open_) + abs(open_ - low) +
        abs(low - high) + abs(high - close)
    )
    bear_vol = (
        abs(close.shift() - open_) + abs(open_ - high) +
        abs(high - low) + abs(low - close)
    )
    vol = FinlabDataFrame(np.nan, index=close.index, columns=close.columns)
    vol[bullish] = bull_vol
    vol[~bullish] = bear_vol
    return vol.average(timeperiod) / close.average(timeperiod) * 100
