"""基本面動能策略 — 財務健全 × 均線多頭排列。

參考 shihyu jason_note GA_Six_FA_Finlab 設計，結合 7 個條件：
  1. 月營收 YoY 持續 6 個月正成長 + 6 個月均增率 > 25% + 上升
  2. 營業利益率穩定（季振盪 < 20%）且均值 > 15%，或 10–15% 且上升
  3. 稅後淨利成長率：3 季連正且上升，或連 3 季 > 50%
  4. EPS 連 4 季合計 > 5 且當季 > 0
  5. 自由現金流（營業 + 投資）連 6 季正值
  6. 均線多頭排列：close > sma5 > sma20 > sma60 > sma240
  7. 存貨週轉率穩定（無連續惡化）且 4 季均值 > 1.5

滿足全部條件，依 ROE 取前 10 支（每月換倉）。
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import numpy as np

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)


class FundamentalMomentumStrategy(BaseStrategy):
    """財務健全 + 均線趨勢雙重過濾選股。"""

    strategy_id = "fundamental_momentum"
    description = "基本面動能選股"

    def get_positions(self, cache: 'StrategyDataCache | None' = None):
        return _build_position(cache)


def _build_position(cache: 'StrategyDataCache | None' = None):
    from finlab import data
    from finlab.dataframe import FinlabDataFrame

    if cache is not None:
        close = FinlabDataFrame(cache.close)
        rev = FinlabDataFrame(cache.rev)
        yoy = FinlabDataFrame(cache.rev_yoy)
        ope_earn = FinlabDataFrame(cache.ope_earn)
        net_income_gr = FinlabDataFrame(cache.net_income_growth_rate)
        eps = FinlabDataFrame(cache.eps_q)
        fcf_ops = FinlabDataFrame(cache.fcf_operating)
        fcf_inv = FinlabDataFrame(cache.fcf_investing)
        stock_turn = FinlabDataFrame(cache.stock_turnover_rate)
    else:
        close = data.get('price:收盤價')
        rev = data.get('monthly_revenue:當月營收')
        yoy = data.get('monthly_revenue:去年同月增減(%)')
        ope_earn = data.get('fundamental_features:營業利益率')
        net_income_gr = data.get('fundamental_features:稅後淨利成長率')
        eps = data.get('financial_statement:每股盈餘')
        fcf_ops = data.get('financial_statement:營業活動之淨現金流入_流出')
        fcf_inv = data.get('financial_statement:投資活動之淨現金流入_流出')
        stock_turn = data.get('fundamental_features:存貨週轉率').replace([np.nan, np.inf], 0)

    # 1. 月營收 YoY 動能
    rev_cond = (
        (yoy > 0).sustain(6)  # type: ignore[operator]
        & (yoy.average(6) > 25)  # type: ignore[operator]
        & yoy.rise()  # type: ignore[operator]
    )

    # 2. 營業利益率穩定
    op_stable = (
        (ope_earn.diff() / ope_earn.shift().abs()).rolling(3).min() * 100
    ) > -20
    op_cond = op_stable & (
        (ope_earn.average(4) > 15)  # type: ignore[operator]
        | ((ope_earn.average(4) > 10) & ope_earn.rise())  # type: ignore[operator]
    )

    # 3. 稅後淨利成長率
    ni_cond = (
        ((net_income_gr > 0).sustain(3) & net_income_gr.rise())  # type: ignore[operator]
        | (net_income_gr > 50).sustain(3)  # type: ignore[operator]
    )

    # 4. EPS 品質
    eps_cond = (eps.rolling(4).sum() > 5) & (eps > 0)

    # 5. 自由現金流 6 季持續正值
    fcf = fcf_ops + fcf_inv
    fcf_cond = fcf.rolling(6).min() > 0

    # 6. 均線多頭排列（5/20/60/240日）
    sma5 = close.rolling(5).mean()
    sma20 = close.rolling(20).mean()
    sma60 = close.rolling(60).mean()
    sma240 = close.rolling(240).mean()
    trend_cond = (close > sma5) & (sma5 > sma20) & (sma20 > sma60) & (sma60 > sma240)

    # 7. 存貨週轉率穩定 + 均值 > 1.5
    turn_stable = (
        (stock_turn.diff() / stock_turn.shift().abs()).rolling(3).min() * 100
    ) > -20
    turn_cond = turn_stable & (stock_turn.average(4) > 1.5)  # type: ignore[operator]

    position = rev_cond & op_cond & ni_cond & eps_cond & fcf_cond & trend_cond & turn_cond

    # 依 ROE 排名取最優 10 支
    roe = data.get('fundamental_features:ROE稅後')
    position = roe[position].is_largest(10)  # type: ignore[operator]
    position = position.reindex(rev.index_str_to_date().index, method='ffill')  # type: ignore[operator]

    return position
