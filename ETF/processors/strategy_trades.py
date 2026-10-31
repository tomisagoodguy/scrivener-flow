"""策略持有期間推導與計價（換股後表現）。

從策略 `get_positions()` 的完整歷史推導每段持有期間，
再以「訊號日隔一個交易日的開盤價」計算進出場價與還原報酬。
純函式，不碰資料庫，由 StrategyTradeStep 呼叫。
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import pandas as pd


@dataclass(frozen=True)
class TradeEpisode:
    """某股票的一段持有期間（strategy_id 由呼叫端補上）。"""

    stock_id: str
    entry_signal_date: date
    exit_signal_date: date | None


def _to_datetime_index(index: pd.Index) -> pd.DatetimeIndex:
    try:
        return pd.DatetimeIndex(pd.to_datetime(index))
    except (ValueError, TypeError) as e:
        raise ValueError(f"positions index 無法轉成日期: {e}") from e


def derive_trade_episodes(positions: pd.DataFrame, since: date) -> list[TradeEpisode]:
    """依連續為真的列切出持有期間。

    Args:
        positions: index＝訊號日、columns＝股票代號；值為布林或權重，NaN/0/False 視為未持有。
        since: 已出場期間只保留出場訊號日 >= since 者（長期持有、近期才出場者仍保留）；持有中期間一律保留。

    Returns:
        依股票代號、進場訊號日排序的持有期間。

    Raises:
        ValueError: index 無法轉成日期。
    """
    if positions.empty:
        return []

    df = pd.DataFrame(positions).copy()
    df.index = _to_datetime_index(df.index)
    df = df.sort_index()
    held = df.fillna(False).astype(bool)
    prev = held.shift(1, fill_value=False)
    entries = held & ~prev
    exits = ~held & prev

    episodes: list[TradeEpisode] = []
    for stock_id in sorted(held.columns, key=str):
        entry_dates = [d.date() for d in held.index[entries[stock_id].to_numpy()]]
        exit_dates = [d.date() for d in held.index[exits[stock_id].to_numpy()]]
        for i, entry in enumerate(entry_dates):
            exit_ = exit_dates[i] if i < len(exit_dates) else None
            if exit_ is not None and exit_ < since:
                continue
            episodes.append(TradeEpisode(str(stock_id), entry, exit_))
    return episodes


def _value(df: pd.DataFrame, day: pd.Timestamp | None, stock_id: str) -> float | None:
    """取單一價格；缺欄、缺日或 NaN 回傳 None。"""
    if day is None or stock_id not in df.columns or day not in df.index:
        return None
    v = df.at[day, stock_id]
    return None if pd.isna(v) else float(v)


def _next_trading_day(trading_days: pd.DatetimeIndex, signal: date) -> pd.Timestamp | None:
    pos = trading_days.searchsorted(pd.Timestamp(signal), side="right")
    return trading_days[pos] if pos < len(trading_days) else None


def _adjusted_open(
    open_: pd.DataFrame, close: pd.DataFrame, adj_close: pd.DataFrame, day: pd.Timestamp | None, stock_id: str
) -> float | None:
    """還原開盤價 = 開盤 × 還原收盤 ÷ 收盤（同日同股）。"""
    o, c, a = (_value(df, day, stock_id) for df in (open_, close, adj_close))
    if o is None or c is None or a is None or c == 0:
        return None
    return o * a / c


def _ratio(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator - 1


def _iso(day: pd.Timestamp | None) -> str | None:
    return day.date().isoformat() if day is not None else None


def price_trade_episodes(
    episodes: list[TradeEpisode],
    open_: pd.DataFrame,
    close: pd.DataFrame,
    adj_close: pd.DataFrame,
) -> list[dict]:
    """以訊號日隔一個交易日的開盤價計價，並計算還原報酬。

    交易日以 `open_` 的 index 為準。出場訊號尚無下一交易日時（隔日開盤未發生），
    出場日／價為 None，報酬視同持有中算到最新收盤。

    Returns:
        可直接 upsert 至 strategy_trades 的 row dict（不含 strategy_id）；報酬為小數。
    """
    open_ = pd.DataFrame(open_).sort_index()
    close = pd.DataFrame(close).sort_index()
    adj_close = pd.DataFrame(adj_close).sort_index()
    trading_days = pd.DatetimeIndex(open_.index)

    rows: list[dict] = []
    for ep in episodes:
        sid = ep.stock_id
        entry_day = _next_trading_day(trading_days, ep.entry_signal_date)
        exit_day = _next_trading_day(trading_days, ep.exit_signal_date) if ep.exit_signal_date else None
        latest_day = close[sid].last_valid_index() if sid in close.columns else None

        entry_adj = _adjusted_open(open_, close, adj_close, entry_day, sid)
        latest_adj = _value(adj_close, latest_day, sid)
        if exit_day is not None:
            exit_adj = _adjusted_open(open_, close, adj_close, exit_day, sid)
            holding = _ratio(exit_adj, entry_adj)
            post_exit = _ratio(latest_adj, exit_adj)
        else:
            holding = _ratio(latest_adj, entry_adj)
            post_exit = None

        rows.append(
            {
                "stock_id": sid,
                "entry_signal_date": ep.entry_signal_date.isoformat(),
                "entry_date": _iso(entry_day),
                "entry_price": _value(open_, entry_day, sid),
                "exit_signal_date": ep.exit_signal_date.isoformat() if ep.exit_signal_date else None,
                "exit_date": _iso(exit_day),
                "exit_price": _value(open_, exit_day, sid),
                "latest_date": _iso(latest_day),
                "latest_close": _value(close, latest_day, sid),
                "holding_return": holding,
                "post_exit_return": post_exit,
            }
        )
    return rows
