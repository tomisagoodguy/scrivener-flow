"""個股分析層：純計算，不依賴外部 I/O，易於單元測試。"""

import logging
import pandas as pd

logger = logging.getLogger(__name__)


class StockAnalyzer:
    """將個股技術指標與籌碼分析邏輯封裝為可獨立測試的純計算層。"""

    def analyze(
        self,
        code: str,
        prices_df: pd.DataFrame,
        broker_df: pd.DataFrame,
        chips_df: pd.DataFrame,
    ) -> dict | None:
        """分析單一股票的技術面與籌碼面。

        Args:
            code: 股票代碼。
            prices_df: 含 stock_code / data_date / close / it_buy 欄位的 DataFrame。
            broker_df: 含 stock_code / data_date / net_volume 欄位的 DataFrame。
            chips_df: 含 stock_code / data_date / shareholder_tier / custody_ratio 欄位的 DataFrame。

        Returns:
            分析結果 dict；資料筆數 < 20 時回傳 None。
        """
        stock_prices = (
            prices_df[prices_df["stock_code"] == code]
            .sort_values("data_date", ascending=False)
        )

        if len(stock_prices) < 20:
            return None

        # ── 技術指標 ──────────────────────────────────────────────────────────
        closes = stock_prices["close"].astype(float).tolist()
        last_close = closes[0]
        ma5 = sum(closes[:5]) / 5
        ma20 = sum(closes[:20]) / 20

        # 趨勢判斷
        trend = "Neutral"
        if last_close > ma5 > ma20:
            trend = "Bullish"
        elif last_close < ma5 < ma20:
            trend = "Bearish"

        # MA20 斜率
        ma20_trend = "Flat"
        if len(closes) >= 21:
            ma20_prev = sum(closes[1:21]) / 20
            if ma20 > ma20_prev:
                ma20_trend = "Rising"
            elif ma20 < ma20_prev:
                ma20_trend = "Falling"

        # 近 3 個月過熱偵測（約 60 個交易日）
        history_3m = closes[:60]
        max_price_3m = max(history_3m)
        min_price_3m = min(history_3m)
        is_overheated = False
        if min_price_3m > 0:
            surge_ratio = (max_price_3m - min_price_3m) / min_price_3m
            if surge_ratio >= 1.0:
                is_overheated = True

        # ── 籌碼指標 ──────────────────────────────────────────────────────────
        it_buys = stock_prices["it_buy"].fillna(0).astype(float).tolist()
        it_buy5d = sum(it_buys[:5])

        stock_broker = (
            broker_df[broker_df["stock_code"] == code]
            if not broker_df.empty
            else pd.DataFrame()
        )
        broker_net_buy_20d = (
            float(stock_broker["net_volume"].fillna(0).sum())
            if not stock_broker.empty
            else 0.0
        )

        # 大戶持股趨勢（Tier 15）
        large_trend = "Stable"
        if not chips_df.empty:
            stock_chips = (
                chips_df[chips_df["stock_code"] == code]
                .sort_values("data_date", ascending=False)
            )
            large_chips = stock_chips[stock_chips["shareholder_tier"] == 15]
            if len(large_chips) >= 2:
                curr = float(large_chips.iloc[0]["custody_ratio"])
                prev = float(large_chips.iloc[1]["custody_ratio"])
                if curr > prev + 0.5:
                    large_trend = "Increasing"
                elif curr < prev - 0.5:
                    large_trend = "Decreasing"

        # ── 新增指標 ──────────────────────────────────────────────────────────
        # 波動率 (20日年化)
        volatility = 0.0
        if len(closes) >= 20:
            returns = pd.Series(closes[:21]).pct_change().dropna()
            # 簡單計算：20日標準差 * sqrt(252)
            # 若 returns 不足 20 筆則儘量算
            std_dev = returns.std()
            if not pd.isna(std_dev):
                volatility = std_dev * (252**0.5) * 100

        # 資使用率 (最新)
        margin_ratio = 0.0
        if "margin_ratio" in stock_prices.columns:
            val = stock_prices.iloc[0]["margin_ratio"]
            if not pd.isna(val):
                margin_ratio = float(val)

        return {
            "code": code,
            "lastClose": last_close,
            "ma5": round(ma5, 2),
            "ma20": round(ma20, 2),
            "trend": trend,
            "ma20Trend": ma20_trend,
            "isOverheated3M": is_overheated,
            "highestPrice3M": max_price_3m,
            "itBuy5d": it_buy5d,
            "brokerNetBuy20d": broker_net_buy_20d,
            "largeShareholderTrend": large_trend,
            "volatility": round(volatility, 2),
            "marginRatio": round(margin_ratio, 2),
        }
