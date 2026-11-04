"""融資創一年新高狀態與歷史跌一成統計（市場籌碼頁融資說明卡）。

純函式運算，不碰 DB：`MarginRegimeStep` 每日呼叫並寫入 `market_margin_regime_daily`。
口徑對齊 2026-11-03 重現的外部研究（2008-01～2026-08：融資創一年新高 588 天，
之後 60 日內跌一成 13.8%，平常日 20.1%，差距區間跨零）。
"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd

from ETF.analysis.buying_pattern_stats import bootstrap_excess

LOOKBACK = 250  # 一年交易日
FORWARD = 60  # 前瞻交易日
DRAWDOWN = 0.9  # 跌一成
NEAR_HIGH = 0.97  # 指數距一年高點 3% 內
STATS_START = "2008-01-01"
YUAN_PER_YI = 1e8


def compute_margin_frame(margin: pd.Series, close: pd.Series, low: pd.Series) -> pd.DataFrame:
    """每日融資一年新高、指數一年新高／近高點、之後 60 日跌一成與 60 日報酬。

    條件無法計算（不滿 250 日、前瞻不足 60 日）為 NaN，統計時排除，不當成「不成立」。

    Args:
        margin: 上市＋上櫃融資金額（元），DatetimeIndex 遞增。
        close: 加權指數收盤。
        low: 加權指數盤中最低。
    """
    idx = close.dropna().index
    margin = margin.reindex(idx).astype(float)
    close = close.reindex(idx).astype(float)
    low = low.reindex(idx).astype(float)

    def at_or_above(series: pd.Series, ratio: float = 1.0) -> pd.Series:
        rolling_max = series.rolling(LOOKBACK, min_periods=LOOKBACK).max()
        return (series >= rolling_max * ratio).astype(float).where(rolling_max.notna())

    fwd_low = low[::-1].rolling(FORWARD, min_periods=FORWARD).min()[::-1].shift(-1)
    return pd.DataFrame({
        "margin": margin,
        "close": close,
        "margin_1y_high": at_or_above(margin),
        "index_1y_high": at_or_above(close),
        "index_near_high": at_or_above(close, NEAR_HIGH),
        "dd10": (fwd_low <= close * DRAWDOWN).astype(float).where(fwd_low.notna()),
        "ret60": close.shift(-FORWARD) / close - 1,
    })


def _clean(value: float) -> float | None:
    return None if value is None or math.isnan(value) else float(value)


def _group(frame: pd.DataFrame, mask: pd.Series) -> dict[str, Any]:
    rows = frame[mask]
    return {
        "n": int(len(rows)),
        "dd10_rate": _clean(rows["dd10"].mean()) if len(rows) else None,
        "mean_ret60": _clean(rows["ret60"].mean()) if len(rows) else None,
    }


def _month_samples(frame: pd.DataFrame, mask: pd.Series) -> list[tuple[tuple[int, int], float]]:
    rows = frame[mask]
    return [((d.year, d.month), float(v)) for d, v in zip(rows.index, rows["dd10"])]


def _diff_interval(frame: pd.DataFrame, a: pd.Series, b: pd.Series) -> dict[str, float] | None:
    ci = bootstrap_excess(_month_samples(frame, a), _month_samples(frame, b))
    return None if ci is None else {"lo": ci.ret_lo, "hi": ci.ret_hi}


def compute_margin_stats(frame: pd.DataFrame) -> dict[str, Any]:
    """2008 起有完整 60 日前瞻、且一年新高可判定的日子，三組跌一成比例與差距區間。"""
    sample = frame[
        (frame.index >= STATS_START)
        & frame["dd10"].notna()
        & frame["margin_1y_high"].notna()
        & frame["index_1y_high"].notna()
    ]
    margin_high = sample["margin_1y_high"] == 1.0
    index_high_only = (sample["index_1y_high"] == 1.0) & ~margin_high
    all_days = pd.Series(True, index=sample.index)
    near = sample["index_near_high"] == 1.0
    return {
        "margin_high": _group(sample, margin_high),
        "all": _group(sample, all_days),
        "index_high_only": _group(sample, index_high_only),
        "diff": {
            "margin_high_vs_all": _diff_interval(sample, margin_high, all_days),
            "margin_high_vs_index_high_only": _diff_interval(sample, margin_high, index_high_only),
        },
        "shadow": {
            "margin_high": _clean(near[margin_high].mean()),
            "all": _clean(near.mean()),
        },
        "sample_start": sample.index[0].strftime("%Y-%m-%d") if len(sample) else None,
        "sample_end": sample.index[-1].strftime("%Y-%m-%d") if len(sample) else None,
    }


def build_margin_record(frame: pd.DataFrame, target: pd.Timestamp, stats: dict) -> dict[str, Any]:
    """target（或之前最近一日）要寫入 market_margin_regime_daily 的一列（Python 原生型別）。"""
    row = frame.loc[:target].iloc[-1]
    return {
        "date": frame.loc[:target].index[-1].strftime("%Y-%m-%d"),
        "margin_balance": round(float(row["margin"]) / YUAN_PER_YI, 2),
        "margin_1y_high": bool(row["margin_1y_high"] == 1.0),
        "index_near_high": bool(row["index_near_high"] == 1.0),
        "stats": stats,
    }
