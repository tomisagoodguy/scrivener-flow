"""台股選股條件池 — 封裝所有可供 GA 使用的技術/基本面條件。"""

from __future__ import annotations

from functools import cached_property

import numpy as np
import pandas as pd
from finlab import data
from finlab.dataframe import FinlabDataFrame


class BuyCondition:
    """所有條件的資料載入與計算入口。

    所有資料屬性為 cached_property，首次存取時才呼叫 data.get()，
    避免實例化時消耗未用到的 FinLab API 配額。
    """

    # ── 價格 ──────────────────────────────────────────────────────────────

    @cached_property
    def close(self):
        return data.get("price:收盤價")

    @cached_property
    def high(self):
        return data.get("price:最高價")

    @cached_property
    def low(self):
        return data.get("price:最低價")

    @cached_property
    def open(self):
        return data.get("price:開盤價")

    @cached_property
    def volume(self):
        return data.get("price:成交股數")

    @cached_property
    def adj_close(self):
        return data.get("etl:adj_close")

    # ── 集保庫存 ──────────────────────────────────────────────────────────

    @cached_property
    def inv(self):
        raw = data.get("inventory")
        return raw[["stock_id", "date", "持股分級", "人數", "占集保庫存數比例"]]

    # ── 月營收 ────────────────────────────────────────────────────────────

    @cached_property
    def revenue(self):
        return data.get("monthly_revenue:當月營收")

    @cached_property
    def rev_year_growth(self):
        return data.get("monthly_revenue:去年同月增減(%)")

    @cached_property
    def rev_month_growth(self):
        return data.get("monthly_revenue:上月比較增減(%)")

    @cached_property
    def 去年當月營收(self):
        return data.get("monthly_revenue:去年當月營收")

    # ── 估值 / 基本面 ─────────────────────────────────────────────────────

    @cached_property
    def pe(self):
        return data.get("price_earning_ratio:本益比")

    @cached_property
    def pb(self):
        return data.get("price_earning_ratio:股價淨值比")

    @cached_property
    def 營業利益成長率(self):
        return data.get("fundamental_features:營業利益成長率")

    @cached_property
    def peg(self):
        return self.pe / self.營業利益成長率

    @cached_property
    def 股本(self):
        return data.get("financial_statement:股本")

    @cached_property
    def 普通股股本(self):
        return data.get("financial_statement:普通股股本")

    @cached_property
    def net_cash_flows_from_investing(self):
        return data.get("financial_statement:投資活動之淨現金流入_流出")

    @cached_property
    def net_cash_flows_from_operating(self):
        return data.get("financial_statement:營業活動之淨現金流入_流出")

    @cached_property
    def 稅後淨利(self):
        return data.get("fundamental_features:經常稅後淨利")

    @cached_property
    def 權益總計(self):
        return data.get("financial_statement:股東權益總額")

    @cached_property
    def 研究發展費(self):
        return data.get("financial_statement:研究發展費").deadline()  # type: ignore[operator]

    @cached_property
    def 營業收入淨額(self):
        return data.get("financial_statement:營業收入淨額").deadline()  # type: ignore[operator]

    @cached_property
    def contract_debt(self):
        return data.get("financial_statement:合約負債_流動")

    @cached_property
    def ope_earn(self):
        return data.get("fundamental_features:營業利益率")

    @cached_property
    def gross_rate(self):
        return data.get("fundamental_features:營業毛利率")

    @cached_property
    def other_income(self):
        return data.get("fundamental_features:業外收支營收率")

    # ── 籌碼原始資料 ──────────────────────────────────────────────────────

    @cached_property
    def boss_hold_data(self):
        return data.get("internal_equity_changes:董監持有股數占比")

    @cached_property
    def margin_transactions(self):
        return data.get("margin_transactions:融資今日餘額")

    @cached_property
    def margin_utilization(self):
        return data.get("margin_transactions:融資使用率").fillna(0)

    @cached_property
    def turnover(self):
        return data.get("price:成交金額")

    # ── 除權息還原 ────────────────────────────────────────────────────────

    @cached_property
    def tse_par(self):
        return data.get("par_value_change_tse:twse_par_value_change_divide_ratio")

    @cached_property
    def otc_par(self):
        return data.get("par_value_change_otc:otc_par_value_change_divide_ratio")

    # ── 大盤基準 ──────────────────────────────────────────────────────────

    @cached_property
    def benchmark(self):
        with data.universe(market="OTC"):
            otc_close = data.get("price:收盤價")
        return otc_close.sum(axis=1)

    # ── 技術指標 ──────────────────────────────────────────────────────────

    def mfi_rise(self, period: int = 3):
        return data.indicator("MFI", adjust_price=False, resample="D", timeperiod=5).rise(period)  # type: ignore[operator, attr-defined]

    def mfi_fall(self, period: int = 3):
        return data.indicator("MFI", adjust_price=False, resample="D", timeperiod=5).fall(period)  # type: ignore[operator, attr-defined]

    def ad_raise(self, period: int = 3):
        return data.indicator("AD", adjust_price=False, resample="D").rise(period)  # type: ignore[operator, attr-defined]

    def ad_fall(self, period: int = 3):
        return data.indicator("AD", adjust_price=False, resample="D").fall(period)  # type: ignore[operator, attr-defined]

    def obv_raise(self, period: int = 3):
        return data.indicator("OBV", adjust_price=True, resample="D").rise(period)  # type: ignore[operator, attr-defined]

    def obv_fall(self, period: int = 3):
        return data.indicator("OBV", adjust_price=True, resample="D").fall(period)  # type: ignore[operator, attr-defined]

    def break_ma(self, ma: int = 60):
        avg = self.adj_close.average(ma)  # type: ignore[operator]
        return (self.adj_close > avg) & (self.adj_close.shift() < avg.shift())

    def break_bollinger_band_up(self, timeperiod: int = 20):
        upperband, _, _ = data.indicator("BBANDS", timeperiod=timeperiod)
        return (self.adj_close > upperband) & (self.adj_close.shift() < upperband.shift())  # type: ignore[attr-defined]

    def break_bollinger_band_down(self, timeperiod: int = 20):
        _, _, lowerband = data.indicator("BBANDS", timeperiod=timeperiod)
        return (self.adj_close < lowerband) & (self.adj_close.shift() > lowerband.shift())  # type: ignore[attr-defined]

    def keltner_up(self, timeperiod: int = 10):
        ema = data.indicator("EMA", adjust_price=True, resample="D", timeperiod=timeperiod)
        atr = data.indicator("ATR", adjust_price=True, resample="D", timeperiod=timeperiod)
        keltner = ema + 2 * atr
        return (self.adj_close > keltner) & (self.adj_close.shift() < keltner.shift())  # type: ignore[attr-defined]

    def rsv(self, n: int = 50) -> pd.DataFrame:
        return (
            (self.close - self.close.rolling(n).min())
            / (self.close.rolling(n).max() - self.close.rolling(n).min())
        )

    def rci(self, n: int = 12) -> pd.DataFrame:
        # 對每支股票的時間序列做 Spearman rank correlation（日期越近 rank 越小）
        def _rci(x: np.ndarray) -> float:
            price_rank = len(x) - np.argsort(np.argsort(x))  # 高價 = 1
            date_rank  = np.arange(len(x), 0, -1)             # 最近 = 1
            d = price_rank - date_rank
            return float((1 - 6 * (d ** 2).sum() / (n * (n ** 2 - 1))) * 100)
        return self.close.rolling(n).apply(_rci, raw=True)

    def pvc(self, timeperiod: int = 60):
        volume_reduce  = self.volume.average(10) < (self.volume.average(timeperiod) * 0.5)  # type: ignore[operator]
        price_contract = self.close.rolling(10).std() < (self.close.rolling(timeperiod).std() * 0.6)
        return (volume_reduce & price_contract).sustain(5, 1)

    def entry_signal_volatility(self, timeperiod: int = 5):
        atr = data.indicator("ATR", adjust_price=True, timeperiod=timeperiod)
        return atr / self.adj_close

    def compute_candle_volatility(self, timeperiod: int = 20):
        bullish = self.close >= self.open
        bull_vol = (
            abs(self.close.shift() - self.open)
            + abs(self.open - self.low)
            + abs(self.low - self.high)
            + abs(self.high - self.close)
        )
        bear_vol = (
            abs(self.close.shift() - self.open)
            + abs(self.open - self.high)
            + abs(self.high - self.low)
            + abs(self.low - self.close)
        )
        candle_vol = pd.DataFrame(
            np.nan, index=self.close.index, columns=self.close.columns
        )
        candle_vol[bullish]  = bull_vol  # type: ignore[index]
        candle_vol[~bullish] = bear_vol  # type: ignore[index]
        return FinlabDataFrame(candle_vol).average(timeperiod) / self.close.average(timeperiod) * 100  # type: ignore[operator]

    def close_volatility(self, timeperiod: int = 20):
        return self.close.pct_change().rolling(timeperiod).std().rank(axis=1, pct=True)

    def relative_strength(self, n: int = 8):
        return (self.close / self.close.shift(n)) / (self.benchmark / self.benchmark.shift(n))

    # ── 均線與趨勢 ────────────────────────────────────────────────────────

    def ls_order_position(self, short: int = 5, mid: int = 10, long: int = 30):
        s = self.adj_close.average(short)  # type: ignore[operator]
        m = self.adj_close.average(mid)  # type: ignore[operator]
        l = self.adj_close.average(long)  # type: ignore[operator]
        long_order  = ((s >= m) & (m >= l)).sum(1)
        short_order = ((s < m) & (m < l)).sum(1)
        return ~self.adj_close.isna() & (long_order > short_order)

    def ADLs_position(self, short_par: int = 20, long_par: int = 40):
        diff = self.close.diff()
        total = (~self.close.isna()).sum(1)
        rise  = (diff > 0).sum(1)
        adl   = rise / total - 0.5
        return ~self.close.isna() & (adl.rolling(short_par).mean() >= adl.rolling(long_par).mean())

    def vix_position(self, short_par: int = 5, long_par: int = 20):
        vix = data.get("world_index:open")["^VIX"].dropna()
        cond = (vix.rolling(short_par).mean() <= vix.rolling(long_par).mean()).reindex(self.adj_close.index)
        return ~self.adj_close.isna() & cond

    def margin_position(self, short_par: int = 5, long_par: int = 30):
        融資券 = data.get("margin_balance:融資券總餘額").ffill()
        total = 融資券[["上市融資交易金額", "上櫃融資交易金額"]].sum(axis=1)
        mv = (self.margin_transactions * self.adj_close * 1000).sum(axis=1)[self.margin_transactions.index]
        rate = (mv / total).dropna()
        return ~self.adj_close.isna() & (
            rate.rolling(short_par).mean() >= rate.rolling(long_par).mean()
        )

    # ── 籌碼 ──────────────────────────────────────────────────────────────

    def ict_ratio(self, rolling: int = 5, rate: float = 0.1):
        投信 = data.get("institutional_investors_trading_summary:投信買賣超股數")
        return 投信.rolling(rolling).sum() / self.volume.rolling(rolling).sum() > rate

    def iit_ratio(self, rolling: int = 5, rate: float = 0.1):
        iit = data.get("institutional_investors_trading_summary:外陸資買賣超股數(不含外資自營商)")
        return iit.rolling(rolling).sum() / self.volume.rolling(rolling).sum() > rate

    def boss_hold_rise(self, timeperiod: int = 1):
        return self.boss_hold_data.rise(timeperiod)  # type: ignore[operator]

    def boss_hold(self, rate: float = 30):
        return self.boss_hold_data > rate

    def yield_range(self, lower: float = 3, upper: float = 10):
        y = data.get("price_earning_ratio:殖利率(%)")
        return (lower <= y) & (y <= upper)

    def intraday_trading(self, rate: float = 0.1):
        當沖 = data.get("intraday_trading:當日沖銷交易成交股數")
        return 當沖 / self.volume / 2 < rate

    def small_inv(self, level: int = 5, datatype: str = "占集保庫存數比例"):
        return FinlabDataFrame(
            self.inv[self.inv.持股分級.astype(int) <= level]
            .reset_index()
            .groupby(["date", "stock_id"], observed=False)
            .agg({datatype: "sum"})
            .reset_index()
            .pivot(index="date", columns="stock_id")[datatype]
        )

    def boss_inv(self, down_level: int = 9, up_level: int = 15, datatype: str = "占集保庫存數比例"):
        mask = (
            (self.inv.持股分級.astype(int) >= down_level)
            & (self.inv.持股分級.astype(int) <= up_level)
        )
        return FinlabDataFrame(
            self.inv[mask]
            .reset_index()
            .groupby(["date", "stock_id"], observed=False)
            .agg({datatype: "sum"})
            .reset_index()
            .pivot(index="date", columns="stock_id")[datatype]
        )

    def major_shareholder_ownership(
        self, small_level: int = 5, boss_down_level: int = 9, boss_up_level: int = 15
    ):
        h1 = self.small_inv(level=small_level)
        h2 = self.boss_inv(down_level=boss_down_level, up_level=boss_up_level)
        ratio = h2 / (h1 + h2)
        return FinlabDataFrame(ratio.diff(6)).rank(axis=1, pct=True) * self.close.notna()

    def turnover_rate(self):
        return self.volume / (self.普通股股本 / 10)

    # ── 基本面 ────────────────────────────────────────────────────────────

    def rev_yoy_rank(self, rate: float = 0.8):
        return self.rev_year_growth.rank(pct=True, axis=1) > rate

    def revenue_new_high(
        self, rev_ma: int = 2, rolling_window: int = 12, rolling_period: int = 6
    ):
        ma = self.revenue.average(rev_ma)  # type: ignore[operator]
        return ma == ma.rolling(rolling_window, min_periods=rolling_period).max()

    def statement_dog_rev_index(self, timeperiod: int = 3):
        three  = self.revenue.rolling(timeperiod).sum() / self.去年當月營收.rolling(timeperiod).sum()
        twelve = self.revenue.rolling(12).sum() / self.去年當月營收.rolling(12).sum()
        return three / twelve > 1.05

    def free_cash_flow(self):
        return (
            self.net_cash_flows_from_investing + self.net_cash_flows_from_operating
        ).rolling(4).mean()

    def return_on_equity(self):
        return self.稅後淨利 / self.權益總計

    def contract_debt_gr(self, uper: float = 0.5):
        gr = self.contract_debt / self.contract_debt.shift() - 1
        return (gr > 0.05) & (gr < uper)

    def ce_ratio(self):
        return self.contract_debt / self.股本

    def research_and_development_expense_ratio(self):
        ratio = self.研究發展費 / self.營業收入淨額 * 100
        return ratio[self.研究發展費 < self.營業收入淨額].dropna(how="all", axis=1).replace(np.inf, np.nan)

    def price_to_sales_ratio(self):
        mktcap = self.capitalization()
        quarterly_rev = self.revenue.rolling(12).sum()
        return mktcap / quarterly_rev

    # ── 市值 ──────────────────────────────────────────────────────────────

    def capitalization(self):
        empty = pd.DataFrame(1, columns=self.close.columns, index=self.close.index)
        tse_ratio = (empty * self.tse_par).fillna(1).cumprod()
        otc_ratio = (empty * self.otc_par).fillna(1).cumprod()
        return self.股本 * self.close / 10 * 1000 * (tse_ratio * otc_ratio)

    def max_market_capitalization(self, quantile: float = 0.6):
        return self.capitalization() < self.capitalization().quantile_row(quantile)  # type: ignore[operator]

    def min_market_capitalization(self, quantile: float = 0.1):
        return self.capitalization() > self.capitalization().quantile_row(quantile)  # type: ignore[operator]

    def closing_price_below_market_classification(self, quantile: float = 0.9):
        return self.close <= self.close.quantile_row(quantile)  # type: ignore[operator]

    def closing_price_uper_market_classification(self, quantile: float = 0.1):
        return self.close >= self.close.quantile_row(quantile)  # type: ignore[operator]

    # ── 其他 ──────────────────────────────────────────────────────────────

    def geometric(self, timeperiod: int = 12):
        daily = self.adj_close.pct_change() + 1
        product = daily.copy()
        for i in range(1, timeperiod):
            product = product * daily.shift(i)
        return product ** (1 / timeperiod) - 1
