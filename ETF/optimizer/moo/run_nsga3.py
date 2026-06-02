"""NSGA-III 多目標遺傳演算法 — 同時最佳化年化報酬、最大回撤、Sortino。

需安裝：uv add pymoo joblib
"""

from __future__ import annotations

import datetime
import json
import logging
import os
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import Parallel, delayed

from ETF.optimizer.ga.compat import get_metrics_compat, get_trade_count_compat
from ETF.optimizer.ga.tool import combine_selected_conditions, convert_int64, load_condition

logger = logging.getLogger(__name__)


def run_nsga3(conditions_df: dict, config: dict) -> dict:
    """執行 NSGA-III，最佳化三個目標：年化報酬↑、最大回撤↑、Sortino↑。"""
    from pymoo.algorithms.moo.nsga3 import NSGA3
    from pymoo.core.individual import Individual
    from pymoo.core.population import Population
    from pymoo.core.problem import ElementwiseProblem
    from pymoo.operators.crossover.pntx import TwoPointCrossover
    from pymoo.operators.mutation.bitflip import BitflipMutation
    from pymoo.operators.sampling.rnd import BinaryRandomSampling
    from pymoo.optimize import minimize
    from pymoo.util.ref_dirs import get_reference_directions

    start = datetime.datetime.now()
    strategy_name = config['strategy_name']

    class FeatureSelectionProblem(ElementwiseProblem):
        def __init__(self):
            super().__init__(
                n_var=len(conditions_df), n_obj=3,
                n_ieq_constr=0, xl=0, xu=1, type_var=int
            )
            self.min_ones = config.get('min_num_features', 3)
            self.max_ones = config.get('max_num_features', 5)

        @lru_cache(maxsize=None)
        def _evaluate_cached(self, individual_tuple: tuple) -> list[float]:
            individual = list(individual_tuple)
            if sum(individual) == 0:
                return [0.0, 0.0, 0.0]
            selected = [
                load_condition(data, config['fast_mode'])
                for i, (_, data) in enumerate(conditions_df.items())
                if individual[i]
            ]
            if not selected:
                return [0.0, 0.0, 0.0]
            all_cond = combine_selected_conditions(selected, config['strategy_mode'])
            try:
                report  = config['get_position'](all_cond)
                metrics = get_metrics_compat(report)
            except Exception:
                return [0.0, 0.0, 0.0]

            annual  = metrics.get('profitability', {}).get('annualReturn', 0)
            mdd     = abs(metrics.get('risk', {}).get('maxDrawdown', 0))
            sortino = metrics.get('ratio', {}).get('sortinoRatio', 0)
            # pymoo minimizes → negate 越大越好的目標
            return [-annual, mdd, -sortino]

        def _evaluate(self, x, out, *args, **kwargs):
            out["F"] = self._evaluate_cached(tuple(x.tolist()))

    problem   = FeatureSelectionProblem()
    ref_dirs  = get_reference_directions("das-dennis", 3, n_partitions=12)
    algorithm = NSGA3(
        ref_dirs=ref_dirs,
        pop_size=config.get('population_size', 50),
        sampling=BinaryRandomSampling(),  # type: ignore[arg-type]
        crossover=TwoPointCrossover(prob=config.get('crossover_prob', 0.5)),  # type: ignore[arg-type]
        mutation=BitflipMutation(prob=config.get('mutation_prob', 0.2)),  # type: ignore[arg-type]
        eliminate_duplicates=True,
    )

    res = minimize(problem, algorithm, ('n_gen', config.get('ngen', 110)), seed=1, verbose=True)

    if res.F is None or res.X is None:
        raise RuntimeError(f"NSGA-III 優化失敗：{strategy_name}，res.F={res.F}")

    # Pareto front — 選 Sortino 最大的那個
    best_idx  = np.argmin(res.F[:, 2])
    best_ind  = res.X[best_idx].astype(int)
    best_features = [
        name for name, flag in zip(conditions_df.keys(), best_ind) if flag
    ]

    result = {
        'strategy_name':    strategy_name,
        'algorithm':        'nsga3',
        'best_conditions':  best_features,
        'pareto_front_size': len(res.F),  # type: ignore[arg-type]
        'execution_seconds': (datetime.datetime.now() - start).total_seconds(),
        'executed_at':      datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    }
    _save_result(result, strategy_name)
    return result


def _save_result(result: dict, strategy_name: str) -> None:
    folder = Path(os.environ.get('GA_RESULTS_PATH', './optimizer_results'))
    folder.mkdir(parents=True, exist_ok=True)
    out = folder / f"{strategy_name}_nsga3.jsonl"
    with open(out, 'a', encoding='utf-8') as f:
        f.write(json.dumps(result, ensure_ascii=False) + '\n')
    logger.info(f"NSGA-III 結果已儲存：{out}")
