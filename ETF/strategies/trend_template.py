"""趨勢樣板 (Trend Template) 量化選股策略。

14 個多因子條件，積分 ≥ 12 的個股依市值取最小 5 支（偏好小型趨勢股）。

條件涵蓋：
  - 趨勢動量（RSV、RS、距高點比率）
  - 籌碼（融資使用率、大戶比例 8 日變化、主力力道）
  - 營收（年增率、月增率、短長期均線、創近高）
  - 技術面（均線多頭排列）
  - 波動率（蠟燭波動率 < 12%）
"""

import logging
from typing import TYPE_CHECKING

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)


class TrendTemplateStrategy(BaseStrategy):
    """趨勢樣板量化選股。

    滿足 14 項多因子條件 ≥ 12 個、成交金額 > 2000 萬、非處置股，
    依市值由小取 5 支。
    """

    strategy_id = "trend_template"
    description = "趨勢樣板選股"

    def get_positions(self, cache: 'StrategyDataCache | None' = None):
        return _build_position(cache)


def _rsv(close, n: int):
    """Williams %R 正規化（0–1 百分位排名），滾動 n 日高低點。"""
    rolling_min = close.rolling(n, min_periods=n // 2).min()
    rolling_max = close.rolling(n, min_periods=n // 2).max()
    return ((close - rolling_min) / (rolling_max - rolling_min)).rank(pct=True, axis=1)


def _rs(close, n: int):
    """n 日相對強度（收盤/前 n 日收盤）百分位排名。"""
    return (close / close.shift(n)).rank(pct=True, axis=1)


def _price_to_high(close, n: int):
    """收盤價距 n 日最高點比率百分位排名。"""
    high_n = close.rolling(n, min_periods=n // 2).max()
    return (close / high_n).rank(axis=1, pct=True)


def _compute_candle_volatility(close, timeperiod: int = 20):
    """蠟燭波動率：依多空方向累計四段距離，取 timeperiod 均值除以均收盤價（%）。"""
    from finlab import data
    from finlab.dataframe import FinlabDataFrame
    import numpy as np

    high = data.get("price:最高價")
    low = data.get("price:最低價")
    open_ = data.get("price:開盤價")

    bullish = close >= open_
    bull_vol = abs(close.shift() - open_) + abs(open_ - low) + abs(low - high) + abs(high - close)
    bear_vol = abs(close.shift() - open_) + abs(open_ - high) + abs(high - low) + abs(low - close)
    candle_vol = FinlabDataFrame(np.nan, index=close.index, columns=close.columns)
    candle_vol[bullish] = bull_vol
    candle_vol[~bullish] = bear_vol
    return candle_vol.average(timeperiod) / close.average(timeperiod) * 100


def _build_position(cache: 'StrategyDataCache | None' = None):
    from finlab import data
    from finlab.dataframe import FinlabDataFrame

    if cache is not None:
        close = FinlabDataFrame(cache.close)
        rev = FinlabDataFrame(cache.rev)
        yoy = FinlabDataFrame(cache.rev_yoy)
        cyoy = FinlabDataFrame(cache.rev_cyoy)
        margin_transaction_ratio = FinlabDataFrame(cache.margin_transaction_ratio)
        buy_vol = FinlabDataFrame(cache.buy_vol)
        sell_vol = FinlabDataFrame(cache.sell_vol)
        cap = FinlabDataFrame(cache.cap)
        amt = FinlabDataFrame(cache.amt)
        disposal_stocks = FinlabDataFrame(cache.disposal_stocks)
        inv = cache.inv
        volatility = FinlabDataFrame(cache.candle_volatility)
    else:
        close = data.get('price:收盤價')
        rev = data.get('monthly_revenue:當月營收')
        yoy = data.get('monthly_revenue:去年同月增減(%)')
        cyoy = data.get('monthly_revenue:前期比較增減(%)')
        margin_transaction_ratio = data.get('margin_transactions:融資使用率').fillna(0)
        buy_vol = data.get('etl:broker_transactions:top15_buy').fillna(0)
        sell_vol = data.get('etl:broker_transactions:top15_sell').fillna(0)
        cap = data.get('etl:market_value')
        amt = data.get('price:成交金額')
        disposal_stocks = data.get('etl:disposal_stock_filter')
        inv = data.get('inventory')
        volatility = _compute_candle_volatility(close)

    # ── 大戶比例 8 日變化（分級 ≤3 散戶 / 10–15 大戶，趨勢樣板特定比率）──
    h1 = FinlabDataFrame(
        inv[inv.持股分級.astype(int) <= 3]
        .reset_index()
        .groupby(['date', 'stock_id'], observed=True)
        .agg({'持有股數': 'sum'})
        .reset_index()
        .pivot(index='date', columns='stock_id', values='持有股數')
    )
    h2 = FinlabDataFrame(
        inv[(inv.持股分級.astype(int) >= 10) & (inv.持股分級.astype(int) <= 15)]
        .reset_index()
        .groupby(['date', 'stock_id'], observed=True)
        .agg({'持有股數': 'sum'})
        .reset_index()
        .pivot(index='date', columns='stock_id', values='持有股數')
    )
    ratio = h2 / (h1 + h2)
    holder_rank = FinlabDataFrame(ratio.diff(8)).rank(axis=1, pct=True) * (close.notna())

    # ── 主力力道：Top15 券商淨買超 × 收盤價，60 日 z-score ──
    net_vol = (buy_vol - sell_vol) * close
    force_raw = net_vol.rolling(60).mean() / net_vol.rolling(60).std()
    # 過濾槓桿/反向 ETF（代碼末字母 L 或 B）
    valid_cols = force_raw.columns[~force_raw.columns.str[-1].isin(['L', 'B'])]
    force = force_raw[valid_cols]

    # ── 14 個選股條件 ─────────────────────────────────────────────────────────
    rev_ma2 = rev.average(2)  # type: ignore[operator]

    conds = [
        _rsv(close, 180) > 0.9,                                         # 180日RSV排名
        _rs(close, 180) > 0.85,                                          # 180日相對強度
        _price_to_high(close, 240) > 0.85,                               # 距240日高點比率
        margin_transaction_ratio < 34,                                    # 融資使用率
        yoy.rank(pct=True, axis=1) > 0.9,                                # 年增率排名
        cyoy.rank(pct=True, axis=1) > 0.5,                               # 月增率排名
        close.average(10).rise() & close.average(20).rise(),             # type: ignore[operator]  # 均線同步上升
        rev_ma2 > rev.average(12),                                        # type: ignore[operator]  # 短>長期營收
        rev_ma2 == rev_ma2.rolling(9, min_periods=6).max(),              # 2月均營收9月內創高
        (rev.average(3) / rev.average(12)).rank(pct=True, axis=1) > 0.8,  # type: ignore[operator]  # 短長期比率排名
        (                                                                  # 5/20日多頭排列
            close.rolling(5).mean().rise()  # type: ignore[operator]
            & (close > close.rolling(5).mean())
            & (close.rolling(5).mean() > close.rolling(20).mean())
        ),
        holder_rank.rank(pct=True, axis=1) > 0.8,                        # 大戶籌碼排名
        force.rank(pct=True, axis=1) > 0.8,                              # 主力力道排名
        volatility < 12,                                                   # 蠟燭波動率
    ]

    scores = sum(c.astype(int) for c in conds)

    # 積分 ≥ 12、成交金額 > 2000 萬、非處置股，依市值取最小 5 支（小型趨勢股）
    amt_filter = amt > 2 * 10 ** 7
    position = cap * ((scores >= 12) & amt_filter & disposal_stocks)
    position = position[position > 0].is_smallest(5)  # type: ignore[operator]
    position = position.reindex(rev.index_str_to_date().index, method='ffill')  # type: ignore[operator]

    return position
