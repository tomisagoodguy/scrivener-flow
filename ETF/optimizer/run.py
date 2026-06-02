"""GA 策略優化器入口。

使用方式：
    uv run python ETF/optimizer/run.py

環境變數（選填）：
    PICKLE_FOLDER    條件快取目錄（預設 ./optimizer_cache）
    GA_RESULTS_PATH  結果輸出目錄（預設 ./optimizer_results）
"""

from __future__ import annotations

import ast
import logging
import multiprocessing
import os
import random
from pathlib import Path

import finlab
from finlab.backtest import sim

from ETF.optimizer.condition_pool import BuyCondition
from ETF.optimizer.ga.evaluate import evaluate
from ETF.optimizer.ga.run_ga import run_ga
from ETF.optimizer.ga.setup import setup_toolbox
from ETF.optimizer.ga.tool import check_conditions, filter_by_group, parse_args, read_yaml

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s — %(message)s',
)
logger = logging.getLogger(__name__)

# ── 回測函式（依需求修改） ────────────────────────────────────────────────

def get_position(conditions):
    """將條件轉為持倉 DataFrame 並執行回測。"""
    position = conditions
    return sim(
        position,
        resample='M',
        stop_loss=0.08,
        take_profit=0.15,
        fee_ratio=1.425 / 1000 / 3,
        tax_ratio=3 / 1000,
        upload=False,
    )


# ── 主函式 ────────────────────────────────────────────────────────────────

def main() -> None:
    finlab.login()

    close_df = BuyCondition().close

    yaml_paths = [
        os.environ.get('CONDITION_YAML_PATH',
                       str(Path(__file__).parent / 'conditions.yaml'))
    ]

    args = parse_args({
        'num_combinations': 1000,
        'ngen':             110,
        'population_size':  50,
        'crossover_prob':   0.5,
        'mutation_prob':    0.2,
        'min_trades':       200,
        'score_mode':       'single',
    })

    conditions_yaml = filter_by_group(read_yaml(yaml_paths), args.group)
    if args.group:
        logger.info(f"條件已篩選為 group={args.group!r}，共 {len(conditions_yaml)} 個條件")

    # ast.literal_eval 取代 eval：條件參數值是純 Python list，不需要完整 eval
    random_combinations = {
        tuple(random.choice(ast.literal_eval(v[1])) for v in conditions_yaml.values())
        for _ in range(args.num_combinations)
    }

    # Manager().dict() 跨進程共享 eval cache，避免相同基因序列重複回測
    manager = multiprocessing.Manager()
    eval_cache = manager.dict()

    ncpu = multiprocessing.cpu_count()
    try:
        with multiprocessing.Pool(processes=ncpu) as pool:
            for combination in random_combinations:
                params = dict(zip(conditions_yaml.keys(), combination))

                conditions_df = check_conditions(conditions_yaml, params, fast_mode=False)

                config = {
                    'strategy_name':   'ga_optimizer',
                    'strategy_mode':   'Scoring_System',
                    'conditions_yaml': conditions_yaml,
                    'get_position':    get_position,
                    'params':          params,
                    'fast_mode':       False,
                    'ngen':            args.ngen,
                    'population_size': args.population_size,
                    'crossover_prob':  args.crossover_prob,
                    'mutation_prob':   args.mutation_prob,
                    'min_num_features': 3,
                    'max_num_features': 5,
                    'min_trades':      args.min_trades,
                    'min_hold_stock':  2,
                    'score_mode':      args.score_mode,
                    'weights':         None,
                    'close_df':        close_df,
                    'ic_decay_threshold': 0.03,
                    'continue_on_error': True,
                    'print_enabled':   True,
                    'eval_cache':      eval_cache,
                }

                toolbox = setup_toolbox(evaluate, config, conditions_df, pool=pool)
                run_ga(conditions_df, toolbox, config)
    finally:
        manager.shutdown()


if __name__ == '__main__':
    main()
