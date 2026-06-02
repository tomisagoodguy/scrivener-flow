"""共用資料快取 — 避免跨策略重複下載與計算。

只快取無 universe 限制的資料。使用 functools.cached_property，
每個屬性在同一個 StrategyDataCache 實例內只計算一次。
"""

import logging
from functools import cached_property

logger = logging.getLogger(__name__)


class StrategyDataCache:
    """跨策略共用的資料快取。

    每次 pipeline 執行時建立一個實例，傳給所有策略的 get_positions()。
    cached_property 確保每個屬性只計算一次（lazy，用到才下載）。
    """

    # ── 價格資料 ──────────────────────────────────────────────────────────────

    @cached_property
    def close(self):
        from finlab import data
        return data.get('price:收盤價')

    @cached_property
    def high(self):
        from finlab import data
        return data.get('price:最高價')

    @cached_property
    def low(self):
        from finlab import data
        return data.get('price:最低價')

    @cached_property
    def open_(self):
        from finlab import data
        return data.get('price:開盤價')

    @cached_property
    def amt(self):
        from finlab import data
        return data.get('price:成交金額')

    @cached_property
    def v(self):
        from finlab import data
        return data.get('price:成交股數')

    # ── 基本面資料 ────────────────────────────────────────────────────────────

    @cached_property
    def rev(self):
        from finlab import data
        return data.get('monthly_revenue:當月營收')

    @cached_property
    def rev_yoy(self):
        """月營收年增率（去年同月增減%）。用於 super8888 / capital_layer。"""
        from finlab import data
        return data.get('monthly_revenue:去年同月增減(%)')

    @cached_property
    def rev_cyoy(self):
        """月營收月增率（前期比較增減%）。用於 super888。"""
        from finlab import data
        return data.get('monthly_revenue:前期比較增減(%)')

    @cached_property
    def share(self):
        """普通股股本。用於 super8888 動量調整周轉率計算。"""
        from finlab import data
        return data.get('financial_statement:普通股股本')

    @cached_property
    def cap(self):
        from finlab import data
        return data.get('etl:market_value')

    @cached_property
    def benchmark(self):
        """發行量加權股價報酬指數（Series）。用於 broker_ranked 共移性計算。"""
        import pandas as pd
        from finlab import data
        raw = data.get('benchmark_return:發行量加權股價報酬指數')
        squeezed = raw.squeeze()
        if isinstance(squeezed, pd.DataFrame):
            squeezed = squeezed.iloc[:, 0]
        return pd.Series(squeezed)

    # ── 籌碼資料 ──────────────────────────────────────────────────────────────

    @cached_property
    def margin_transaction_ratio(self):
        from finlab import data
        return data.get('margin_transactions:融資使用率').fillna(0)

    @cached_property
    def buy_vol(self):
        from finlab import data
        return data.get('etl:broker_transactions:top15_buy').fillna(0)

    @cached_property
    def sell_vol(self):
        from finlab import data
        return data.get('etl:broker_transactions:top15_sell').fillna(0)

    @cached_property
    def disposal_stocks(self):
        from finlab import data
        return data.get('etl:disposal_stock_filter')

    @cached_property
    def inv(self):
        from finlab import data
        logger.info("[SharedCache] 下載 inventory...")
        return data.get('inventory')

    # ── 昂貴計算：inventory pivot（capital_layer + broker_ranked 共用，≤4 / 11–14）──

    @cached_property
    def h1_le4(self):
        """散戶持股 pivot（持股分級 ≤ 4）。"""
        from finlab.dataframe import FinlabDataFrame
        logger.info("[SharedCache] 計算 h1_le4 pivot...")
        inv = self.inv
        return FinlabDataFrame(
            inv[inv.持股分級.astype(int) <= 4]
            .reset_index()
            .groupby(['date', 'stock_id'], observed=True)
            .agg({'持有股數': 'sum'})
            .reset_index()
            .pivot(index='date', columns='stock_id', values='持有股數')
        )

    @cached_property
    def h2_11_14(self):
        """大戶持股 pivot（持股分級 11–14）。"""
        from finlab.dataframe import FinlabDataFrame
        logger.info("[SharedCache] 計算 h2_11_14 pivot...")
        inv = self.inv
        return FinlabDataFrame(
            inv[(inv.持股分級.astype(int) >= 11) & (inv.持股分級.astype(int) <= 14)]
            .reset_index()
            .groupby(['date', 'stock_id'], observed=True)
            .agg({'持有股數': 'sum'})
            .reset_index()
            .pivot(index='date', columns='stock_id', values='持有股數')
        )

    @cached_property
    def s_holder(self):
        """大戶比例 6 日變化排名（capital_layer + broker_ranked 公式相同）。"""
        from finlab.dataframe import FinlabDataFrame
        logger.info("[SharedCache] 計算 s_holder...")
        ratio = self.h2_11_14 / (self.h1_le4 + self.h2_11_14)
        return FinlabDataFrame(ratio.diff(6)).rank(axis=1, pct=True) * (self.close.notna())

    # ── 昂貴計算：蠟燭波動率（super8888）────────────────────────────────────

    # ── 財務報表（季頻）— fundamental_momentum 使用 ──────────────────────────

    @cached_property
    def ope_earn(self):
        """營業利益率（quarterly）。"""
        from finlab import data
        return data.get('fundamental_features:營業利益率')

    @cached_property
    def net_income_growth_rate(self):
        """稅後淨利成長率（quarterly）。"""
        from finlab import data
        return data.get('fundamental_features:稅後淨利成長率')

    @cached_property
    def eps_q(self):
        """每股盈餘（quarterly）。"""
        from finlab import data
        return data.get('financial_statement:每股盈餘')

    @cached_property
    def stock_turnover_rate(self):
        """存貨週轉率（quarterly）。"""
        import numpy as np
        from finlab import data
        return data.get('fundamental_features:存貨週轉率').replace([np.nan, np.inf], 0)

    @cached_property
    def fcf_operating(self):
        """營業活動淨現金流量（quarterly）。"""
        from finlab import data
        return data.get('financial_statement:營業活動之淨現金流入_流出')

    @cached_property
    def fcf_investing(self):
        """投資活動淨現金流量（quarterly）。"""
        from finlab import data
        return data.get('financial_statement:投資活動之淨現金流入_流出')

    # ── 昂貴計算：蠟燭波動率（super8888）────────────────────────────────────

    @cached_property
    def candle_volatility(self):
        """蠟燭波動率（20日均值 / 均收盤價，%）。

        依多空方向分別累計四段距離（前收→開、開→低/高、低/高→高/低、高/低→收）。
        """
        logger.info("[SharedCache] 計算 candle_volatility...")
        c, high, low, open_ = self.close, self.high, self.low, self.open_
        bullish = c >= open_
        bull_vol = (
            abs(c.shift() - open_) + abs(open_ - low) +
            abs(low - high) + abs(high - c)
        )
        bear_vol = (
            abs(c.shift() - open_) + abs(open_ - high) +
            abs(high - low) + abs(low - c)
        )
        vol = bull_vol.where(bullish, bear_vol)
        return vol.rolling(20).mean() / c.rolling(20).mean() * 100
