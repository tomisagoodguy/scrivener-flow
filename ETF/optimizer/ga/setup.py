"""DEAP toolbox 初始化。"""

from __future__ import annotations

import multiprocessing
import random
from multiprocessing.pool import Pool

from deap import base, creator, tools


def setup_toolbox(
    evaluate_fn,
    config: dict,
    conditions_df: dict,
    *,
    pool: Pool | None = None,
) -> base.Toolbox:
    """建立 DEAP toolbox。

    pool 由呼叫端管理生命週期（建議用 with multiprocessing.Pool() as pool 傳入後傳入），
    不傳入時自動建立（僅適合單次呼叫，迴圈中請傳入共享 pool 以避免資源洩漏）。
    """
    strategy_mode   = config['strategy_mode']
    min_features    = config.get('min_num_features', 3)
    max_features    = config.get('max_num_features', 5)
    total_cond      = len(conditions_df)

    # 防止 Jupyter 重複建立 creator 類別
    if 'FitnessMax' not in creator.__dict__:
        creator.create("FitnessMax", base.Fitness, weights=(1.0,))
    if 'Individual' not in creator.__dict__:
        creator.create("Individual", list, fitness=creator.FitnessMax)  # type: ignore[attr-defined]

    toolbox = base.Toolbox()

    if strategy_mode == 'Machine_Learning':
        toolbox.register("map", map)
    else:
        if pool is None:
            ncpu = multiprocessing.cpu_count()
            pool = multiprocessing.Pool(processes=ncpu)
        ncpu = pool._processes  # type: ignore[attr-defined]
        toolbox.register("map", pool.map, chunksize=max(1, ncpu * 5))

    def _init_individual():
        n = random.randint(min_features, max_features)
        ind = [0] * total_cond
        for i in random.sample(range(total_cond), min(n, total_cond)):
            ind[i] = 1
        return creator.Individual(ind)  # type: ignore[attr-defined]

    toolbox.register("individual", _init_individual)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)  # type: ignore[attr-defined]
    toolbox.register("evaluate",   evaluate_fn, config=config, conditions_df=conditions_df)
    toolbox.register("mate",       tools.cxTwoPoint)
    toolbox.register("mutate",     tools.mutFlipBit, indpb=0.05)
    toolbox.register("select",     tools.selTournament, tournsize=3)

    return toolbox
