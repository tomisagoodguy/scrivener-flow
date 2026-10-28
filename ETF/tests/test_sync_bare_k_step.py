"""
Tests for SyncBareKStep (momentum-chart-view change).

TDD: Tests written BEFORE implementing the window-momentum sync.
Verifies (spec: openspec/changes/momentum-chart-view/specs/strategy-signal-compute/spec.md):
- _momentum_window_start() Example table (pure function)
- Merge order watch_list -> strategy -> momentum, de-duplicated
- MAX_STOCKS (200) truncation keeps watch_list first, strategy second
- _fetch_momentum_stocks SQL failure returns [] without raising
- _fetch_momentum_stocks SQL success path: window params, no '::' cast syntax

Also covers the equity-ranking-chart-view change
(spec: openspec/changes/equity-ranking-chart-view/specs/equity-ranking-chart-view/spec.md,
Requirement "SyncBareKStep includes equity ranking stocks"):
- Equity ranking stocks appended last (watch -> strategy -> momentum -> equity), de-duplicated
- MAX_STOCKS (200) truncation drops equity ranking stocks first
- _fetch_equity_ranking_stocks: double -> big -> retail concatenation, de-dup, query shape,
  empty table, and SQL failure (logs error, returns [], never raises)
"""

import argparse
import logging
import pathlib
from contextlib import ExitStack
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
    equity: list[str] | None = None,
    services: MagicMock | None = None,
) -> list[str]:
    """跑 execute()，回傳實際送進 compute_snapshot 的股票代號順序。

    equity 預設為空清單（mock 掉 _fetch_equity_ranking_stocks）；
    若傳入 services，則不 mock 籌碼查詢，改走真實的 _fetch_equity_ranking_stocks。
    """
    step = SyncBareKStep()
    svc = MagicMock()
    svc.ensure_global_data.return_value = True
    svc.compute_snapshot.return_value = {"ohlcv": []}

    with ExitStack() as stack:
        stack.enter_context(patch.object(SyncBareKStep, "_fetch_watch_list_stocks", return_value=watch))
        stack.enter_context(patch.object(SyncBareKStep, "_fetch_strategy_stocks", return_value=strategy))
        stack.enter_context(patch.object(SyncBareKStep, "_fetch_momentum_stocks", return_value=momentum))
        if services is None:
            stack.enter_context(
                patch.object(SyncBareKStep, "_fetch_equity_ranking_stocks", return_value=equity or [])
            )
        stack.enter_context(patch(f"{MODULE}.BareKService", return_value=svc))
        stack.enter_context(patch.object(SyncBareKStep, "_upsert_snapshots"))
        step.execute(make_ctx(), services if services is not None else make_services())

    return [c.args[0] for c in svc.compute_snapshot.call_args_list]


def make_result(codes: list[str]) -> MagicMock:
    """模擬 conn.execute() 的回傳，fetchall() 給 (stock_code,) 列。"""
    result = MagicMock()
    result.fetchall.return_value = [(c,) for c in codes]
    return result


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


class TestConstants:
    def test_constants_match_spec(self):
        assert sync_bare_k_step.MAX_STOCKS == 200
        assert sync_bare_k_step.MOMENTUM_WINDOW_DAYS == 5
        assert sync_bare_k_step.MOMENTUM_MIN_ETF_COUNT == 2

    def test_equity_constants_match_spec(self):
        assert sync_bare_k_step.EQUITY_DOUBLE_LIMIT == 10
        assert sync_bare_k_step.EQUITY_LIST_LIMIT == 30


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

    def test_equity_appended_last_and_deduped(self):
        """spec: 籌碼股排在同步加碼股之後，與前面名單去重（保留首次出現位置）。"""
        computed = run_execute(
            watch=["2330"],
            strategy=["2454"],
            momentum=["3017"],
            equity=["2454", "6669", "2330", "3661"],
        )
        assert computed == ["2330", "2454", "3017", "6669", "3661"]

    def test_equity_only_still_syncs(self):
        """前三份名單皆空時，籌碼股仍要被同步。"""
        assert run_execute(watch=[], strategy=[], momentum=[], equity=["6669"]) == ["6669"]

    def test_equity_truncated_first_at_max_stocks(self, caplog):
        """spec: 前三份合計 195 支，籌碼股新增 20 支 -> 只補進前 5 支。"""
        watch = [f"W{i:03d}" for i in range(5)]
        strategy = [f"S{i:03d}" for i in range(100)]
        momentum = [f"M{i:03d}" for i in range(90)]  # 合計 195
        equity = [f"E{i:03d}" for i in range(20)]

        with caplog.at_level(logging.WARNING, logger="SyncBareKStep"):
            computed = run_execute(watch, strategy, momentum, equity)

        assert len(computed) == 200
        assert computed[:195] == [*watch, *strategy, *momentum]
        assert computed[195:] == equity[:5]
        warnings = [r.getMessage() for r in caplog.records if r.levelno == logging.WARNING]
        assert any("200" in m and "equity" in m.lower() for m in warnings)

    def test_equity_query_failure_does_not_abort_step(self, caplog):
        """spec: 籌碼查詢拋例外 -> log error、視為空清單、其餘名單照常同步、不 raise。"""
        services = MagicMock()
        services.sql_storage.engine.connect.side_effect = RuntimeError("db down")

        with caplog.at_level(logging.ERROR, logger="SyncBareKStep"):
            computed = run_execute(
                watch=["2330"], strategy=["2454"], momentum=["3017"], services=services
            )

        assert computed == ["2330", "2454", "3017"]
        assert any(
            "equity" in r.getMessage().lower() and "db down" in r.getMessage()
            for r in caplog.records
            if r.levelno == logging.ERROR
        )

    def test_no_equity_data_syncs_other_stocks(self):
        """spec: equity_distribution_stats 無資料 -> 籌碼清單為空，其餘名單照常同步。"""
        services = make_services()
        services._conn.execute.side_effect = [make_result([]), make_result([]), make_result([])]

        computed = run_execute(
            watch=["2330"], strategy=["2454"], momentum=["3017"], services=services
        )

        assert computed == ["2330", "2454", "3017"]


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


# ---------------------------------------------------------------------------
# _fetch_equity_ranking_stocks
# ---------------------------------------------------------------------------


class TestFetchEquityRankingStocks:
    def test_sql_failure_returns_empty_list_and_logs_error(self, caplog):
        step = SyncBareKStep()
        services = MagicMock()
        services.sql_storage.engine.connect.side_effect = RuntimeError("db down")

        with caplog.at_level(logging.ERROR, logger="SyncBareKStep"):
            result = step._fetch_equity_ranking_stocks(make_ctx(), services)

        assert result == []
        assert any(r.levelno == logging.ERROR and "db down" in r.getMessage() for r in caplog.records)

    def test_empty_table_returns_empty_list_without_error(self, caplog):
        step = SyncBareKStep()
        services = make_services()
        services._conn.execute.side_effect = [make_result([]), make_result([]), make_result([])]

        with caplog.at_level(logging.ERROR, logger="SyncBareKStep"):
            result = step._fetch_equity_ranking_stocks(make_ctx(), services)

        assert result == []
        assert not [r for r in caplog.records if r.levelno >= logging.ERROR]

    def test_concatenates_double_big_retail_and_dedupes_preserving_first(self):
        step = SyncBareKStep()
        services = make_services()
        services._conn.execute.side_effect = [
            make_result(["2454", "6669"]),  # 雙訊號
            make_result(["2454", "2330", "6669"]),  # 主力買進
            make_result(["2330", "3661"]),  # 散戶減少
        ]

        result = step._fetch_equity_ranking_stocks(make_ctx(), services)

        assert result == ["2454", "6669", "2330", "3661"]

    def test_query_shape_per_list(self):
        step = SyncBareKStep()
        services = make_services()
        conn = services._conn
        conn.execute.side_effect = [make_result([]), make_result([]), make_result([])]

        step._fetch_equity_ranking_stocks(make_ctx(), services)

        assert conn.execute.call_count == 3
        calls = [c.args for c in conn.execute.call_args_list]
        sqls = [" ".join(str(stmt).split()) for stmt, _ in calls]
        params = [p for _, p in calls]

        for sql in sqls:
            assert "equity_distribution_stats" in sql
            # 全局最新日期必須用獨立子查詢，不可依賴特定股票
            assert "snapshot_date = (SELECT MAX(snapshot_date) FROM equity_distribution_stats)" in sql
            assert "::" not in sql  # SQLAlchemy text() 禁用 :: 轉型
            assert "stock_code ASC" in sql  # 同值以 stock_code 遞增作穩定次序

        double_sql, big_sql, retail_sql = sqls
        assert "big_holder_pct_change > 0" in double_sql
        assert "shareholders_change_rate < 0" in double_sql
        assert "ORDER BY big_holder_pct_change DESC" in double_sql

        assert "big_holder_pct_change > 0" in big_sql
        assert "shareholders_change_rate < 0" not in big_sql
        assert "ORDER BY big_holder_pct_change DESC" in big_sql

        assert "shareholders_change_rate < 0" in retail_sql
        assert "big_holder_pct_change > 0" not in retail_sql
        assert "ORDER BY shareholders_change_rate ASC" in retail_sql

        assert [p["limit"] for p in params] == [10, 30, 30]
