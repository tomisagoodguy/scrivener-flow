"""GA 適應度計算 — single_metric 與 weighted_average 兩種模式。"""

from __future__ import annotations
import math
from collections import defaultdict
from typing import Dict


class Score:
    def __init__(self, metrics: Dict[str, Dict[str, float]], config: dict) -> None:
        self.metrics = metrics
        self.config  = config

    def evaluate(self) -> float:
        mode = self.config['score_mode']
        if mode == "single":
            return self.single_metric()
        elif mode == "weighted":
            return self.weighted_average()
        raise ValueError(f"score_mode 必須是 'single' 或 'weighted'，收到：{mode!r}")

    def single_metric(self) -> float:
        """年化報酬 / (1 - 最大回撤) × Sortino。"""
        sortino      = self.metrics['ratio'].get('sortinoRatio', 0)
        max_drawdown = 1 - self.metrics['risk'].get('maxDrawdown', 0)
        annual_return = self.metrics['profitability'].get('annualReturn', 0)
        if max_drawdown == 0:
            return 0.0
        return self._clean(annual_return / max_drawdown * sortino)

    def weighted_average(self) -> float:
        raw_weights: dict = self.config.get('weights') or {
            'annualReturn': 0.1,
            'sharpeRatio':  0.3,
            'sortinoRatio': 0.3,
            'calmarRatio':  0.1,
            'maxDrawdown':  0.6,
            'valueAtRisk':  0.2,
            'cvalueAtRisk': 0.5,
        }
        total_w = sum(raw_weights.values())
        weights = {k: v / total_w for k, v in raw_weights.items()}

        ranges = defaultdict(lambda: (0, 1), {
            'annualReturn': (0, 1),
            'sharpeRatio':  (0, 100),
            'sortinoRatio': (0, 100),
            'calmarRatio':  (0, 100),
            'maxDrawdown':  (-1, 0),
            'valueAtRisk':  (-1, 0),
            'cvalueAtRisk': (-1, 0),
        })
        all_values = {}
        for sub in self.metrics.values():
            if isinstance(sub, dict):
                all_values.update(sub)

        score = 0.0
        for metric, weight in weights.items():
            value = all_values.get(metric, 0)
            if math.isnan(value):
                continue
            lo, hi = ranges[metric]
            if hi == lo:
                continue
            score += weight * (value - lo) / (hi - lo)
        return self._clean(score)

    @staticmethod
    def _clean(value: float) -> float:
        return 0.0 if (math.isnan(value) or math.isinf(value)) else value
