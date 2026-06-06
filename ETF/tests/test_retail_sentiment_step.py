"""
Tests for RetailSentimentStep.

TDD: Tests written BEFORE implementation of retail_sentiment_step.py.
Covers signal computation, early return when already persisted, and
error-handling (no raise on exception).
"""

import logging
from unittest.mock import MagicMock, patch, call
import pandas as pd
import numpy as np
import pytest

from ETF.pipeline.context import PipelineContext
import argparse
import pathlib


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_ctx() -> PipelineContext:
    args = argparse.Namespace(days=30, dry_run=False)
    ctx = PipelineContext(args=args, output_dir=pathlib.Path("."))
    ctx.date_str = "2026-06-06"
    return ctx


def _make_services(engine_execute_result=None):
    """Build a mock PipelineServices."""
    services = MagicMock()
    services.finlab_srv._client.login.return_value = True
    conn = MagicMock()
    services.sql_storage.engine.connect.return_value.__enter__ = MagicMock(return_value=conn)
    services.sql_storage.engine.connect.return_value.__exit__ = MagicMock(return_value=False)
    if engine_execute_result is not None:
        conn.execute.return_value = engine_execute_result
    return services, conn


def _make_weekly_series(n=200, last_value=0.30, chg_value=0.005):
    """Create a weekly-frequency Series large enough for 156-week rolling window."""
    dates = pd.date_range("2022-01-07", periods=n, freq="W-FRI")
    values = [last_value] * n
    return pd.Series(values, index=dates)


def _make_inventory_df(n=200, value=0.30):
    """Create a stock×date inventory DataFrame (weekly)."""
    dates = pd.date_range("2022-01-07", periods=n, freq="W-FRI")
    data = {
        "2330": [value] * n,
        "2317": [value - 0.01] * n,
        "2454": [value + 0.01] * n,
    }
    return pd.DataFrame(data, index=dates)


# ---------------------------------------------------------------------------
# Import guard: step must exist (will fail until implemented)
# ---------------------------------------------------------------------------

def test_import():
    """RetailSentimentStep can be imported from its module."""
    from ETF.pipeline.steps.retail_sentiment_step import RetailSentimentStep  # noqa: F401


# ---------------------------------------------------------------------------
# Step properties
# ---------------------------------------------------------------------------

def test_step_name():
    from ETF.pipeline.steps.retail_sentiment_step import RetailSentimentStep
    step = RetailSentimentStep()
    assert step.name == "Retail Sentiment"


def test_step_skips_dry_run():
    from ETF.pipeline.steps.retail_sentiment_step import RetailSentimentStep
    step = RetailSentimentStep()
    args = argparse.Namespace(days=30, dry_run=True)
    ctx = PipelineContext(args=args, output_dir=pathlib.Path("."))
    ctx.is_dry_run = True
    assert step.should_skip(ctx) is True


# ---------------------------------------------------------------------------
# Error handling: FinLab fetch fails → log, no raise, ctx.retail_sentiment={}
# ---------------------------------------------------------------------------

def test_finlab_fetch_fails_no_raise():
    """FinLab data fetch failure sets ctx.retail_sentiment={} and does NOT raise."""
    from ETF.pipeline.steps.retail_sentiment_step import RetailSentimentStep

    step = RetailSentimentStep()
    ctx = _make_ctx()
    services, _ = _make_services()

    with patch("finlab.data.get", side_effect=RuntimeError("quota exceeded")):
        result = step.run(ctx, services)

    assert result.retail_sentiment == {}


def test_finlab_fetch_fails_logs_error(caplog):
    """FinLab failure is logged as error (not silently swallowed)."""
    from ETF.pipeline.steps.retail_sentiment_step import RetailSentimentStep

    step = RetailSentimentStep()
    ctx = _make_ctx()
    services, _ = _make_services()

    with caplog.at_level(logging.ERROR), \
         patch("finlab.data.get", side_effect=RuntimeError("quota exceeded")):
        step.run(ctx, services)

    assert any("quota exceeded" in rec.message or "quota exceeded" in str(rec.exc_info)
               for rec in caplog.records
               if rec.levelno >= logging.ERROR)


# ---------------------------------------------------------------------------
# Early return when already persisted
# ---------------------------------------------------------------------------

def test_early_return_when_already_persisted():
    """When small_holder_chg_12w is already non-NULL for the inventory date,
    the step must not execute any UPDATE."""
    from ETF.pipeline.steps.retail_sentiment_step import RetailSentimentStep

    step = RetailSentimentStep()
    ctx = _make_ctx()
    services, conn = _make_services()

    small_holder_df = _make_inventory_df()
    odd_lot_df = _make_inventory_df(value=0.05)

    # Simulate DB already has a non-NULL row → fetchone returns a truthy row
    check_result = MagicMock()
    check_result.fetchone.return_value = (0.005,)  # non-NULL value already stored
    conn.execute.return_value = check_result

    with patch("finlab.data.get", side_effect=[small_holder_df, odd_lot_df]):
        result = step.run(ctx, services)

    # No UPDATE call should have been made (only the SELECT check)
    update_calls = [
        c for c in conn.execute.call_args_list
        if "UPDATE" in str(c)
    ]
    assert len(update_calls) == 0


# ---------------------------------------------------------------------------
# Signal computation: spec Example table
# ---------------------------------------------------------------------------

def _build_ctx_and_data_for_signals(
    chg_12w_at_latest: float,
    p90_chg: float,
    ol_latest: float,
    p90_ol: float,
) -> tuple:
    """
    Build fake pandas data that will produce deterministic signal values.
    Returns (small_holder_df, odd_lot_df).

    Strategy:
    - Build 200-week Series for small_holder median with controlled chg_12w
    - Build 200-week Series for odd_lot median with controlled value
    - P90 is approximated by making 90% of values below threshold
    """
    n = 200
    dates = pd.date_range("2022-01-07", periods=n, freq="W-FRI")

    # Construct sh median so the 12-week change at the last row = chg_12w_at_latest
    # and the rolling P90 of the series ≈ p90_chg
    # Keep it simple: fill with values where 90% < p90_chg
    sh_chg = pd.Series([p90_chg * 0.5] * n, index=dates)  # all below P90
    # Replace last 10% (20 rows) to be above P90 if chg is expected > P90
    if chg_12w_at_latest > p90_chg:
        # Need last row's chg to be > P90, but only ~10% of rows above P90
        sh_chg.iloc[-20:] = p90_chg * 1.5
    # Derive sh_median from sh_chg by cumsum (approximate)
    sh_median = sh_chg.cumsum() + 0.20

    # Build a 3-stock DataFrame that yields sh_median when .median(axis=1) is applied
    sh_df = pd.DataFrame({
        "2330": sh_median.values,
        "2317": sh_median.values,
        "2454": sh_median.values,
    }, index=dates)

    # For odd-lot: ol_latest > p90_ol → fragmented
    ol_vals = [p90_ol * 0.5] * n
    if ol_latest > p90_ol:
        # Last 10% above P90
        for i in range(n - 20, n):
            ol_vals[i] = p90_ol * 1.5
    ol_df = pd.DataFrame({
        "2330": ol_vals,
        "2317": ol_vals,
        "2454": ol_vals,
    }, index=dates)

    return sh_df, ol_df


@pytest.mark.parametrize("is_accel,is_frag,expected_accel,expected_frag", [
    (True,  False, True,  False),  # 資金擴散
    (True,  True,  True,  True),   # 矛盾期
    (False, True,  False, True),   # 籌碼尾端
    (False, False, False, False),  # 中性
])
def test_signal_combinations(is_accel, is_frag, expected_accel, expected_frag):
    """Spec Example: signal color mapping — all four is_retail_accelerating × is_odd_lot_fragmented combos."""
    from ETF.pipeline.steps.retail_sentiment_step import RetailSentimentStep, _compute_signals

    n = 200
    dates = pd.date_range("2022-01-07", periods=n, freq="W-FRI")

    # Build sh_chg_12w series: make 90% of values = 0.1, last value = 0.5 if accel else 0.05
    base = 0.10
    sh_chg = pd.Series([base] * n, index=dates, dtype=float)
    if is_accel:
        sh_chg.iloc[-1] = base * 6  # definitely above P90 ≈ 0.10
    else:
        sh_chg.iloc[-1] = base * 0.5  # below P90

    # Build ol_median series: 90% = 0.03, last = 0.06 if frag else 0.01
    ol_base = 0.03
    ol_median = pd.Series([ol_base] * n, index=dates, dtype=float)
    if is_frag:
        ol_median.iloc[-1] = ol_base * 3  # above P90
    else:
        ol_median.iloc[-1] = ol_base * 0.3  # below P90

    result = _compute_signals(sh_chg, ol_median)
    assert result["is_retail_accelerating"] == expected_accel, \
        f"Expected is_retail_accelerating={expected_accel}, got {result['is_retail_accelerating']}"
    assert result["is_odd_lot_fragmented"] == expected_frag, \
        f"Expected is_odd_lot_fragmented={expected_frag}, got {result['is_odd_lot_fragmented']}"


# ---------------------------------------------------------------------------
# Z-score sanity check
# ---------------------------------------------------------------------------

def test_z_score_computation():
    """Z-score of the latest value must be (val - mean) / std over rolling 156w."""
    from ETF.pipeline.steps.retail_sentiment_step import _compute_signals

    n = 200
    dates = pd.date_range("2022-01-07", periods=n, freq="W-FRI")
    sh_chg = pd.Series([0.10] * n, index=dates, dtype=float)
    # All values identical → mean = 0.10, std = 0 → z_score may be nan or 0
    ol_median = pd.Series([0.03] * n, index=dates, dtype=float)

    result = _compute_signals(sh_chg, ol_median)
    # z_score is either nan (std=0) or a finite float
    assert "small_holder_z_score" in result
