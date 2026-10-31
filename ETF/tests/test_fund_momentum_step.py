"""
Tests for FundMomentumStep.

Verifies: score calculation, is_selected judgment, metadata structure,
exception isolation (step does not re-raise).
"""

import json
import logging
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest


# ---------------------------------------------------------------------------
# Helper: build minimal FinLab DataFrames
# ---------------------------------------------------------------------------

def _make_fund_df(n_days: int, stocks: list[str], seed: int = 42) -> pd.DataFrame:
    """Create a synthetic fund buy/sell DataFrame."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2026-01-01", periods=n_days, freq="B")
    data = rng.integers(-500_000, 1_000_000, size=(n_days, len(stocks))).astype(float)
    return pd.DataFrame(data, index=dates, columns=stocks)


def _make_volume_df(n_days: int, stocks: list[str]) -> pd.DataFrame:
    """Create synthetic volume DataFrame (always positive)."""
    dates = pd.date_range("2026-01-01", periods=n_days, freq="B")
    data = np.full((n_days, len(stocks)), 5_000_000.0)
    return pd.DataFrame(data, index=dates, columns=stocks)


# ---------------------------------------------------------------------------
# _compute_consec_days
# ---------------------------------------------------------------------------


def test_consec_days_all_positive():
    from ETF.pipeline.steps.fund_momentum_step import _compute_consec_days
    s = pd.Series([100.0, 200.0, 300.0])
    assert _compute_consec_days(s) == 3


def test_consec_days_breaks_on_zero():
    from ETF.pipeline.steps.fund_momentum_step import _compute_consec_days
    s = pd.Series([200.0, 0.0, 150.0])
    assert _compute_consec_days(s) == 1


def test_consec_days_breaks_on_negative():
    from ETF.pipeline.steps.fund_momentum_step import _compute_consec_days
    s = pd.Series([300.0, -100.0, 500.0, 200.0])
    assert _compute_consec_days(s) == 2


def test_consec_days_all_negative():
    from ETF.pipeline.steps.fund_momentum_step import _compute_consec_days
    s = pd.Series([-100.0, -200.0])
    assert _compute_consec_days(s) == 0


# ---------------------------------------------------------------------------
# score and is_selected — spec example table
# ---------------------------------------------------------------------------
#
# | fund_20d rank (pct) | consec_days | score | is_selected |
# |---------------------|-------------|-------|-------------|
# | 0.98                | 5           | 98    | True        |
# | 0.92                | 2           | 92    | False       |
# | 0.85                | 10          | 85    | False       |
# | 0.50                | 0           | 50    | False       |


@pytest.mark.parametrize("pct,consec,exp_score,exp_selected", [
    (0.98, 5,  98, True),
    (0.92, 2,  92, False),
    (0.85, 10, 85, False),
    (0.50, 0,  50, False),
])
def test_score_and_is_selected_spec_examples(pct, consec, exp_score, exp_selected):
    """Verify spec example table rows for score and is_selected."""
    score = round(pct * 100)
    is_selected = consec >= 3 and score >= 90
    assert score == exp_score
    assert is_selected == exp_selected


# ---------------------------------------------------------------------------
# FundMomentumStep — exception isolation (step does not re-raise)
# ---------------------------------------------------------------------------


def test_fund_momentum_step_does_not_reraise(caplog):
    """
    Scenario: Step failure isolation
    WHEN _run() raises an exception
    THEN execute() catches it, logs an error, and returns ctx unchanged
    """
    from ETF.pipeline.steps.fund_momentum_step import FundMomentumStep
    from ETF.pipeline.context import PipelineContext
    import argparse, pathlib

    ctx = PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str="2026-05-24",
        is_dry_run=False,
    )
    services = MagicMock()
    step = FundMomentumStep()

    with patch.object(step, "_run", side_effect=RuntimeError("FinLab quota exceeded")):
        with caplog.at_level(logging.ERROR):
            result = step.execute(ctx, services)

    assert result is ctx
    assert "FundMomentumStep" in caplog.text


# ---------------------------------------------------------------------------
# FundMomentumStep — upsert rows written correctly
# ---------------------------------------------------------------------------


def _make_finlab_mock(fund_df: pd.DataFrame, vol_df: pd.DataFrame) -> MagicMock:
    """Build a mock finlab module whose data.get() returns the right DataFrame."""
    mock_finlab = MagicMock()
    mock_finlab.data.get.side_effect = lambda key: fund_df if "投信" in key else vol_df
    return mock_finlab


def test_fund_momentum_step_upserts_rows():
    """
    Scenario: Normal trading day computation
    WHEN _run() is called with valid FinLab data
    THEN upsert_strategy_signals is called with rows containing required metadata keys
    """
    import sys
    from ETF.pipeline.steps.fund_momentum_step import FundMomentumStep, STRATEGY_ID
    from ETF.pipeline.context import PipelineContext
    import argparse, pathlib

    stocks = ["2330", "2454", "2317"]
    n_days = 25

    fund_df = _make_fund_df(n_days, stocks)
    # Force stock 2330 to have 5 consecutive positive days at end
    fund_df.iloc[-5:, 0] = 1_000_000.0
    vol_df = _make_volume_df(n_days, stocks)

    ctx = PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str=str(fund_df.index[-1].date()),
        is_dry_run=False,
    )

    sql_storage = MagicMock()
    services = MagicMock()
    services.sql_storage = sql_storage

    mock_finlab = _make_finlab_mock(fund_df, vol_df)

    with patch.dict(sys.modules, {"finlab": mock_finlab}):
        with patch.object(FundMomentumStep, "_notify_new_selected"):
            step = FundMomentumStep()
            step._run(ctx, services)

    sql_storage.upsert_strategy_signals.assert_called_once()
    rows = sql_storage.upsert_strategy_signals.call_args[0][0]

    assert len(rows) == len(stocks)
    for row in rows:
        assert row["strategy_id"] == STRATEGY_ID
        assert "conditions" in row
        meta = json.loads(row["conditions"])
        for key in ("fund_1d", "fund_5d", "fund_20d", "consec_days", "fund_ratio_5d"):
            assert key in meta, f"metadata missing key: {key}"
        assert isinstance(row["score"], int)
        assert 0 <= row["score"] <= 100


def test_fund_momentum_step_metadata_values():
    """
    Scenario: metadata written correctly
    WHEN fund_20d = 500000, consec_days and fund_ratio_5d are present
    THEN metadata JSONB contains all five keys with correct types
    """
    import sys
    from ETF.pipeline.steps.fund_momentum_step import FundMomentumStep
    from ETF.pipeline.context import PipelineContext
    import argparse, pathlib

    stocks = ["2330"]
    # Build deterministic data: 20 days of 25000 shares/day → fund_20d = 500000
    dates = pd.date_range("2026-01-01", periods=20, freq="B")
    fund_df = pd.DataFrame([[25_000.0]] * 20, index=dates, columns=stocks)
    vol_df = pd.DataFrame([[5_000_000.0]] * 20, index=dates, columns=stocks)

    ctx = PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str=str(fund_df.index[-1].date()),
        is_dry_run=False,
    )

    sql_storage = MagicMock()
    services = MagicMock()
    services.sql_storage = sql_storage

    mock_finlab = _make_finlab_mock(fund_df, vol_df)

    with patch.dict(sys.modules, {"finlab": mock_finlab}):
        with patch.object(FundMomentumStep, "_notify_new_selected"):
            FundMomentumStep()._run(ctx, services)

    rows = sql_storage.upsert_strategy_signals.call_args[0][0]
    assert len(rows) == 1
    meta = json.loads(rows[0]["conditions"])

    assert meta["fund_20d"] == pytest.approx(500_000.0, rel=0.01)
    assert meta["consec_days"] == 20
    assert meta["fund_ratio_5d"] == pytest.approx(25_000.0 / 5_000_000.0, rel=0.01)


# ---------------------------------------------------------------------------
# compute_selection_history / 持有期間（change: fund-momentum-trades）
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("values,expected", [
    ([100.0, 200.0, np.nan, 300.0], 3),
    ([100.0, -50.0, 200.0, 300.0], 2),
    ([100.0, 200.0, 300.0, np.nan], 3),
])
def test_selection_history_consec_matches_spec_examples(values, expected):
    """spec 範例表：連續天數以非缺值計算，缺值不中斷也不累加。"""
    from ETF.pipeline.steps.fund_momentum_step import _consec_history

    dates = pd.date_range("2026-10-01", periods=len(values), freq="B")
    consec = _consec_history(pd.DataFrame({"2330": values}, index=dates))
    assert consec["2330"].iloc[-1] == expected


def test_selection_history_last_row_matches_daily_signal():
    """最後一列入選結果與每日 is_selected 計算一致。"""
    from ETF.pipeline.steps.fund_momentum_step import (
        CONSEC_THRESHOLD,
        SCORE_THRESHOLD,
        _compute_consec_days,
        compute_selection_history,
    )

    stocks = [str(1000 + i) for i in range(40)]
    fund_df = _make_fund_df(60, stocks, seed=7)
    fund_df.iloc[-4:, :6] = 2_000_000.0  # 確保有入選股
    fund_df.iloc[10:15, 3] = np.nan

    history = compute_selection_history(fund_df)

    fund_20d_last = fund_df.rolling(20, min_periods=1).sum().iloc[-1]
    score = (fund_20d_last.rank(pct=True) * 100).round().fillna(0).astype(int)
    for stock in stocks:
        cd = _compute_consec_days(fund_df[stock].dropna())
        expected = cd >= CONSEC_THRESHOLD and score[stock] >= SCORE_THRESHOLD
        assert bool(history[stock].iloc[-1]) == expected, stock
    assert history.iloc[-1].sum() > 0


def test_selection_runs_become_fund_momentum_trades():
    """入選 10-13~10-15、10-16 落選 → persist 收到 fund_momentum 的持有部位，推導出 10-13 → 10-16。"""
    from ETF.pipeline.steps.fund_momentum_step import STRATEGY_ID, FundMomentumStep
    from ETF.processors.strategy_trades import derive_trade_episodes
    from datetime import date

    ctx = MagicMock()
    ctx.strategy_data_cache = MagicMock()
    ctx.date_str = "2026-10-16"
    services = MagicMock()
    dates = pd.to_datetime(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"])
    history = pd.DataFrame({"2330": [False, True, True, True, False]}, index=dates)

    with patch("ETF.pipeline.steps.fund_momentum_step.compute_selection_history", return_value=history), \
            patch("ETF.pipeline.steps.fund_momentum_step.persist_strategy_trades") as persist:
        FundMomentumStep()._persist_trades(ctx, services, pd.DataFrame())

    positions_by_strategy, run_date, cache, sql_storage = persist.call_args[0]
    assert list(positions_by_strategy) == [STRATEGY_ID]
    assert run_date == date(2026, 10, 16)
    assert cache is ctx.strategy_data_cache
    assert sql_storage is services.sql_storage
    episodes = derive_trade_episodes(positions_by_strategy[STRATEGY_ID], date(2026, 1, 1))
    assert [(e.stock_id, e.entry_signal_date, e.exit_signal_date) for e in episodes] == [
        ("2330", date(2026, 10, 13), date(2026, 10, 16)),
    ]


def test_trade_failure_is_isolated(caplog):
    """推導持有期間失敗只 log，不 re-raise。"""
    from ETF.pipeline.steps.fund_momentum_step import FundMomentumStep

    ctx = MagicMock()
    ctx.date_str = "2026-10-16"
    with patch("ETF.pipeline.steps.fund_momentum_step.compute_selection_history", side_effect=RuntimeError("boom")), \
            caplog.at_level(logging.ERROR):
        FundMomentumStep()._persist_trades(ctx, MagicMock(), pd.DataFrame())
    assert "boom" in caplog.text


def test_run_writes_signals_then_persists_trades():
    """_run 先寫每日訊號，再推導持有期間。"""
    import sys
    import argparse
    import pathlib
    from ETF.pipeline.context import PipelineContext
    from ETF.pipeline.steps.fund_momentum_step import FundMomentumStep

    stocks = ["2330", "2454"]
    fund_df = _make_fund_df(25, stocks)
    ctx = PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str=str(fund_df.index[-1].date()),
        is_dry_run=False,
    )
    services = MagicMock()
    calls: list[str] = []
    services.sql_storage.upsert_strategy_signals.side_effect = lambda rows: calls.append("signals")

    with patch.dict(sys.modules, {"finlab": _make_finlab_mock(fund_df, _make_volume_df(25, stocks))}), \
            patch.object(FundMomentumStep, "_notify_new_selected"), \
            patch.object(FundMomentumStep, "_persist_trades", side_effect=lambda *a: calls.append("trades")):
        FundMomentumStep()._run(ctx, services)
    assert calls == ["signals", "trades"]
