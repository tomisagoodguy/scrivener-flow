"""
Tests for SyncBareKStep (momentum-chart-view change).

TDD: Tests written BEFORE implementing the window-momentum sync.
Verifies (spec: openspec/changes/momentum-chart-view/specs/strategy-signal-compute/spec.md):
- _momentum_window_start() Example table (pure function)
- Merge order watch_list -> strategy -> momentum, de-duplicated
- MAX_STOCKS (200) truncation keeps watch_list first, strategy second
- _fetch_momentum_stocks SQL failure returns [] without raising
- _fetch_momentum_stocks SQL success path: window params, no '::' cast syntax
"""

import argparse
import logging
import pathlib
from datetime import date
from unittest.mock import MagicMock, patch

import pytest

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps import sync_bare_k_step
from ETF.pipeline.steps.sync_bare_k_step import SyncBareKStep, _momentum_window_start

MODULE = "ETF.pipeline.steps.sync_bare_k_step"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_ctx(date_str: str = "2026-10-23") -> PipelineContext:
    args = argparse.Namespace(dry_run=False)
    ctx = PipelineContext(args=args, output_dir=pathlib.Path("/tmp"))
    ctx.date_str = date_str
    return ctx


def make_services() -> MagicMock:
    services = MagicMock()
    conn = MagicMock()
    services.sql_storage.engine.connect.return_value.__enter__ = MagicMock(return_value=conn)
    services.sql_storage.engine.connect.return_value.__exit__ = MagicMock(return_value=False)
    services._conn = conn  # 供測試取用
    return services


def run_execute(
    watch: list[str],
    strategy: list[str],
    momentum: list[str],
) -> list[str]:
    """跑 execute()，回傳實際送進 compute_snapshot 的股票代號順序。"""
    step = SyncBareKStep()
    svc = MagicMock()
    svc.ensure_global_data.return_value = True
    svc.compute_snapshot.return_value = {"ohlcv": []}

    with (
        patch.object(SyncBareKStep, "_fetch_watch_list_stocks", return_value=watch),
        patch.object(SyncBareKStep, "_fetch_strategy_stocks", return_value=strategy),
        patch.object(SyncBareKStep, "_fetch_momentum_stocks", return_value=momentum),
        patch(f"{MODULE}.BareKService", return_value=svc),
        patch.object(SyncBareKStep, "_upsert_snapshots"),
    ):
        step.execute(make_ctx(), make_services())

    return [c.args[0] for c in svc.compute_snapshot.call_args_list]


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


class TestConstants:
    def test_constants_match_spec(self):
        assert sync_bare_k_step.MAX_STOCKS == 200
        assert sync_bare_k_step.MOMENTUM_WINDOW_DAYS == 5
        assert sync_bare_k_step.MOMENTUM_MIN_ETF_COUNT == 2


# ---------------------------------------------------------------------------
# _momentum_window_start (spec Example: Window start computation)
# ---------------------------------------------------------------------------


class TestMomentumWindowStart:
    @pytest.mark.parametrize(
        ("today", "prev_dates", "expected"),
        [
            (
                "2026-10-23",
                ["2026-10-22", "2026-10-21", "2026-10-20", "2026-10-17"],
                "2026-10-17",
            ),
            ("2026-10-23", ["2026-10-22", "2026-10-21"], "2026-10-21"),
            ("2026-10-23", [], "2026-10-23"),
        ],
    )
    def test_spec_examples(self, today, prev_dates, expected):
        assert _momentum_window_start(prev_dates, today) == expected

    def test_only_first_n_minus_1_prev_dates_are_used(self):
        """prev_dates 超過 4 筆時，只取最近 4 筆（降冪前 4 筆），第 5 筆之後忽略。"""
        prev = ["2026-10-22", "2026-10-21", "2026-10-20", "2026-10-17", "2026-10-16"]
        assert _momentum_window_start(prev, "2026-10-23") == "2026-10-17"


# ---------------------------------------------------------------------------
# execute(): merge order / de-dup / truncation
# ---------------------------------------------------------------------------


class TestExecuteMerge:
    def test_merge_order_watch_strategy_momentum_deduped(self):
        computed = run_execute(
            watch=["2330"],
            strategy=["2330", "2454"],
            momentum=["2454", "3017"],
        )
        assert computed == ["2330", "2454", "3017"]

    def test_momentum_only_still_syncs(self):
        """watch_list 與策略股皆空時，同步加碼股仍要被同步。"""
        assert run_execute(watch=[], strategy=[], momentum=["3017"]) == ["3017"]

    def test_truncates_to_200_preserving_priority(self, caplog):
        watch = [f"W{i:03d}" for i in range(10)]
        strategy = [f"S{i:03d}" for i in range(150)]
        momentum = [f"M{i:03d}" for i in range(100)]  # 合計 260 > 200

        with caplog.at_level(logging.WARNING, logger="SyncBareKStep"):
            computed = run_execute(watch, strategy, momentum)

        assert len(computed) == 200
        assert computed[:10] == watch
        assert computed[10:160] == strategy
        assert computed[160:] == momentum[:40]
        assert any("200" in r.getMessage() for r in caplog.records if r.levelno == logging.WARNING)


# ---------------------------------------------------------------------------
# _fetch_momentum_stocks
# ---------------------------------------------------------------------------


class TestFetchMomentumStocks:
    def test_sql_failure_returns_empty_list_without_raising(self):
        step = SyncBareKStep()
        services = MagicMock()
        services.sql_storage.engine.connect.side_effect = RuntimeError("db down")

        assert step._fetch_momentum_stocks(make_ctx(), services) == []

    def test_success_path_uses_window_params_and_returns_ordered_codes(self):
        step = SyncBareKStep()
        services = make_services()
        conn = services._conn

        # date 欄位實際回傳 datetime.date 物件
        prev_rows = [(date(2026, 10, 22),), (date(2026, 10, 21),), (date(2026, 10, 20),), (date(2026, 10, 17),)]
        stock_rows = [("2454",), ("3017",)]
        first, second = MagicMock(), MagicMock()
        first.fetchall.return_value = prev_rows
        second.fetchall.return_value = stock_rows
        conn.execute.side_effect = [first, second]

        result = step._fetch_momentum_stocks(make_ctx("2026-10-23"), services)

        assert result == ["2454", "3017"]
        assert conn.execute.call_count == 2

        prev_stmt, prev_params = conn.execute.call_args_list[0].args
        assert "market_breadth_daily" in str(prev_stmt)
        assert prev_params["today"] == "2026-10-23"
        assert prev_params["n"] == 4

        stock_stmt, stock_params = conn.execute.call_args_list[1].args
        sql = str(stock_stmt)
        assert "etf_diff_logs" in sql
        assert "::" not in sql  # SQLAlchemy text() 禁用 :: 轉型
        assert "CAST(" in sql
        assert stock_params["start"] == "2026-10-17"
        assert stock_params["end"] == "2026-10-23"
        assert stock_params["min_count"] == 2

    def test_empty_date_str_falls_back_to_today(self):
        step = SyncBareKStep()
        services = make_services()
        conn = services._conn
        first, second = MagicMock(), MagicMock()
        first.fetchall.return_value = []
        second.fetchall.return_value = []
        conn.execute.side_effect = [first, second]

        with patch(f"{MODULE}.date") as mock_date:
            mock_date.today.return_value = date(2026, 10, 24)
            result = step._fetch_momentum_stocks(make_ctx(""), services)

        assert result == []
        _, prev_params = conn.execute.call_args_list[0].args
        assert prev_params["today"] == "2026-10-24"
        _, stock_params = conn.execute.call_args_list[1].args
        assert stock_params["start"] == "2026-10-24"
        assert stock_params["end"] == "2026-10-24"
