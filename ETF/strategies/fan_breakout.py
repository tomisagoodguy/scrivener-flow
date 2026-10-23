"""均線發散突破 (fan_breakout) 候選篩選策略。

每日輸出「均線發散 + 營收確認」的候選股，定位為人工看圖的候選清單（非自動下單）。
Spec：openspec/changes/fan-breakout-screener/specs/fan-breakout-strategy/spec.md

入選條件（當日全部成立，以還原收盤價計算，K = 5 個交易日）：
  1. 多頭排列：MA5 > MA10 > MA20 > MA60 > MA120
  2. 五條均線皆高於 K 個交易日前
  3. 發散：spread = MA5 / MA120 - 1 高於 K 個交易日前
  4. 流動性：20 日均量 > 500,000 股
  5. 營收創高：2 月均營收 == 近 9 個月 2 月均營收最大值（至少 6 筆）
  6. 營收動能：YoY 連 6 月 > 0、6 月平均 > 25、且 YoY 較前期上升

股票池限上市櫃普通股（代號 ^[1-9]\\d{3}$）。月營收條件依公告日 ffill 對齊到日頻，
輸出保持日頻（不 reindex 到營收揭露日，避免每月停更約 3 週）。
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from ETF.strategies.base_strategy import BaseStrategy

if TYPE_CHECKING:
    from ETF.strategies.shared_cache import StrategyDataCache

logger = logging.getLogger(__name__)

K = 5
MA_PERIODS = (5, 10, 20, 60, 120)
VOLUME_WINDOW = 20
MIN_AVG_VOLUME = 500_000  # 股
REPEAT_WINDOW = 10  # 前 10 個交易日（不含當日）曾入選 → "repeat"
RECENT_WINDOW = 120  # recent_signal_dates 回看的交易日數（含當日）
_COMMON_STOCK_ID = re.compile(r"^[1-9]\d{3}$")
# 入選股的部位值 = 當日 spread（四捨五入到 4 位）。StrategySignalStep 以「值為真」判斷入選，
# 故入選者至少為 _MIN_SCORE，避免極小 spread 被四捨五入成 0 而誤判為未入選。
_MIN_SCORE = 1e-4
# FinLab security_categories 的 market 值 → 顯示用市場別；其餘（etf、rotc、pub…）為 None
_MARKET_LABELS = {"sii": "上市", "otc": "上櫃"}


def _moving_averages(close: pd.DataFrame) -> dict[int, pd.DataFrame]:
    """各週期簡單移動平均。需滿窗才有值（歷史不足 → NaN → 不入選）。"""
    return {period: close.rolling(period).mean() for period in MA_PERIODS}


def _technical_conditions(
    ma: dict[int, pd.DataFrame],
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """條件 1–3。回傳 (技術面是否成立, spread = MA5 / MA120 - 1)。NaN 比較一律為 False。"""
    aligned = (
        (ma[5] > ma[10]) & (ma[10] > ma[20]) & (ma[20] > ma[60]) & (ma[60] > ma[120])
    )
    rising = ma[MA_PERIODS[0]] > ma[MA_PERIODS[0]].shift(K)
    for period in MA_PERIODS[1:]:
        rising = rising & (ma[period] > ma[period].shift(K))
    spread = ma[5] / ma[120] - 1
    diverging = spread > spread.shift(K)
    return aligned & rising & diverging, spread


def _revenue_conditions(
    rev: pd.DataFrame, yoy: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """條件 5、6（月頻，index 為營收公告日）。與 trend_template / fundamental_momentum 同定義。"""
    rev_ma2 = rev.average(2)  # type: ignore[operator]
    revenue_high = rev_ma2 == rev_ma2.rolling(9, min_periods=6).max()
    revenue_momentum = (
        (yoy > 0).sustain(6)  # type: ignore[operator]
        & (yoy.average(6) > 25)  # type: ignore[operator]
        & yoy.rise()  # type: ignore[operator]
    )
    return revenue_high, revenue_momentum


def _to_daily(
    condition: pd.DataFrame, index: pd.DatetimeIndex, columns: list[str]
) -> pd.DataFrame:
    """把月頻條件依公告日 ffill 到交易日（bool）。無資料的股票/日期為 False。"""
    if not isinstance(condition.index, pd.DatetimeIndex):
        condition = condition.index_str_to_date()  # type: ignore[operator]
    if not isinstance(condition.index, pd.DatetimeIndex):
        raise ValueError("月營收 index 無法轉為公告日（DatetimeIndex），無法對齊日頻")
    aligned = (
        condition.astype(float)
        .reindex(condition.index.union(index))
        .ffill()
        .reindex(index)
        .reindex(columns=columns)
    )
    return aligned.fillna(0).astype(bool)


def _trailing_true_count(flags: np.ndarray) -> int:
    """從最後一列往回連續為 True 的個數。"""
    reversed_flags = flags[::-1]
    if reversed_flags.all():
        return len(reversed_flags)
    return int(reversed_flags.argmin())


def _load_market_labels() -> dict[str, str]:
    """stock_id -> "上市" / "上櫃"（FinLab security_categories，非時間序列）。

    讀取失敗時 log warning 並回傳空 dict，使所有 market 為 None（不影響入選與其他欄位）。
    """
    from finlab import data

    try:
        categories = data.get("security_categories")
        return {
            str(stock_id): _MARKET_LABELS[market]
            for stock_id, market in zip(categories["stock_id"], categories["market"])
            if market in _MARKET_LABELS
        }
    except Exception as e:
        logger.warning(
            "[fan_breakout] security_categories 讀取失敗，market 一律為 null: %s", e
        )
        return {}


def _format_date(timestamp) -> str:
    return (
        timestamp.strftime("%Y-%m-%d")
        if hasattr(timestamp, "strftime")
        else str(timestamp)[:10]
    )


class FanBreakoutStrategy(BaseStrategy):
    """均線發散 + 營收確認的候選篩選器（日頻）。"""

    strategy_id = "fan_breakout"
    description = "均線發散突破"

    def __init__(self) -> None:
        # get_positions 的中間結果，供 get_signal_metadata 重用（index=交易日, columns=股票池）
        self._selected: pd.DataFrame | None = None
        self._spread: pd.DataFrame | None = None

    def get_positions(self, cache: "StrategyDataCache | None" = None):
        """回傳日頻部位：入選為當日 spread（> 0），未入選為 0.0；StrategySignalStep 取其 score。"""
        from finlab.dataframe import FinlabDataFrame

        self._selected = None
        self._spread = None

        close_raw, volume_raw, rev_raw, yoy_raw = self._load_inputs(cache)

        stock_ids = [
            str(c) for c in close_raw.columns if _COMMON_STOCK_ID.match(str(c))
        ]
        close = FinlabDataFrame(close_raw[stock_ids])
        volume = FinlabDataFrame(volume_raw).reindex(
            index=close.index, columns=stock_ids
        )

        technical, spread = _technical_conditions(_moving_averages(close))
        liquid = volume.rolling(VOLUME_WINDOW).mean() > MIN_AVG_VOLUME

        revenue_high, revenue_momentum = _revenue_conditions(
            FinlabDataFrame(rev_raw), FinlabDataFrame(yoy_raw)
        )
        revenue_ok = _to_daily(revenue_high, close.index, stock_ids) & _to_daily(
            revenue_momentum, close.index, stock_ids
        )

        selected = technical & liquid & revenue_ok
        self._selected = selected
        self._spread = spread

        return spread.round(4).clip(lower=_MIN_SCORE).where(selected, 0.0)

    def get_signal_metadata(
        self, cache: "StrategyDataCache | None" = None
    ) -> dict[str, dict] | None:
        """最新交易日入選股的中繼資料（寫入 strategy_signals.conditions）。

        重用 get_positions 存在實例上的中間結果；尚未計算時才以 cache 計算一次。
        """
        if self._selected is None or self._spread is None:
            self.get_positions(cache)
        selected, spread = self._selected, self._spread
        if selected is None or spread is None or selected.empty:
            return {}

        latest = selected.iloc[-1]
        stock_ids = [str(c) for c in latest.index[latest.to_numpy(dtype=bool)]]
        if not stock_ids:
            return {}

        markets = _load_market_labels()
        prior = selected.iloc[-1 - REPEAT_WINDOW : -1]
        recent = selected.iloc[-RECENT_WINDOW:]

        metadata: dict[str, dict] = {}
        for stock_id in stock_ids:
            metadata[stock_id] = {
                "signal_type": "repeat" if prior[stock_id].any() else "first",
                "consec_days": _trailing_true_count(
                    selected[stock_id].to_numpy(dtype=bool)
                ),
                "spread": round(float(spread[stock_id].iloc[-1]), 4),
                "market": markets.get(stock_id),
                "recent_signal_dates": [
                    _format_date(ts)
                    for ts in recent.index[recent[stock_id].to_numpy(dtype=bool)]
                ],
            }
        return metadata

    @staticmethod
    def _load_inputs(cache: "StrategyDataCache | None"):
        """(還原收盤價, 成交股數, 月營收, 營收 YoY)。cache 為 None 時自行下載。"""
        if cache is not None:
            return cache.adj_close, cache.v, cache.rev, cache.rev_yoy

        from finlab import data

        return (
            data.get("etl:adj_close"),
            data.get("price:成交股數"),
            data.get("monthly_revenue:當月營收"),
            data.get("monthly_revenue:去年同月增減(%)"),
        )
