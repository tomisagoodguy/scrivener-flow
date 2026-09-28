"""Tests for the GA leak-canary detection in ETF/optimizer/ga/evaluate.py.

TDD: tests written BEFORE `compute_perfect_foresight_ceiling` / `_leak_canary_ok`
exist in evaluate.py.
"""

from __future__ import annotations

import pandas as pd
import pytest

from ETF.optimizer.ga.evaluate import (
    _compute,
    _leak_canary_ok,
    compute_perfect_foresight_ceiling,
)


def _build_two_period_fixture() -> tuple[pd.DataFrame, pd.DataFrame]:
    """6 個月頻重新平衡日的候選池，但 close 只涵蓋前 2 期的未來報酬視窗。

    Period 1: 2024-01-31 -> 2024-02-20（20 天後），候選池 top-2 平均報酬 +5%
    Period 2: 2024-02-29 -> 2024-03-20（20 天後），候選池 top-2 平均報酬 +3%
    Period 3-6（2024-03-31 ~ 2024-06-30）：future_loc 超出 close 範圍，應被跳過。
    """
    stocks = ["A", "B", "C", "D", "E"]

    position_index = pd.date_range("2024-01-01", "2024-06-30", freq="D")
    position = pd.DataFrame(True, index=position_index, columns=stocks)

    close_index = pd.date_range("2024-01-01", "2024-04-01", freq="D")
    close = pd.DataFrame(100.0, index=close_index, columns=stocks)

    close.loc["2024-02-20", ["A", "B", "C", "D", "E"]] = [
        110.0,
        100.0,
        95.0,
        90.0,
        80.0,
    ]
    close.loc["2024-02-29", ["A", "B", "C", "D", "E"]] = [
        100.0,
        100.0,
        100.0,
        100.0,
        100.0,
    ]
    close.loc["2024-03-20", ["A", "B", "C", "D", "E"]] = [
        106.0,
        100.0,
        94.0,
        88.0,
        78.0,
    ]

    return position, close


def test_compute_perfect_foresight_ceiling_normal() -> None:
    position, close = _build_two_period_fixture()

    ceiling = compute_perfect_foresight_ceiling(
        position, close, avg_n_stock=2, period=20
    )

    expected = (1.05 * 1.03) ** (252 / 40) - 1
    assert ceiling == pytest.approx(expected, rel=1e-6)


def test_compute_perfect_foresight_ceiling_close_none() -> None:
    position, _ = _build_two_period_fixture()

    assert (
        compute_perfect_foresight_ceiling(position, None, avg_n_stock=2, period=20)
        is None
    )


def test_compute_perfect_foresight_ceiling_too_few_rebalance_dates() -> None:
    stocks = ["A", "B", "C"]
    # 只有 3 個月頻重新平衡日（< 6），應在計算前直接判定資料不足。
    position_index = pd.date_range("2024-01-01", "2024-03-31", freq="D")
    position = pd.DataFrame(True, index=position_index, columns=stocks)
    close_index = pd.date_range("2024-01-01", "2024-05-01", freq="D")
    close = pd.DataFrame(100.0, index=close_index, columns=stocks)

    assert (
        compute_perfect_foresight_ceiling(position, close, avg_n_stock=2, period=20)
        is None
    )


def test_compute_perfect_foresight_ceiling_no_eligible_stocks() -> None:
    position, close = _build_two_period_fixture()
    position.loc[:, :] = False  # 候選池每期皆無入選股票

    assert (
        compute_perfect_foresight_ceiling(position, close, avg_n_stock=2, period=20)
        is None
    )


def test_leak_canary_ok_gate() -> None:
    position, close = _build_two_period_fixture()
    ceiling = compute_perfect_foresight_ceiling(
        position, close, avg_n_stock=2, period=20
    )
    assert ceiling is not None

    config_default_margin = {"close_df": close}

    # 超過天花板 -> False
    assert (
        _leak_canary_ok(position, config_default_margin, ceiling + 0.01, avg_n_stock=2)
        is False
    )

    # 未超過天花板 -> True
    assert (
        _leak_canary_ok(position, config_default_margin, ceiling - 0.01, avg_n_stock=2)
        is True
    )

    # 剛好等於天花板（margin 預設 1.0，不留寬容）-> True（不嚴格大於才判定洩漏）
    assert (
        _leak_canary_ok(position, config_default_margin, ceiling, avg_n_stock=2) is True
    )


def test_leak_canary_ok_disabled_via_config() -> None:
    position, close = _build_two_period_fixture()
    config = {"close_df": close, "leak_canary_enabled": False}

    # 停用時無論實際年化報酬多離譜，皆放行
    assert (
        _leak_canary_ok(position, config, actual_annual_return=999.0, avg_n_stock=2)
        is True
    )


def test_leak_canary_ok_margin_widens_tolerance() -> None:
    position, close = _build_two_period_fixture()
    ceiling = compute_perfect_foresight_ceiling(
        position, close, avg_n_stock=2, period=20
    )
    assert ceiling is not None

    # margin=1.5 放寬天花板 50%，原本超過預設天花板的值在此應放行
    config = {"close_df": close, "leak_canary_margin": 1.5}
    actual = ceiling * 1.2
    assert _leak_canary_ok(position, config, actual, avg_n_stock=2) is True


class _FakeReport:
    """模擬 finlab Report：get_trades() 決定交易數，get_metrics() 直接回傳績效字典。"""

    def __init__(self, trade_count: int, metrics: dict) -> None:
        self._trade_count = trade_count
        self._metrics = metrics

    def get_trades(self) -> list:
        return [object()] * self._trade_count

    def get_metrics(self) -> dict:
        return self._metrics


def _build_compute_config(
    close: pd.DataFrame, annual_return: float, **overrides
) -> dict:
    metrics = {
        "profitability": {"avgNStock": 2, "annualReturn": annual_return},
        "ratio": {"sortinoRatio": 1.5},
        "risk": {"maxDrawdown": 0.2},
    }
    config = {
        "fast_mode": True,
        "strategy_mode": "Compound_Conditions",
        "conditions_yaml": None,
        "ic_decay_threshold": 0,  # 隔離測試：不讓 _ic_decay_ok 介入
        "get_position": lambda _cond: _FakeReport(trade_count=1, metrics=metrics),
        "min_hold_stock": 2,
        "min_trades": 1,
        "score_mode": "single",
        "close_df": close,
        "eval_cache": None,
        "print_enabled": False,
    }
    config.update(overrides)
    return config


def test_compute_disqualifies_on_leak() -> None:
    position, close = _build_two_period_fixture()
    conditions_df = {"cond1": position}
    individual = [1]

    # 5000% 年化，遠超候選池完美相對強弱天花板（~64%）-> 判定洩漏，適應度歸零
    config = _build_compute_config(close, annual_return=50.0)

    assert _compute(individual, conditions_df, config) == 0.0


def test_compute_unaffected_when_within_ceiling() -> None:
    position, close = _build_two_period_fixture()
    conditions_df = {"cond1": position}
    individual = [1]

    config_enabled = _build_compute_config(
        close, annual_return=0.10, leak_canary_enabled=True
    )
    config_disabled = _build_compute_config(
        close, annual_return=0.10, leak_canary_enabled=False
    )

    result_enabled = _compute(individual, conditions_df, config_enabled)
    result_disabled = _compute(individual, conditions_df, config_disabled)

    assert result_enabled == result_disabled
    assert result_enabled > 0.0


# ── 回歸測試（code review 發現的問題）──────────────────────────────────────


def test_compute_perfect_foresight_ceiling_excludes_negative_scores() -> None:
    """Scoring_System 下負分數股票不應被視為候選池入選（不是單純 truthy）。

    A/B/D/E 為正分數（入選），C 為負分數（不應入選，即使非零），F 為零分數
    （不應入選）。C 在 period1 的報酬刻意設為全場最高（+50%），若候選池判定
    誤把負分數當入選（舊版 `fillna(0).astype(bool)` 的 bug），天花板會被
    C 的極端報酬拉高很多，與這裡斷言的期望值不符。
    """
    stocks = ["A", "B", "C", "D", "E", "F"]
    position_index = pd.date_range("2024-01-01", "2024-06-30", freq="D")
    position = pd.DataFrame(
        {"A": 10.0, "B": 11.0, "C": -5.0, "D": 1.0, "E": 0.5, "F": 0.0},
        index=position_index,
    )[stocks]

    # close 只到 2024-03-01，只有 period1（Jan31 -> Feb20）落在範圍內。
    close_index = pd.date_range("2024-01-01", "2024-03-01", freq="D")
    close = pd.DataFrame(100.0, index=close_index, columns=stocks)
    close.loc["2024-02-20", stocks] = [105.0, 103.0, 150.0, 101.0, 100.0, 999.0]

    ceiling = compute_perfect_foresight_ceiling(
        position, close, avg_n_stock=2, period=20
    )

    # 候選池 = {A, B, D, E}（正分數）；top-2 by return = A(+5%), B(+3%) -> 4%
    expected = 1.04 ** (252 / 20) - 1
    assert ceiling == pytest.approx(expected, rel=1e-6)


def test_compute_perfect_foresight_ceiling_avg_n_stock_not_finite() -> None:
    position, close = _build_two_period_fixture()

    assert (
        compute_perfect_foresight_ceiling(position, close, avg_n_stock=float("nan"))
        is None
    )
    assert compute_perfect_foresight_ceiling(position, close, avg_n_stock=0) is None


def test_compute_perfect_foresight_ceiling_ignores_columns_missing_from_close() -> None:
    """候選池含 close 沒有的欄位時不應 KeyError，應直接忽略該欄位。"""
    close_stocks = ["A", "B", "C", "D", "E"]
    position_stocks = [*close_stocks, "G", "H"]  # G/H 不在 close 裡

    position_index = pd.date_range("2024-01-01", "2024-06-30", freq="D")
    position = pd.DataFrame(True, index=position_index, columns=position_stocks)

    close_index = pd.date_range("2024-01-01", "2024-03-01", freq="D")
    close = pd.DataFrame(100.0, index=close_index, columns=close_stocks)
    close.loc["2024-02-20", close_stocks] = [110.0, 100.0, 95.0, 90.0, 80.0]

    # 不應拋出 KeyError；候選池應自動排除 G/H，只用 close 有的欄位計算。
    ceiling = compute_perfect_foresight_ceiling(
        position, close, avg_n_stock=2, period=20
    )

    expected = 1.05 ** (252 / 20) - 1  # top-2 of {A:+10%, B:0%, ...} -> A,B 平均 5%
    assert ceiling == pytest.approx(expected, rel=1e-6)


def test_leak_canary_ok_negative_ceiling_fails_open_regardless_of_margin() -> None:
    """天花板 <= 0 時一律放行，避免 margin 對負天花板反轉放寬/收緊語意。"""
    stocks = ["A", "B", "C", "D", "E"]
    position_index = pd.date_range("2024-01-01", "2024-06-30", freq="D")
    position = pd.DataFrame(True, index=position_index, columns=stocks)

    # close 只到 2024-03-01，只有 period1 落在範圍內，且 top-2 平均報酬為負。
    close_index = pd.date_range("2024-01-01", "2024-03-01", freq="D")
    close = pd.DataFrame(100.0, index=close_index, columns=stocks)
    close.loc["2024-02-20", stocks] = [95.0, 90.0, 80.0, 70.0, 60.0]  # 全跌

    ceiling = compute_perfect_foresight_ceiling(
        position, close, avg_n_stock=2, period=20
    )
    assert ceiling is not None
    assert ceiling < 0

    config = {"close_df": close, "leak_canary_margin": 1.5}
    # margin=1.5：若邏輯反轉會讓門檻變更嚴格（更負），這裡驗證改為一律放行。
    assert (
        _leak_canary_ok(position, config, actual_annual_return=0.05, avg_n_stock=2)
        is True
    )
