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
    import argparse
    import pathlib

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


# ---------------------------------------------------------------------------
# StrategySignalStep — 連續停更升級告警（spec「策略訊號連續停更升級告警」）
# ---------------------------------------------------------------------------

from datetime import date  # noqa: E402


def test_strategy_signal_step_stale_beyond_threshold_appends_warning():
    """
    Scenario: 連續停更超過門檻時升級告警
    GIVEN server 當日 2026-07-01；系列策略最新成功寫入日期 2026-06-10（距當日 21 天），
          本次因配額 skip 未寫入
    THEN ctx.validation_warnings 含一筆指明停更天數與最後成功日期的告警，
         且與既有「當次全空」告警可並存
    """
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep

    ctx = _make_ctx("2026-07-01")
    services = MagicMock()
    services.sql_storage = MagicMock()
    services.sql_storage.get_latest_strategy_signal_date.return_value = date(2026, 6, 10)

    with patch(
        "ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES",
        [_EmptyStrategy()],
    ), patch.object(StrategySignalStep, "_today", return_value=date(2026, 7, 1)):
        result = StrategySignalStep().execute(ctx, services)

    assert result is ctx
    stale_warnings = [w for w in ctx.validation_warnings if "停更" in w]
    assert len(stale_warnings) == 1
    assert "21" in stale_warnings[0]
    assert "2026-06-10" in stale_warnings[0]
    # 與「當次全空」告警並存（本次無輸出且非配額 skip）
    assert any("全空" in w for w in ctx.validation_warnings)


def test_strategy_signal_step_stale_within_threshold_no_warning():
    """
    Scenario: 停更在門檻內不告警
    GIVEN server 當日 2026-07-01；系列策略最新成功寫入日期 2026-06-29（距當日 2 天，門檻內）
    THEN ctx.validation_warnings 不因「連續停更」原因新增告警
    """
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep

    ctx = _make_ctx("2026-07-01")
    services = MagicMock()
    services.sql_storage = MagicMock()
    services.sql_storage.get_latest_strategy_signal_date.return_value = date(2026, 6, 29)

    with patch(
        "ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES",
        [_ConstantStrategy()],
    ), patch.object(StrategySignalStep, "_today", return_value=date(2026, 7, 1)):
        StrategySignalStep().execute(ctx, services)

    assert not any("停更" in w for w in ctx.validation_warnings)


# ---------------------------------------------------------------------------
# compute_liquidity — 流動性標記（spec「Liquidity enrichment on strategy signals」）
# ---------------------------------------------------------------------------


def test_compute_liquidity_below_and_above_threshold():
    """
    Spec Example: below and above threshold
    GIVEN threshold 50,000,000; stock A constant turnover 30,000,000 over 20+ days;
          stock B constant turnover 200,000,000 over 20+ days
    WHEN compute_liquidity runs for stocks A and B
    THEN A yields (30000000.0, True) and B yields (200000000.0, False)
    """
    from ETF.pipeline.steps.strategy_signal_step import compute_liquidity

    dates = pd.date_range("2026-05-01", periods=25, freq="D")
    amt = pd.DataFrame(
        {
            "A": [30_000_000] * 25,
            "B": [200_000_000] * 25,
        },
        index=dates,
    )

    result = compute_liquidity(amt, ["A", "B"], 50_000_000)

    assert result["A"] == (30_000_000.0, True)
    assert result["B"] == (200_000_000.0, False)


def test_compute_liquidity_insufficient_history_returns_none():
    """
    Scenario: Insufficient or missing turnover data
    WHEN a selected stock has fewer than 20 days of turnover history
    THEN its row SHALL carry (None, None)
    """
    from ETF.pipeline.steps.strategy_signal_step import compute_liquidity

    dates = pd.date_range("2026-05-01", periods=10, freq="D")
    amt = pd.DataFrame({"A": [30_000_000] * 10}, index=dates)

    result = compute_liquidity(amt, ["A"], 50_000_000)

    assert result["A"] == (None, None)


def test_compute_liquidity_missing_stock_returns_none():
    """
    Scenario: Insufficient or missing turnover data
    WHEN a selected stock is absent from the turnover DataFrame
    THEN its row SHALL carry (None, None)
    """
    from ETF.pipeline.steps.strategy_signal_step import compute_liquidity

    dates = pd.date_range("2026-05-01", periods=25, freq="D")
    amt = pd.DataFrame({"A": [30_000_000] * 25}, index=dates)

    result = compute_liquidity(amt, ["A", "Z"], 50_000_000)

    assert result["Z"] == (None, None)


def test_compute_liquidity_empty_dataframe_does_not_raise():
    """WHEN amt is an empty DataFrame THEN no exception is raised and all stocks yield (None, None)."""
    from ETF.pipeline.steps.strategy_signal_step import compute_liquidity

    amt = pd.DataFrame()

    result = compute_liquidity(amt, ["A", "B"], 50_000_000)

    assert result["A"] == (None, None)
    assert result["B"] == (None, None)


# ---------------------------------------------------------------------------
# StrategySignalStep — 流動性標記整合到 execute()
# ---------------------------------------------------------------------------


def test_strategy_signal_step_rows_include_liquidity_fields():
    """
    WHEN step executes normally with valid turnover data
    THEN each row dict carries avg_turnover / liquidity_flag computed via compute_liquidity
    """
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep

    ctx = _make_ctx("2026-05-16")
    services = MagicMock()
    services.sql_storage = MagicMock()

    strategy = _ConstantStrategy()

    dates = pd.date_range("2026-04-20", periods=25, freq="D")
    amt_df = pd.DataFrame(
        {
            "2330": [30_000_000] * 25,  # below threshold -> True
            "2317": [200_000_000] * 25,  # above threshold -> False
        },
        index=dates,
    )
    mock_cache = MagicMock()
    mock_cache.amt = amt_df

    with patch(
        "ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES",
        [strategy],
    ), patch(
        "ETF.pipeline.steps.strategy_signal_step.StrategyDataCache",
        return_value=mock_cache,
    ):
        StrategySignalStep().execute(ctx, services)

    rows = services.sql_storage.upsert_strategy_signals.call_args[0][0]
    assert all("avg_turnover" in r and "liquidity_flag" in r for r in rows)
    by_stock = {r["stock_id"]: r for r in rows}
    assert by_stock["2330"]["liquidity_flag"] is True
    assert by_stock["2330"]["avg_turnover"] == 30_000_000.0
    assert by_stock["2317"]["liquidity_flag"] is False


def test_strategy_signal_step_liquidity_failure_is_non_fatal(caplog):
    """
    Scenario: Liquidity computation failure is non-fatal
    WHEN fetching or computing turnover raises any exception
    THEN the step SHALL log the error, write all signal rows with both liquidity
         fields as NULL, and complete signal persistence without raising
    """
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep

    class _BrokenAmtCache:
        @property
        def amt(self):
            raise RuntimeError("FinLab quota exceeded")

    ctx = _make_ctx("2026-05-16")
    services = MagicMock()
    services.sql_storage = MagicMock()

    strategy = _ConstantStrategy()

    with patch(
        "ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES",
        [strategy],
    ), patch(
        "ETF.pipeline.steps.strategy_signal_step.StrategyDataCache",
        return_value=_BrokenAmtCache(),
    ):
        with caplog.at_level(logging.ERROR):
            result = StrategySignalStep().execute(ctx, services)

    assert result is ctx
    services.sql_storage.upsert_strategy_signals.assert_called_once()
    rows = services.sql_storage.upsert_strategy_signals.call_args[0][0]
    assert all(r["avg_turnover"] is None and r["liquidity_flag"] is None for r in rows)
    assert any(rec.levelno == logging.ERROR for rec in caplog.records)


def test_strategy_signal_step_fresh_write_no_stale_warning():
    """
    Scenario: 本次正常寫入不告警
    GIVEN 本次成功寫入使系列策略最新日期即為當日 2026-07-01
    THEN ctx.validation_warnings 不因「連續停更」原因新增告警
    """
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep

    ctx = _make_ctx("2026-07-01")
    services = MagicMock()
    services.sql_storage = MagicMock()
    services.sql_storage.get_latest_strategy_signal_date.return_value = date(2026, 7, 1)

    with patch(
        "ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES",
        [_ConstantStrategy()],
    ), patch.object(StrategySignalStep, "_today", return_value=date(2026, 7, 1)):
        StrategySignalStep().execute(ctx, services)

    assert not any("停更" in w for w in ctx.validation_warnings)
