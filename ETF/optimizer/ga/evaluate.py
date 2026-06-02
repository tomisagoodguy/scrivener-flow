"""GA 個體評估 — 計算回測績效並回傳適應度。"""

from __future__ import annotations

import pickle
from typing import Any

import numpy as np
import pandas as pd

from ETF.optimizer.ga.compat import get_metrics_compat, get_trade_count_compat
from ETF.optimizer.ga.score import Score
from ETF.optimizer.ga.tool import combine_selected_conditions, load_condition


def evaluate(
    individual: list,
    config: dict,
    conditions_df: dict,
) -> tuple[float]:
    """DEAP 評估函式，回傳 (fitness,) tuple。

    eval_cache（Manager().dict()）：相同基因序列在跨代間直接回傳快取，
    避免重複回測同一組條件組合。
    """

    def fitness(val: float) -> tuple[float]:
        return (val,)

    cache_key = "".join(str(b) for b in individual)
    eval_cache = config.get('eval_cache')
    if eval_cache is not None and cache_key in eval_cache:
        return eval_cache[cache_key]

    raw = _compute(individual, conditions_df, config)
    result = fitness(raw)
    if eval_cache is not None:
        eval_cache[cache_key] = result
    return result


def _compute(individual: list, conditions_df: dict, config: dict) -> float:
    """計算適應度數值（不含 cache 邏輯）。"""
    if sum(individual) == 0:
        return 0.0

    selected = _get_selected(individual, conditions_df, config['fast_mode'])
    if not selected:
        return 0.0

    all_cond = combine_selected_conditions(
        selected, config['strategy_mode'], config['conditions_yaml']
    )

    if not _ic_decay_ok(all_cond, config):
        return 0.0

    try:
        report = config['get_position'](all_cond)
    except Exception as e:
        if config.get('print_enabled'):
            print(f"[回測錯誤] {e}")
        if not config.get('continue_on_error', True):
            raise
        return 0.0

    trade_count = get_trade_count_compat(report)
    if trade_count == 0:
        return 0.0

    metrics = get_metrics_compat(report)

    if metrics.get('profitability', {}).get('avgNStock', 0) < config.get('min_hold_stock', 2):
        return 0.0

    if trade_count < config.get('min_trades', 200):
        return 0.0

    return Score(metrics, config).evaluate() or 0.0


def _ic_decay_ok(position, config: dict) -> bool:
    """IC 20 天 rank correlation 均值 >= threshold 才放行（月換倉穩健性過濾）。

    threshold <= 0 或 close_df 未傳入時直接放行，不影響現有行為。
    只取近 2 年月底截面，避免計算全歷史，速度約 <0.1s。
    """
    threshold = config.get('ic_decay_threshold', 0.03)
    if threshold <= 0:
        return True

    close = config.get('close_df')
    if close is None:
        return True

    try:
        monthly = position.resample('ME').last()
        if len(monthly) < 6:
            return True
        cutoff = monthly.index[-1] - pd.DateOffset(years=2)
        dates = monthly.index[monthly.index > cutoff]
    except Exception:
        return True

    period = 20  # 交易日，對應月換倉
    close_idx = close.index
    ic_list: list[float] = []

    for date in dates:
        if date not in position.index:
            continue
        pos_row = position.loc[date].dropna()

        loc = close_idx.searchsorted(date)
        future_loc = loc + period
        if future_loc >= len(close_idx):
            continue
        future_date = close_idx[future_loc]

        if date not in close_idx:
            continue
        ret_row = (close.loc[future_date] / close.loc[date] - 1).dropna()

        common = pos_row.index.intersection(ret_row.index)
        if len(common) < 10:
            continue

        ic = pos_row[common].rank().corr(ret_row[common].rank())
        if not np.isnan(ic):
            ic_list.append(float(ic))

    if not ic_list:
        return True  # 無法計算時放行，不誤殺

    return float(np.mean(ic_list)) >= threshold


def _get_selected(individual: list, conditions_df: dict, fast_mode: bool) -> list:
    selected = []
    for i, (name, data) in enumerate(conditions_df.items()):
        if individual[i]:
            selected.append(load_condition(data, fast_mode))
    return selected
