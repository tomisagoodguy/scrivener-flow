"""upsert 守門：內容相同的衝突列不改寫（IS DISTINCT FROM），時間戳只在內容變更時刷新。"""

import pytest

from ETF.database.upsert_sql import conflict_update_clause

# ── conflict_update_clause ──────────────────────────────────────────────────


def test_clause_with_touch_column() -> None:
    clause = conflict_update_clause(
        "stock_broker_transactions", ["buy_amount", "sell_amount"], touch=["created_at"]
    )
    assert clause == (
        "DO UPDATE SET buy_amount = EXCLUDED.buy_amount, sell_amount = EXCLUDED.sell_amount, "
        "created_at = NOW() "
        "WHERE (stock_broker_transactions.buy_amount, stock_broker_transactions.sell_amount) "
        "IS DISTINCT FROM (EXCLUDED.buy_amount, EXCLUDED.sell_amount)"
    )


def test_clause_without_touch_single_column() -> None:
    assert conflict_update_clause("t", ["a"]) == (
        "DO UPDATE SET a = EXCLUDED.a WHERE (t.a) IS DISTINCT FROM (EXCLUDED.a)"
    )


def test_empty_columns_rejected() -> None:
    with pytest.raises(ValueError):
        conflict_update_clause("t", [])


def test_overlapping_touch_rejected() -> None:
    with pytest.raises(ValueError):
        conflict_update_clause("t", ["a", "updated_at"], touch=["updated_at"])


# ── SQLStorage 寫入點 ────────────────────────────────────────────────────────

PRICE_GUARD = (
    "WHERE (stock_prices_daily.open, stock_prices_daily.high, stock_prices_daily.low, "
    "stock_prices_daily.close, stock_prices_daily.volume, stock_prices_daily.amount, "
    "stock_prices_daily.margin_ratio, stock_prices_daily.margin_pct_rank, "
    "stock_prices_daily.it_buy, stock_prices_daily.currency) IS DISTINCT FROM "
    "(EXCLUDED.open, EXCLUDED.high, EXCLUDED.low, EXCLUDED.close, EXCLUDED.volume, "
    "EXCLUDED.amount, EXCLUDED.margin_ratio, EXCLUDED.margin_pct_rank, "
    "EXCLUDED.it_buy, EXCLUDED.currency)"
)


def _bare_storage() -> tuple[object, list[str]]:
    """不連 DB 的 SQLStorage；擷取 _bulk_upsert 與 engine.connect().execute 收到的 SQL。"""
    from unittest.mock import MagicMock

    from ETF.database.sql_storage import SQLStorage

    storage = SQLStorage.__new__(SQLStorage)
    captured: list[str] = []
    storage._bulk_upsert = lambda sql, *a, **k: captured.append(str(sql))
    conn = MagicMock()

    def _execute(sql: object, *a: object, **k: object) -> list:
        captured.append(str(sql))
        return []

    conn.execute.side_effect = _execute
    storage.engine = MagicMock()
    storage.engine.connect.return_value.__enter__.return_value = conn
    storage.engine.begin.return_value.__enter__.return_value = conn
    return storage, captured


def test_upsert_stock_prices_skips_unchanged_rows() -> None:
    import pandas as pd

    storage, captured = _bare_storage()
    df = pd.DataFrame([{
        "stock_id": "2330", "date": "2026-11-20", "open": 1.0, "high": 1.0,
        "low": 1.0, "close": 1.0, "volume": 1, "amount": 1.0, "margin_ratio": 1.0, "it_buy": 0,
    }])
    assert storage.upsert_stock_prices(df) == 1
    assert len(captured) == 1
    assert "ON CONFLICT (stock_code, data_date) DO UPDATE" in captured[0]
    assert PRICE_GUARD in captured[0]


def assert_guarded(sql: str, table: str, first_col: str, touch: tuple[str, ...] = ()) -> None:
    """守門存在：WHERE 以目標表第一個更新欄位開頭、用 IS DISTINCT FROM；touch 欄位只在 SET、不進比較。"""
    flat = " ".join(sql.split())
    assert f"WHERE ({table}.{first_col}" in flat, flat
    assert "IS DISTINCT FROM" in flat
    conflict_part = flat.split("DO UPDATE SET", 1)[1]
    set_part, where_part = conflict_part.split(" WHERE (", 1)
    assert conflict_part.upper().count("NOW()") == len(touch)
    for t in touch:
        assert f"{t} = NOW()" in set_part
        assert f"{table}.{t}" not in where_part


def _upsert_sql(captured: list[str], table: str) -> str:
    hits = [s for s in captured if f"INSERT INTO {table}" in s]
    assert len(hits) >= 1, f"no upsert into {table}: {captured}"
    return hits[0]


def test_save_diff_logs_guarded() -> None:
    storage, captured = _bare_storage()
    storage.save_diff_logs([{"etf_code": "00981A"}])
    assert_guarded(_upsert_sql(captured, "etf_diff_logs"), "etf_diff_logs", "change_type")


def test_upsert_revenue_data_guarded() -> None:
    storage, captured = _bare_storage()
    storage.upsert_revenue_data([{"stock_code": "2330"}])
    assert_guarded(
        _upsert_sql(captured, "stock_revenue_monthly"), "stock_revenue_monthly", "revenue",
        touch=("created_at",),
    )


def test_upsert_shareholder_data_guarded() -> None:
    storage, captured = _bare_storage()
    storage.get_max_shareholder_date = lambda: None
    storage.upsert_shareholder_data([{"stock_code": "2330", "data_date": "2026-11-20"}])
    assert_guarded(
        _upsert_sql(captured, "stock_shareholder_weekly"), "stock_shareholder_weekly",
        "holder_count", touch=("created_at",),
    )


def test_upsert_broker_transactions_guarded() -> None:
    storage, captured = _bare_storage()
    storage.upsert_broker_transactions([{"stock_code": "2330"}])
    assert_guarded(
        _upsert_sql(captured, "stock_broker_transactions"), "stock_broker_transactions",
        "buy_amount", touch=("created_at",),
    )


def test_upsert_strategy_trades_guarded() -> None:
    storage, captured = _bare_storage()
    storage.upsert_strategy_trades([{"strategy_id": "x"}])
    assert_guarded(
        _upsert_sql(captured, "strategy_trades"), "strategy_trades", "entry_date",
        touch=("updated_at",),
    )


def test_upsert_strategy_signals_guarded() -> None:
    storage, captured = _bare_storage()
    storage.upsert_strategy_signals([{"strategy_id": "x"}])
    assert_guarded(_upsert_sql(captured, "strategy_signals"), "strategy_signals", "score")


# ── Pipeline 步驟寫入點 ──────────────────────────────────────────────────────


def _capturing_conn() -> tuple[object, list[str]]:
    from unittest.mock import MagicMock

    captured: list[str] = []
    conn = MagicMock()

    def _execute(sql: object, *a: object, **k: object) -> MagicMock:
        captured.append(str(sql))
        return MagicMock()

    conn.execute.side_effect = _execute
    return conn, captured


def test_sector_strength_upserts_guarded() -> None:
    import pandas as pd

    from ETF.pipeline.steps.sector_strength_step import SectorStrengthStep

    step = SectorStrengthStep.__new__(SectorStrengthStep)
    conn, captured = _capturing_conn()
    step._upsert_sectors(
        conn, pd.DataFrame([{"category": "半導體", "ret_1d": 1.0, "ret_5d": 1.0, "ret_20d": 1.0,
                             "stock_count": 5}]), "2026-11-20",
    )
    step._upsert_stocks(
        conn, pd.DataFrame([{"category": "半導體", "stock_id": "2330"}]), "2026-11-20",
    )
    assert_guarded(_upsert_sql(captured, "sector_strength "), "sector_strength", "ret_1d",
                   touch=("created_at",))
    # spec：Unchanged sector stock keeps its timestamp → created_at 不在比較清單
    assert_guarded(_upsert_sql(captured, "sector_strength_stocks"), "sector_strength_stocks",
                   "stock_name", touch=("created_at",))


@pytest.mark.parametrize(
    ("const", "table", "first_col"),
    [
        ("FUTURES_UPSERT_SQL", "futures_institutional_daily", "long_oi"),
        ("MARGIN_UPSERT_SQL", "market_margin_daily", "margin_balance"),
        ("INSTITUTIONAL_UPSERT_SQL", "institutional_stock_daily", "foreign_net"),
        ("INSTITUTIONAL_SIGNALS_UPSERT_SQL", "institutional_signals", "metadata"),
    ],
)
def test_market_chips_upserts_guarded(const: str, table: str, first_col: str) -> None:
    from ETF.pipeline.steps import market_chips_step as mod

    sql = str(getattr(mod, const))
    assert f"INSERT INTO {table}" in sql
    assert_guarded(sql, table, first_col, touch=("created_at",))


def _services_with(conn: object) -> object:
    from unittest.mock import MagicMock

    services = MagicMock()
    services.sql_storage.engine.connect.return_value.__enter__.return_value = conn
    services.sql_storage.engine.begin.return_value.__enter__.return_value = conn
    return services


def test_sync_bare_k_upsert_guarded() -> None:
    from ETF.pipeline.steps.sync_bare_k_step import SyncBareKStep

    step = SyncBareKStep.__new__(SyncBareKStep)
    step.logger = __import__("logging").getLogger("test")
    conn, captured = _capturing_conn()
    snap = {k: {} for k in ("ohlcv", "mas", "signals", "margin", "revenue", "inv_chips", "summary")}
    step._upsert_snapshots(None, [dict(snap, stock_id="2330", date="2026-11-20")],
                           _services_with(conn))
    assert_guarded(_upsert_sql(captured, "bare_k_snapshots"), "bare_k_snapshots", "ohlcv",
                   touch=("created_at",))


def test_position_summary_upserts_guarded() -> None:
    from ETF.pipeline.steps.position_summary_step import PositionSummaryStep

    conn, captured = _capturing_conn()
    PositionSummaryStep._upsert_positions(conn, [{}])
    PositionSummaryStep._upsert_pnl_series(conn, [{}])
    assert_guarded(_upsert_sql(captured, "etf_position_summary"), "etf_position_summary",
                   "cost_basis")
    assert_guarded(_upsert_sql(captured, "etf_pnl_series"), "etf_pnl_series", "total_mv")


def test_flow_compute_upserts_guarded() -> None:
    from ETF.pipeline.steps.flow_compute_step import FlowComputeStep

    conn, captured = _capturing_conn()
    FlowComputeStep._upsert_flow(conn, "2026-11-20", [], [], [], [], {}, {}, [])
    FlowComputeStep._write_cross_buy_signals(
        conn,
        [{"etf_count": 3, "stock_code": "2330", "stock_name": "台積電", "total_nt": 1.0,
          "by_etf": [{"etf_code": "00981A"}, {"etf_code": "00980A"}, {"etf_code": "00991A"}]}],
        "2026-11-20",
    )
    assert_guarded(_upsert_sql(captured, "etf_flow_daily"), "etf_flow_daily", "etfs_covered")
    assert_guarded(_upsert_sql(captured, "etf_signals"), "etf_signals", "strength")


def test_signal_detect_upsert_guarded() -> None:
    from ETF.pipeline.steps.signal_detect_step import SignalDetectStep

    conn, captured = _capturing_conn()
    SignalDetectStep._upsert(_services_with(conn), [{"etf_codes": ["00981A"], "metadata": {}}])
    assert_guarded(_upsert_sql(captured, "etf_signals"), "etf_signals", "strength")


def test_overlap_upsert_guarded() -> None:
    from ETF.pipeline.steps import overlap_compute_step as mod

    assert_guarded(str(mod.OVERLAP_UPSERT_SQL), "etf_stock_overlap", "etf_count",
                   touch=("updated_at",))


def test_overlap_consensus_update_guarded() -> None:
    from ETF.pipeline.steps.overlap_compute_step import OverlapComputeStep

    step = OverlapComputeStep.__new__(OverlapComputeStep)
    step.logger = __import__("logging").getLogger("test")
    conn, captured = _capturing_conn()
    step._update_consensus_counts(None, "2026-11-20", _services_with(conn))
    sql = " ".join(next(s for s in captured if "UPDATE etf_stock_overlap" in s).split())
    # spec：Unchanged consensus counts are not rewritten
    assert ("(o.consensus_buy_count, o.consensus_sell_count) "
            "IS DISTINCT FROM (c.buy_count, c.sell_count)") in sql


def test_overlap_etf_list_order_is_deterministic() -> None:
    """快照列順序不同時 etf_list 仍相同，否則 jsonb 陣列比較會讓守門失效。"""
    import json
    from unittest.mock import MagicMock

    from ETF.pipeline.steps.overlap_compute_step import OverlapComputeStep

    def _run(rows: list[tuple[str, str, float]]) -> list[dict]:
        step = OverlapComputeStep.__new__(OverlapComputeStep)
        step.logger = __import__("logging").getLogger("test")
        step._update_consensus_counts = MagicMock()  # type: ignore[method-assign]
        params: list[dict] = []
        conn = MagicMock()

        def _execute(sql: object, p: object = None) -> MagicMock:
            res = MagicMock()
            res.scalar.return_value = "2026-11-20"
            res.fetchall.return_value = rows
            if isinstance(p, list):
                params.extend(p)
            return res

        conn.execute.side_effect = _execute
        ctx = MagicMock(is_dry_run=False)
        step.execute(ctx, _services_with(conn))
        return params

    rows = [("00981A", "2330", 5.0), ("00980A", "2330", 3.0), ("00991A", "2330", 4.0)]
    a = _run(rows)
    b = _run(list(reversed(rows)))
    assert a[0]["etf_list"] == b[0]["etf_list"]
    assert [e["etf_code"] for e in json.loads(a[0]["etf_list"])] == ["00980A", "00981A", "00991A"]


def test_treemap_upsert_guarded() -> None:
    from ETF.pipeline.steps.sync_treemap_step import SyncTreemapStep

    step = SyncTreemapStep.__new__(SyncTreemapStep)
    step.logger = __import__("logging").getLogger("test")
    conn, captured = _capturing_conn()
    step._upsert([{}], _services_with(conn))
    assert_guarded(_upsert_sql(captured, "market_treemap_daily"), "market_treemap_daily",
                   "stock_name")


def test_multi_etf_diff_logs_guarded() -> None:
    from ETF.pipeline.steps.multi_etf_step import MultiEtfStep

    step = MultiEtfStep.__new__(MultiEtfStep)
    step.logger = __import__("logging").getLogger("test")
    conn, captured = _capturing_conn()
    step._save_diff_logs(_services_with(conn), [{"etf_code": "00980A"}])
    assert_guarded(_upsert_sql(captured, "etf_diff_logs"), "etf_diff_logs", "change_type")


# ── 獨立腳本寫入點 ───────────────────────────────────────────────────────────


def test_sync_equity_distribution_upsert_guarded() -> None:
    from unittest.mock import MagicMock

    from ETF import sync_equity_distribution as mod

    conn, captured = _capturing_conn()
    storage = MagicMock()
    storage.engine.connect.return_value.__enter__.return_value = conn
    mod._upsert([{"stock_code": "2330"}], storage)
    assert_guarded(_upsert_sql(captured, "equity_distribution_stats"),
                   "equity_distribution_stats", "total_shareholders", touch=("updated_at",))


def test_run_strategies_upsert_guarded() -> None:
    from unittest.mock import MagicMock

    from ETF import run_strategies as mod

    conn, captured = _capturing_conn()
    engine = MagicMock()
    engine.connect.return_value.__enter__.return_value = conn
    mod.upsert_signals(engine, [{"strategy_id": "x"}])
    assert_guarded(_upsert_sql(captured, "strategy_signals"), "strategy_signals", "score")


def test_run_fund_momentum_upsert_guarded() -> None:
    from ETF import run_fund_momentum as mod

    assert_guarded(str(mod.FUND_MOMENTUM_UPSERT_SQL), "strategy_signals", "score")


def test_sector_strength_equity_upsert_guarded() -> None:
    from ETF.pipeline.steps import sector_strength_step as mod

    assert_guarded(str(mod.EQUITY_DISTRIBUTION_UPSERT_SQL), "equity_distribution_stats",
                   "total_shareholders", touch=("updated_at",))
