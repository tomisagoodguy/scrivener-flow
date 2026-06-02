"""FinLab API 相容層 — 處理 v1.x (get_metrics) vs v2.0.0+ (get_stats) 的差異。"""

from __future__ import annotations
from typing import Any


def get_metrics_compat(report) -> dict:
    """取得 metrics，自動相容舊版 get_metrics() 與新版 get_stats()。"""
    try:
        metrics = report.get_metrics()
        if metrics:
            return metrics
    except AttributeError:
        pass

    stats = report.get_stats()
    avg_n_stock = (
        _get(stats, ['avg_n_stocks', 'avgNStock'])
        or _compute_avg_n_stock(report)
    )

    return {
        'profitability': {
            'annualReturn': _get(stats, ['cagr', 'annual_return', 'annualReturn'], 0.0),
            'avgNStock': avg_n_stock or 0.0,
        },
        'ratio': {
            'sortinoRatio': _get(stats, ['monthly_sortino', 'sortino', 'sortinoRatio'], 0.0),
            'sharpeRatio':  _get(stats, ['monthly_sharpe',  'sharpe',  'sharpeRatio'],  0.0),
            'calmarRatio':  _get(stats, ['calmar_ratio',    'calmar',  'calmarRatio'],  0.0),
        },
        'risk': {
            'maxDrawdown':  _get(stats, ['max_drawdown',  'maxDrawdown'],  0.0),
            'valueAtRisk':  _get(stats, ['value_at_risk', 'var', 'valueAtRisk'],  0.0),
            'cvalueAtRisk': _get(stats, ['conditional_value_at_risk', 'cvar', 'cvalueAtRisk'], 0.0),
        },
        'winrate': {},
        'liquidity': {},
    }


def get_trade_count_compat(report) -> int:
    """取得總交易筆數。"""
    for attr in ('get_trades', 'trades'):
        try:
            val = getattr(report, attr)
            result = val() if callable(val) else val
            return len(result)  # type: ignore[arg-type]
        except (AttributeError, TypeError):
            continue
    return 0


def _get(d: dict, keys: list[str], default: Any = None) -> Any:
    for k in keys:
        v = d.get(k)
        if v is not None:
            return v
    return default


def _compute_avg_n_stock(report) -> float:
    try:
        return float(report.position.sum(axis=1).mean())
    except Exception:
        return 0.0
