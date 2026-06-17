"""
Tests for BaseStrategy interface and StrategySignalStep.

TDD: Tests written BEFORE implementation of strategies/base_strategy.py,
strategies/super8888.py, strategies/__init__.py, and
pipeline/steps/strategy_signal_step.py.
"""

import logging
from unittest.mock import MagicMock, patch
import pandas as pd
import pytest

from ETF.strategies.base_strategy import BaseStrategy


class _ConstantStrategy(BaseStrategy):
    """Minimal strategy that always returns a fixed DataFrame."""

    strategy_id = "constant_test"
    description = "Test strategy"

    def get_positions(self, cache=None):
        return pd.DataFrame(
            {
                "2330": [True, True],
                "2317": [False, True],
            },
            index=pd.to_datetime(["2026-05-15", "2026-05-16"]),
        )


class _ErrorStrategy(BaseStrategy):
    """Strategy that always raises an exception."""

    strategy_id = "error_test"
    description = "Always broken"

    def get_positions(self, cache=None):
        raise RuntimeError("FinLab quota exceeded")


class _EmptyStrategy(BaseStrategy):
    """Strategy that returns an empty DataFrame (no selections)."""

    strategy_id = "empty_test"
    description = "No selections"

    def get_positions(self, cache=None):
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# BaseStrategy interface
# ---------------------------------------------------------------------------


def test_base_strategy_abstract():
    """Cannot instantiate BaseStrategy directly (missing get_positions)."""
    with pytest.raises(TypeError):
        BaseStrategy()  # type: ignore[abstract]


def test_concrete_strategy_has_required_attributes():
    s = _ConstantStrategy()
    assert s.strategy_id == "constant_test"
    assert s.description == "Test strategy"
    df = s.get_positions()
    assert isinstance(df, pd.DataFrame)


# ---------------------------------------------------------------------------
# StrategySignalStep — exception isolation
# ---------------------------------------------------------------------------


def test_strategy_signal_step_does_not_reraise_on_strategy_error(caplog):
    """
    Scenario: Strategy raises an exception
    WHEN get_positions() raises any exception
    THEN the framework logs the error with strategy_id and continues — SHALL NOT re-raise
    """
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep
    from ETF.pipeline.context import PipelineContext
    import argparse
    import pathlib

    ctx = PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str="2026-05-16",
        is_dry_run=False,
    )

    sql_storage = MagicMock()
    services = MagicMock()
    services.sql_storage = sql_storage

    with patch(
        "ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES",
        [_ErrorStrategy()],
    ):
        with caplog.at_level(logging.ERROR):
            result = StrategySignalStep().execute(ctx, services)

    # Must not raise — must return ctx
    assert result is ctx
    # Must log the error including strategy_id
    assert "error_test" in caplog.text


def test_strategy_signal_step_skips_on_dry_run():
    """Dry run should not write to DB."""
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep
    from ETF.pipeline.context import PipelineContext
    import argparse, pathlib

    ctx = PipelineContext(
        args=argparse.Namespace(days=30, dry_run=True),
        output_dir=pathlib.Path("."),
        is_dry_run=True,
    )
    assert StrategySignalStep().should_skip(ctx) is True


def test_strategy_signal_step_upserts_selected_stocks():
    """
    Scenario: Daily upsert on repeated pipeline run (spec example)
    GIVEN strategy returns positions with 2330=True on 2026-05-16
    WHEN step executes
    THEN upsert is called with is_selected=True for 2330
    """
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep
    from ETF.pipeline.context import PipelineContext
    import argparse, pathlib

    ctx = PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str="2026-05-16",
        is_dry_run=False,
    )

    sql_storage = MagicMock()
    services = MagicMock()
    services.sql_storage = sql_storage

    strategy = _ConstantStrategy()

    with patch(
        "ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES",
        [strategy],
    ):
        StrategySignalStep().execute(ctx, services)

    # upsert_strategy_signals must have been called
    sql_storage.upsert_strategy_signals.assert_called_once()
    rows = sql_storage.upsert_strategy_signals.call_args[0][0]

    selected = [r for r in rows if r["is_selected"]]
    stock_ids = [r["stock_id"] for r in selected]
    assert "2330" in stock_ids
    # 2317 is False on the last day, so not in selected
    assert all(r["date"] == "2026-05-16" for r in rows)
    assert all(r["strategy_id"] == "constant_test" for r in rows)


# ---------------------------------------------------------------------------
# StrategySignalStep — 全空告警（spec「配額耗盡事件記入 Pipeline Context」）
# ---------------------------------------------------------------------------


def _make_ctx(date_str="2026-05-16"):
    from ETF.pipeline.context import PipelineContext
    import argparse
    import pathlib

    return PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str=date_str,
        is_dry_run=False,
    )


def test_strategy_signal_step_all_empty_appends_warning():
    """
    Scenario: 所有策略皆無輸出時升級為告警
    WHEN 步驟執行完畢且 all_rows 為空（所有現役策略皆無 is_selected）
    THEN ctx.validation_warnings 新增一筆指明全空與當日日期的告警，步驟不 raise
    """
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep

    ctx = _make_ctx("2026-05-16")
    services = MagicMock()
    services.sql_storage = MagicMock()

    with patch(
        "ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES",
        [_EmptyStrategy(), _ErrorStrategy()],
    ):
        result = StrategySignalStep().execute(ctx, services)

    assert result is ctx
    # 不應寫入 DB（無資料）
    services.sql_storage.upsert_strategy_signals.assert_not_called()
    # 應有一筆全空告警，含日期
    empty_warnings = [w for w in ctx.validation_warnings if "全空" in w]
    assert len(empty_warnings) == 1
    assert "2026-05-16" in empty_warnings[0]


def test_strategy_signal_step_partial_output_no_empty_warning():
    """
    Scenario: 部分策略有輸出時不告警
    WHEN 至少一支策略產生 is_selected 列（即使其他策略回空）
    THEN ctx.validation_warnings 不因「全空」原因新增告警
    """
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep

    ctx = _make_ctx("2026-05-16")
    services = MagicMock()
    services.sql_storage = MagicMock()

    with patch(
        "ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES",
        [_ConstantStrategy(), _EmptyStrategy()],
    ):
        StrategySignalStep().execute(ctx, services)

    # 有輸出 → 應寫入
    services.sql_storage.upsert_strategy_signals.assert_called_once()
    # 不應有「全空」告警
    assert not any("全空" in w for w in ctx.validation_warnings)
