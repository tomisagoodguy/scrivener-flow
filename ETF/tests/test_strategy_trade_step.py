"""StrategyTradeStep 測試（change: strategy-trade-performance）。

涵蓋 spec：Idempotent daily persistence。
"""

import argparse
import pathlib
from types import SimpleNamespace
from unittest.mock import MagicMock, PropertyMock, patch

import pandas as pd
import pytest

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.strategy_trade_step import StrategyTradeStep

DAYS = pd.to_datetime(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"])


def _ctx(positions: dict[str, pd.DataFrame], cache=None) -> PipelineContext:
    ctx = PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        date_str="2026-10-30",
        is_dry_run=False,
    )
    ctx.strategy_positions = positions
    ctx.strategy_data_cache = cache
    return ctx


def _prices() -> SimpleNamespace:
    open_ = pd.DataFrame({"2330": [100.0, 101.0, 102.0, 103.0, 104.0], "2317": [50.0, 50.0, 51.0, 52.0, 53.0]}, index=DAYS)
    close = pd.DataFrame({"2330": [100.0, 102.0, 104.0, 106.0, 110.0], "2317": [50.0, 51.0, 52.0, 53.0, 55.0]}, index=DAYS)
    return SimpleNamespace(open_=open_, close=close, adj_close=close)


def _positions() -> pd.DataFrame:
    # 2330：10-26 進、10-28 出；2317：10-27 進、持有中
    return pd.DataFrame(
        {"2330": [True, True, False, False, False], "2317": [False, True, True, True, True]},
        index=DAYS,
    )


def _services() -> MagicMock:
    services = MagicMock()
    services.sql_storage = MagicMock()
    services.sql_storage.delete_expired_strategy_trades.return_value = 0
    return services


def test_upserts_priced_rows_with_strategy_id():
    services = _services()
    StrategyTradeStep().execute(_ctx({"trend_template": _positions()}, _prices()), services)

    rows = services.sql_storage.upsert_strategy_trades.call_args.args[0]
    by_stock = {r["stock_id"]: r for r in rows}
    assert set(by_stock) == {"2330", "2317"}
    assert all(r["strategy_id"] == "trend_template" for r in rows)

    closed = by_stock["2330"]
    assert closed["entry_date"] == "2026-10-27"
    assert closed["entry_price"] == 101.0
    assert closed["exit_date"] == "2026-10-29"
    assert closed["exit_price"] == 103.0
    # 出場還原開盤 103 ÷ 進場還原開盤 101 − 1
    assert closed["holding_return"] == pytest.approx(103 / 101 - 1)
    # 最新還原收盤 110 ÷ 出場還原開盤 103 − 1
    assert closed["post_exit_return"] == pytest.approx(110 / 103 - 1)

    held = by_stock["2317"]
    assert held["exit_date"] is None
    assert held["holding_return"] == pytest.approx(55 / 51 - 1)

    services.sql_storage.delete_expired_strategy_trades.assert_called_once_with(365)


def test_prunes_stale_rows_per_successful_strategy():
    """策略邏輯改寫歷史後推導不出的舊列，要在同策略、同視窗內刪除（只保留本次寫入的鍵）。"""
    services = _services()
    bad = pd.DataFrame({"2330": [True]}, index=["not-a-date"])
    StrategyTradeStep().execute(_ctx({"bad": bad, "trend_template": _positions()}, _prices()), services)

    calls = services.sql_storage.prune_strategy_trades.call_args_list
    # 推導失敗的策略不清理，避免一次失敗就清空它的紀錄
    assert [c.args[0] for c in calls] == ["trend_template"]
    _, since, keep = calls[0].args
    assert since == "2025-10-30"
    assert sorted(keep) == [("2317", "2026-10-27"), ("2330", "2026-10-26")]


def test_strategy_with_no_episodes_prunes_everything_in_window():
    services = _services()
    empty = pd.DataFrame({"2330": [False, False]}, index=DAYS[:2])
    StrategyTradeStep().execute(_ctx({"trend_template": empty}, _prices()), services)
    services.sql_storage.prune_strategy_trades.assert_called_once_with("trend_template", "2025-10-30", [])


def test_rerun_produces_identical_rows():
    services = _services()
    step = StrategyTradeStep()
    step.execute(_ctx({"trend_template": _positions()}, _prices()), services)
    step.execute(_ctx({"trend_template": _positions()}, _prices()), services)

    first, second = (c.args[0] for c in services.sql_storage.upsert_strategy_trades.call_args_list)
    assert first == second


def test_price_fetch_failure_does_not_raise():
    services = _services()
    cache = MagicMock()
    type(cache).open_ = PropertyMock(side_effect=RuntimeError("FinLab quota exceeded"))
    ctx = _ctx({"trend_template": _positions()}, cache)

    result = StrategyTradeStep().execute(ctx, services)

    assert result is ctx
    services.sql_storage.upsert_strategy_trades.assert_not_called()


def test_one_bad_strategy_is_skipped_others_written():
    services = _services()
    bad = pd.DataFrame({"2330": [True]}, index=["not-a-date"])
    StrategyTradeStep().execute(_ctx({"bad": bad, "trend_template": _positions()}, _prices()), services)

    rows = services.sql_storage.upsert_strategy_trades.call_args.args[0]
    assert {r["strategy_id"] for r in rows} == {"trend_template"}


def test_skipped_without_positions_or_in_dry_run():
    step = StrategyTradeStep()
    assert step.should_skip(_ctx({}))
    ctx = _ctx({"trend_template": _positions()})
    ctx.is_dry_run = True
    assert step.should_skip(ctx)


def test_falls_back_to_new_cache_when_context_has_none():
    services = _services()
    with patch("ETF.pipeline.steps.strategy_trade_step.StrategyDataCache", return_value=_prices()):
        StrategyTradeStep().execute(_ctx({"trend_template": _positions()}, None), services)
    services.sql_storage.upsert_strategy_trades.assert_called_once()


def test_strategy_signal_step_stores_positions_and_cache_in_context():
    from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep
    from ETF.strategies.base_strategy import BaseStrategy

    class _Fixed(BaseStrategy):
        strategy_id = "fixed_test"
        description = "fixed"

        def get_positions(self, cache=None):
            return _positions()

    ctx = _ctx({}, None)
    services = _services()
    with patch("ETF.pipeline.steps.strategy_signal_step.ALL_STRATEGIES", [_Fixed()]), patch(
        "ETF.pipeline.steps.strategy_signal_step.compute_liquidity", return_value={}
    ), patch.object(StrategySignalStep, "_check_signal_staleness"):
        StrategySignalStep().execute(ctx, services)

    assert list(ctx.strategy_positions) == ["fixed_test"]
    pd.testing.assert_frame_equal(ctx.strategy_positions["fixed_test"], _positions())
    assert ctx.strategy_data_cache is not None
