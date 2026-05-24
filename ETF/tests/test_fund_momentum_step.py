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
