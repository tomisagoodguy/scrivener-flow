"""GA 工具函式 — 條件載入、評估命名空間、結果印出。"""

from __future__ import annotations

import argparse
import glob
import logging
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np
import yaml
from finlab import data

from ETF.optimizer.condition_pool import BuyCondition


logger = logging.getLogger(__name__)


# ── 命名空間 ──────────────────────────────────────────────────────────────

def get_namespaces() -> dict[str, Any]:
    """回傳 YAML 條件可用的所有變數。"""
    c = BuyCondition()
    return {
        'c':                                c,
        'data':                             data,
        'rev':                              c.revenue,
        'close':                            c.close,
        'volume':                           c.volume,
        'pe':                               c.pe.fillna(0),
        'pb_ratio':                         c.pb,
        'boss_hold':                        c.boss_hold_data,
        'margin_transactions':              c.margin_transactions,
        'margin_trading_utilization_ratio': c.margin_utilization,
        'other_income':                     c.other_income,
        'turnover':                         c.turnover,
        'ope_earn':                         c.ope_earn,
        'gross_rate':                       c.gross_rate,
        'rev_yoy_growth':                   c.rev_year_growth,
        'np':                               np,
    }


# ── 條件載入 ──────────────────────────────────────────────────────────────

def read_yaml(yaml_paths: list[str]) -> dict:
    """讀取一或多個 YAML 路徑（檔案或目錄），合併為條件字典。"""
    result: dict = {}
    for p in yaml_paths:
        path = Path(p)
        files = list(path.glob('*.yaml')) if path.is_dir() else [path]
        for f in files:
            with open(f, encoding='utf-8') as fh:
                result.update(yaml.safe_load(fh) or {})
    return result


def check_conditions(
    conditions_yaml: dict,
    params: dict,
    fast_mode: bool = False,
    pickle_folder: str | None = None,
) -> dict:
    """計算或從快取載入每個條件的 DataFrame。"""
    folder = pickle_folder or os.environ.get('PICKLE_FOLDER', './optimizer_cache')
    Path(folder).mkdir(parents=True, exist_ok=True)

    namespace = get_namespaces()
    namespace['kwargs'] = params

    result: dict = {}
    for key, value_list in conditions_yaml.items():
        condition_str = value_list[0]
        param_val = params.get(key)
        if param_val is not None:
            suffix = str(param_val).replace('.', '_')
        else:
            suffix = 'default'
        df_key = f"{key}_{suffix}"

        if fast_mode:
            if df_key not in result:
                result[df_key] = eval(condition_str, namespace)  # noqa: S307
        else:
            cache_file = Path(folder) / f"{df_key}.pkl"
            if cache_file.exists():
                result[df_key] = str(cache_file)
            else:
                df = eval(condition_str, namespace)  # noqa: S307
                with open(cache_file, 'wb') as fh:
                    pickle.dump(df, fh)
                result[df_key] = str(cache_file)

    return result


def load_condition(condition_data, fast_mode: bool) -> Any:
    """根據模式回傳 DataFrame（fast_mode）或從 pkl 載入。"""
    if fast_mode:
        return condition_data
    with open(condition_data, 'rb') as fh:
        return pickle.load(fh)  # noqa: S301


# ── 條件組合 ──────────────────────────────────────────────────────────────

def combine_selected_conditions(
    selected: list,
    strategy_mode: str,
    conditions_yaml: dict | None = None,
) -> Any:
    """依策略模式組合條件。"""
    all_cond = selected[0]
    if strategy_mode == 'Compound_Conditions':
        for c in selected[1:]:
            all_cond &= c
    elif strategy_mode in ('Scoring_System', 'Scoring_System_con'):
        for c in selected[1:]:
            vals = c.astype(float).values
            weight = 10.0 if np.isin(vals, [0, 1]).all() else 1.0
            all_cond = all_cond + c.astype(float) * weight
    elif strategy_mode == 'Machine_Learning':
        all_cond = {
            k: c.astype(float)
            for k, c in zip((conditions_yaml or {}).keys(), selected)
        }
    else:
        raise ValueError(f"未知策略模式：{strategy_mode!r}")
    return all_cond


# ── CLI 引數 ──────────────────────────────────────────────────────────────

def filter_by_group(conditions_yaml: dict, group: str | None) -> dict:
    """保留 group 欄位符合指定值的條件；group=None 時回傳全部。"""
    if not group:
        return conditions_yaml
    return {
        k: v for k, v in conditions_yaml.items()
        if len(v) >= 3 and v[2] == group
    }


def parse_args(defaults: dict) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='GA Strategy Optimizer')
    parser.add_argument('--num_combinations', type=int,  default=defaults.get('num_combinations', 1000))
    parser.add_argument('--ngen',             type=int,  default=defaults.get('ngen', 110))
    parser.add_argument('--population_size',  type=int,  default=defaults.get('population_size', 50))
    parser.add_argument('--crossover_prob',   type=float, default=defaults.get('crossover_prob', 0.5))
    parser.add_argument('--mutation_prob',    type=float, default=defaults.get('mutation_prob', 0.2))
    parser.add_argument('--min_trades',       type=int,  default=defaults.get('min_trades', 200))
    parser.add_argument('--score_mode',       type=str,  default=defaults.get('score_mode', 'single'))
    parser.add_argument('--group',            type=str,  default=None,
                        help='只跑指定 group 的條件（revenue/quality/value/size/momentum/volume/chips/market）')
    return parser.parse_known_args()[0]


# ── 結果 ──────────────────────────────────────────────────────────────────

def convert_int64(obj: Any) -> Any:
    """遞迴將 numpy.int64 轉為 Python int。"""
    import numpy
    if isinstance(obj, dict):
        return {k: convert_int64(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_int64(v) for v in obj]
    if isinstance(obj, numpy.integer):
        return int(obj)
    return obj


def print_best(best_individual, metrics: dict, selected_features: list) -> None:
    print(f"\n最佳組合: {selected_features}")
    print(f"適應度: {best_individual.fitness.values[0]:.4f}")
    p = metrics.get('profitability', {})
    r = metrics.get('risk', {})
    ra = metrics.get('ratio', {})
    if 'annualReturn' in p:
        print(f"年化報酬: {p['annualReturn']:.2%}")
    if 'maxDrawdown' in r:
        print(f"最大回撤: {r['maxDrawdown']:.2%}")
    if 'sortinoRatio' in ra:
        print(f"Sortino: {ra['sortinoRatio']:.2f}")
