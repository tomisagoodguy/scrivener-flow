"""買進模式前瞻報酬與平常日基準統計。

純函式運算，不碰 DB：`BuyingPatternStep` 與 `backfill_future_returns.py` 共用同一套
前瞻報酬口徑，統計結果由步驟寫入 `etf_buying_pattern_stats`。

前瞻報酬口徑：以起始日收盤為基準，目標日 = 起始日 + h 個日曆天；
目標日無價時往後最多找 NEXT_TRADING_SCAN_DAYS 天，仍無價則不估計。
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, TypeAlias

import numpy as np

PriceLookup: TypeAlias = dict[tuple[str, str], float]

HORIZONS: tuple[int, ...] = (1, 2, 3, 5, 7, 10, 15, 20, 25, 30)
NEXT_TRADING_SCAN_DAYS = 2


def _as_date(value: date | str) -> date:
    return value if isinstance(value, date) else date.fromisoformat(value)


def _as_dict(value: dict[str, Any] | str | None) -> dict[str, Any]:
    if isinstance(value, str):
        return json.loads(value)
    return value or {}


def forward_return(
    stock_code: str, start: date, horizon: int, price_lookup: PriceLookup
) -> float | None:
    """起始日收盤到 start + horizon 日曆天（無價往後最多找 2 天）的報酬，無法計算回 None。"""
    close_t = price_lookup.get((stock_code, start.isoformat()))
    if not close_t:
        return None
    target = start + timedelta(days=horizon)
    for offset in range(NEXT_TRADING_SCAN_DAYS + 1):
        close_td = price_lookup.get((stock_code, (target + timedelta(days=offset)).isoformat()))
        if close_td is not None:
            return round((close_td - close_t) / close_t, 6)
    return None


def due_missing_horizons(
    future_returns: dict[str, Any] | str | None, event_date: date | str, today: date
) -> list[int]:
    """已到期（event_date + h <= today）且尚無值的天期。"""
    existing = _as_dict(future_returns)
    start = _as_date(event_date)
    return [
        h
        for h in HORIZONS
        if start + timedelta(days=h) <= today and existing.get(str(h)) is None
    ]


def compute_missing_returns(
    event: dict[str, Any], price_lookup: PriceLookup, today: date
) -> dict[str, float]:
    """回傳事件缺少且已到期天期的報酬（key 為天期字串），不覆蓋既有值。"""
    start = _as_date(event["event_date"])
    new_data: dict[str, float] = {}
    for h in due_missing_horizons(event.get("future_returns"), start, today):
        value = forward_return(event["stock_code"], start, h, price_lookup)
        if value is not None:
            new_data[str(h)] = value
    return new_data


def plan_return_updates(
    events: list[dict[str, Any]], price_lookup: PriceLookup, today: date
) -> list[tuple[int, dict[str, float]]]:
    """所有事件中可補值者的 (id, 新增天期報酬)；不截斷、不含無可補值的事件。"""
    updates: list[tuple[int, dict[str, float]]] = []
    for event in events:
        new_data = compute_missing_returns(event, price_lookup, today)
        if new_data:
            updates.append((event["id"], new_data))
    return updates


# ---------------------------------------------------------------------------
# 平常日基準與週區塊重抽
# ---------------------------------------------------------------------------

WeekKey: TypeAlias = tuple[int, int]  # (ISO 年, ISO 週)
Sample: TypeAlias = tuple[WeekKey, float]

BOOTSTRAP_N = 5000
BOOTSTRAP_SEED = 20261101
MIN_EVENTS = 30
MIN_WEEKS = 8


def week_key(day: date) -> WeekKey:
    iso = day.isocalendar()
    return (iso[0], iso[1])


def build_baseline_samples(
    stock_codes: list[str] | set[str], start: date, end: date, price_lookup: PriceLookup
) -> dict[int, list[Sample]]:
    """同一批股票在 [start, end] 每個有收盤價的交易日，各天期的（週, 前瞻報酬）樣本。"""
    codes = set(stock_codes)
    samples: dict[int, list[Sample]] = {h: [] for h in HORIZONS}
    for stock, day_str in sorted(price_lookup):
        if stock not in codes:
            continue
        day = date.fromisoformat(day_str)
        if not start <= day <= end:
            continue
        for h in HORIZONS:
            value = forward_return(stock, day, h, price_lookup)
            if value is not None:
                samples[h].append((week_key(day), value))
    return samples


@dataclass(frozen=True)
class ExcessCI:
    """超額（模式 − 基準）勝率與平均報酬的 95% 區間，皆為小數。"""

    win_lo: float
    win_hi: float
    ret_lo: float
    ret_hi: float


def _week_totals(samples: list[Sample], weeks: list[WeekKey]) -> np.ndarray:
    """每週（筆數, 勝數, 報酬和），列順序同 weeks。"""
    index = {w: i for i, w in enumerate(weeks)}
    totals = np.zeros((len(weeks), 3))
    for w, value in samples:
        row = totals[index[w]]
        row[0] += 1
        row[1] += value > 0
        row[2] += value
    return totals


def bootstrap_excess(
    event_samples: list[Sample],
    baseline_samples: list[Sample],
    n_boot: int = BOOTSTRAP_N,
    seed: int = BOOTSTRAP_SEED,
) -> ExcessCI | None:
    """區塊配對重抽：模式與基準用同一組抽樣區塊。事件 < MIN_EVENTS 或 < MIN_WEEKS 個區塊回 None。

    區塊鍵可為任意可排序值：買進模式用 ISO 週 (年, 週)，融資說明卡用 (年, 月)。
    值為 0/1 時「超額報酬」即比例差。
    """
    if len(event_samples) < MIN_EVENTS or len({w for w, _ in event_samples}) < MIN_WEEKS:
        return None
    # 只從有基準樣本的週抽；沒有基準的週其事件無從比較，不納入
    weeks = sorted({w for w, _ in baseline_samples})
    week_set = set(weeks)
    event_samples = [s for s in event_samples if s[0] in week_set]
    if not event_samples:
        return None
    ev = _week_totals(event_samples, weeks)
    base = _week_totals(baseline_samples, weeks)

    rng = np.random.default_rng(seed)
    picks = rng.integers(0, len(weeks), size=(n_boot, len(weeks)))
    counts = np.zeros((n_boot, len(weeks)))
    np.add.at(counts, (np.arange(n_boot)[:, None], picks), 1)

    ev_sum = counts @ ev
    base_sum = counts @ base
    with np.errstate(divide="ignore", invalid="ignore"):
        ev_n = np.where(ev_sum[:, 0] > 0, ev_sum[:, 0], np.nan)
        base_n = np.where(base_sum[:, 0] > 0, base_sum[:, 0], np.nan)
        excess_win = ev_sum[:, 1] / ev_n - base_sum[:, 1] / base_n
        excess_ret = ev_sum[:, 2] / ev_n - base_sum[:, 2] / base_n

    win_lo, win_hi = np.nanpercentile(excess_win, [2.5, 97.5])
    ret_lo, ret_hi = np.nanpercentile(excess_ret, [2.5, 97.5])
    return ExcessCI(float(win_lo), float(win_hi), float(ret_lo), float(ret_hi))


def _rate_and_mean(values: list[float]) -> tuple[float, float]:
    return sum(v > 0 for v in values) / len(values), sum(values) / len(values)


def build_stats_rows(
    events: list[dict[str, Any]], price_lookup: PriceLookup
) -> list[dict[str, Any]]:
    """每（模式, 天期）一列：模式統計、同期平常日基準、超額區間；對應 etf_buying_pattern_stats 欄位。"""
    if not events:
        return []
    dates = [_as_date(e["event_date"]) for e in events]
    period_start, period_end = min(dates), max(dates)
    baseline = build_baseline_samples(
        {e["stock_code"] for e in events}, period_start, period_end, price_lookup
    )

    by_pattern: dict[str, dict[int, list[Sample]]] = {}
    for event, day in zip(events, dates):
        stored = _as_dict(event.get("future_returns"))
        samples = by_pattern.setdefault(event["pattern_type"], {h: [] for h in HORIZONS})
        for h in HORIZONS:
            value = stored.get(str(h))
            if value is not None:
                samples[h].append((week_key(day), float(value)))

    rows: list[dict[str, Any]] = []
    for pattern_type, per_horizon in sorted(by_pattern.items()):
        for h in HORIZONS:
            ev = per_horizon[h]
            base = baseline[h]
            if not ev or not base:
                continue
            win_rate, avg_return = _rate_and_mean([v for _, v in ev])
            base_win, base_avg = _rate_and_mean([v for _, v in base])
            ci = bootstrap_excess(ev, base)
            rows.append({
                "pattern_type": pattern_type,
                "horizon": h,
                "n": len(ev),
                "n_weeks": len({w for w, _ in ev}),
                "win_rate": win_rate,
                "avg_return": avg_return,
                "baseline_n": len(base),
                "baseline_win_rate": base_win,
                "baseline_avg_return": base_avg,
                "excess_win_lo": ci.win_lo if ci else None,
                "excess_win_hi": ci.win_hi if ci else None,
                "excess_ret_lo": ci.ret_lo if ci else None,
                "excess_ret_hi": ci.ret_hi if ci else None,
                "period_start": period_start,
                "period_end": period_end,
            })
    return rows
