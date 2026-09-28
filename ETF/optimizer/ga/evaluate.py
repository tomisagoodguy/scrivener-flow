"""GA 個體評估 — 計算回測績效並回傳適應度。"""

from __future__ import annotations


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
    eval_cache = config.get("eval_cache")
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

    selected = _get_selected(individual, conditions_df, config["fast_mode"])
    if not selected:
        return 0.0

    all_cond = combine_selected_conditions(
        selected, config["strategy_mode"], config["conditions_yaml"]
    )

    if not _ic_decay_ok(all_cond, config):
        return 0.0

    try:
        report = config["get_position"](all_cond)
    except Exception as e:
        if config.get("print_enabled"):
            print(f"[回測錯誤] {e}")
        if not config.get("continue_on_error", True):
            raise
        return 0.0

    trade_count = get_trade_count_compat(report)
    if trade_count == 0:
        return 0.0

    metrics = get_metrics_compat(report)
    profitability = metrics.get("profitability", {})

    if profitability.get("avgNStock", 0) < config.get("min_hold_stock", 2):
        return 0.0

    if trade_count < config.get("min_trades", 200):
        return 0.0

    if not _leak_canary_ok(
        all_cond,
        config,
        profitability.get("annualReturn", 0),
        profitability.get("avgNStock", 0),
    ):
        return 0.0

    return Score(metrics, config).evaluate() or 0.0


def _ic_decay_ok(position, config: dict) -> bool:
    """IC 20 天 rank correlation 均值 >= threshold 才放行（月換倉穩健性過濾）。

    threshold <= 0 或 close_df 未傳入時直接放行，不影響現有行為。
    只取近 2 年月底截面，避免計算全歷史，速度約 <0.1s。
    """
    threshold = config.get("ic_decay_threshold", 0.03)
    if threshold <= 0:
        return True

    close = config.get("close_df")
    if close is None:
        return True

    try:
        monthly = position.resample("ME").last()
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


def compute_perfect_foresight_ceiling(
    position: pd.DataFrame,
    close: pd.DataFrame | None,
    avg_n_stock: float,
    period: int = 20,
) -> float | None:
    """候選池內「完美相對強弱」理論年化報酬天花板（洩漏偵測比較基準）。

    在**全歷史**月頻重新平衡日（不套用 `_ic_decay_ok()` 的近 2 年篩選——
    `_compute()` 比較的 `actual_annual_return` 是 `sim()` 全歷史 CAGR，天花板
    必須用同一個時間視窗計算才是公平上界，否則近 2 年空頭會讓天花板偏低而
    誤殺、近 2 年多頭則會讓天花板膨脹而放過真正的洩漏），每期改選候選池
    當期表現最好的 `round(avg_n_stock)` 檔（而非模型實際選出的組合），逐期
    複利年化。資料不足時回傳 None，呼叫端視為放行（fail-open）。

    `position` 不一定是純布林值——`strategy_mode='Scoring_System'`
    （`ETF/optimizer/run.py` 的 production 預設）下是連續加權分數。候選池
    判定用 `position.loc[date] > 0`（NaN 自動視為未入選），對布林輸出等價於
    `== True`；對分數輸出則把「正向訊號」視為入選。**已知限制**：
    `Scoring_System` 下 `combine_selected_conditions()` 是條件加總（聯集，
    非交集），且 `sim()` 會把非布林 position 當權重正規化持有（而非本函式
    假設的「候選池內等權持有前 N 檔」），因此本天花板在該模式下只是較寬鬆的
    參考基準，偵測力比 `Compound_Conditions`（嚴格布林交集、等權持有）弱。
    """
    if close is None:
        return None

    if not np.isfinite(avg_n_stock) or avg_n_stock < 1:
        return None
    n_top = round(avg_n_stock)
    if n_top < 1:
        return None

    try:
        monthly = position.resample("ME").last()
    except Exception:
        return None
    if len(monthly) < 6:
        return None
    dates = monthly.index

    close_idx = close.index
    period_returns: list[float] = []

    for date in dates:
        if date not in position.index:
            continue

        loc = close_idx.searchsorted(date)
        future_loc = loc + period
        if future_loc >= len(close_idx):
            continue
        future_date = close_idx[future_loc]

        if date not in close_idx:
            continue

        eligible_mask = position.loc[date] > 0  # NaN -> False
        eligible = eligible_mask[eligible_mask].index.intersection(close.columns)
        # 候選池不夠大時（n_top 逼近池大小）天花板會退化成池均值，
        # 反而讓合法策略（加權持有 + 停損停利）被誤判超越；此期直接跳過。
        if len(eligible) < n_top or n_top / len(eligible) > 0.5:
            continue

        ret_row = (
            close.loc[future_date, eligible] / close.loc[date, eligible] - 1
        ).dropna()
        if len(ret_row) < n_top:
            continue

        top = ret_row.nlargest(n_top)
        period_returns.append(float(top.mean()))

    if not period_returns:
        return None

    compounded = 1.0
    for r in period_returns:
        compounded *= 1 + r

    total_days = len(period_returns) * period
    if total_days <= 0:
        return None

    return compounded ** (252 / total_days) - 1


def _leak_canary_ok(
    position: pd.DataFrame,
    config: dict,
    actual_annual_return: float,
    avg_n_stock: float,
) -> bool:
    """實際年化報酬超過候選池完美相對強弱天花板 → 判定疑似資料洩漏。

    `leak_canary_enabled=False`、天花板無法計算（`None`）、或天花板 <= 0
    （對照組本身在該候選池上無效，非零/負報酬天花板無法作為合理上界，且
    負值天花板會讓 `margin` 的放寬/收緊語意反轉）時一律放行。
    """
    if not config.get("leak_canary_enabled", True):
        return True

    ceiling = compute_perfect_foresight_ceiling(
        position, config.get("close_df"), avg_n_stock
    )
    if ceiling is None or ceiling <= 0:
        return True

    margin = config.get("leak_canary_margin", 1.0)
    if actual_annual_return > ceiling * margin:
        if config.get("print_enabled"):
            print(
                f"[洩漏疑慮] 實際年化 {actual_annual_return:.1%} "
                f"超過候選池完美相對強弱天花板 {ceiling:.1%}"
            )
        return False

    return True


def _get_selected(individual: list, conditions_df: dict, fast_mode: bool) -> list:
    selected = []
    for i, (name, data) in enumerate(conditions_df.items()):
        if individual[i]:
            selected.append(load_condition(data, fast_mode))
    return selected
