"""Tests for DataValidationStep."""

import argparse
import pathlib
from typing import Any
from unittest.mock import MagicMock

import pandas as pd
import pytest

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.data_validation_step import DataValidationStep


def _make_ctx(**kwargs: Any) -> PipelineContext:
    defaults: dict[str, Any] = dict(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str="2026-05-21",
        etf_code="00981A",
        is_dry_run=False,
    )
    defaults.update(kwargs)
    return PipelineContext(**defaults)


def _make_df(weights, prices=None) -> pd.DataFrame:
    codes = [str(i) for i in range(len(weights))]
    data: dict = {"code": codes, "weight": weights}
    if prices is not None:
        data["price"] = prices
    return pd.DataFrame(data)


def _services() -> MagicMock:
    return MagicMock()


# ---------------------------------------------------------------------------
# Task 6.2 — 比重正常場景（總和 98%）→ 不 raise
# ---------------------------------------------------------------------------


def test_normal_weight_does_not_raise():
    """WHEN weight sum = 98% THEN validation passes, no raise."""
    df = _make_df([49.0, 49.0])  # total = 98%
    ctx = _make_ctx(df=df)
    step = DataValidationStep()
    result = step.execute(ctx, _services())
    assert result is ctx
    assert result.validation_warnings == []


# ---------------------------------------------------------------------------
# Task 6.3 — 比重異常場景（總和 12%）→ 拋出 ValueError
# ---------------------------------------------------------------------------


def test_low_weight_raises_value_error():
    """WHEN weight sum = 12% THEN raise ValueError."""
    df = _make_df([6.0, 6.0])  # total = 12%
    ctx = _make_ctx(df=df)
    step = DataValidationStep()
    with pytest.raises(ValueError, match="持股比重異常"):
        step.execute(ctx, _services())


def test_high_weight_raises_value_error():
    """WHEN weight sum = 200% THEN raise ValueError."""
    df = _make_df([100.0, 100.0])  # total = 200%
    ctx = _make_ctx(df=df)
    step = DataValidationStep()
    with pytest.raises(ValueError, match="持股比重異常"):
        step.execute(ctx, _services())


# ---------------------------------------------------------------------------
# Task 6.4 — 筆數歸零場景 → 拋出 ValueError
# ---------------------------------------------------------------------------


def test_zero_holdings_raises_value_error():
    """WHEN holdings count = 0 THEN raise ValueError."""
    df = pd.DataFrame({"code": [], "weight": []})
    ctx = _make_ctx(df=df)
    step = DataValidationStep()
    with pytest.raises(ValueError, match="持股筆數異常"):
        step.execute(ctx, _services())


# ---------------------------------------------------------------------------
# Task 6.5 — 價格異常場景 → 記入 ctx.validation_warnings，不 raise
# ---------------------------------------------------------------------------


def test_anomalous_price_adds_warning_but_does_not_raise():
    """WHEN price = -1 or 0 THEN warning recorded, no raise."""
    df = _make_df([50.0, 50.0], prices=[-1.0, 100.0])
    ctx = _make_ctx(df=df)
    step = DataValidationStep()
    result = step.execute(ctx, _services())
    assert result is ctx
    assert len(result.validation_warnings) == 1
    assert "price" in result.validation_warnings[0].lower() or "異常" in result.validation_warnings[0]


def test_price_above_10000_adds_warning():
    """WHEN price > 10000 THEN warning recorded."""
    df = _make_df([50.0, 50.0], prices=[99999.0, 100.0])
    ctx = _make_ctx(df=df)
    result = DataValidationStep().execute(ctx, _services())
    assert len(result.validation_warnings) == 1


def test_normal_price_no_warning():
    """WHEN all prices in valid range THEN no warnings."""
    df = _make_df([50.0, 50.0], prices=[100.0, 200.0])
    ctx = _make_ctx(df=df)
    result = DataValidationStep().execute(ctx, _services())
    assert result.validation_warnings == []


# ---------------------------------------------------------------------------
# Task 6.6 — DataValidationStep 內部 KeyError → 繼續執行不 raise
# ---------------------------------------------------------------------------


def test_internal_key_error_does_not_raise(monkeypatch):
    """WHEN _validate raises KeyError THEN caught, warning recorded, no re-raise."""
    df = _make_df([50.0, 50.0])
    ctx = _make_ctx(df=df)
    step = DataValidationStep()

    def _broken_validate(ctx):
        raise KeyError("unexpected_key")

    monkeypatch.setattr(step, "_validate", _broken_validate)
    result = step.execute(ctx, _services())
    assert result is ctx
    assert any("DataValidationStep" in w for w in result.validation_warnings)
