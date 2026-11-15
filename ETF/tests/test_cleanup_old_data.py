"""cleanup_old_data 保留政策測試。

驗證 institutional_stock_daily 有 90 天滾動刪除，
訊號結果表 institutional_signals 不在清理清單（長存），
且 bare_k_snapshots 每檔股票只留最新一列。
"""

import sqlite3
from unittest.mock import MagicMock

import pytest

from ETF.database import sql_storage
from ETF.database.sql_storage import SQLStorage


def _run_cleanup_and_capture_sql() -> list[str]:
    storage = object.__new__(SQLStorage)  # 跳過 __init__，不建真實 DB 連線
    conn = MagicMock()
    conn.execute.return_value = MagicMock(rowcount=0)
    engine = MagicMock()
    engine.connect.return_value.__enter__ = MagicMock(return_value=conn)
    engine.connect.return_value.__exit__ = MagicMock(return_value=False)
    storage.engine = engine

    storage.cleanup_old_data()

    return [str(call.args[0]) for call in conn.execute.call_args_list]


def test_institutional_stock_daily_deleted_after_90_days():
    statements = _run_cleanup_and_capture_sql()
    matched = [s for s in statements if "institutional_stock_daily" in s]
    assert len(matched) == 1
    assert "90 days" in matched[0]
    assert matched[0].strip().upper().startswith("DELETE FROM")


def test_equity_distribution_stats_deleted_after_730_days():
    statements = _run_cleanup_and_capture_sql()
    matched = [s for s in statements if "equity_distribution_stats" in s]
    assert len(matched) == 1
    assert "snapshot_date" in matched[0]
    assert "730 days" in matched[0]
    assert matched[0].strip().upper().startswith("DELETE FROM")


def test_etf_holdings_snapshot_never_deleted():
    """ETF 持股歷史無法重抓，必須永久保留（etf-history-storage-slimdown）。"""
    statements = _run_cleanup_and_capture_sql()
    assert not any(
        s.strip().upper().startswith("DELETE") and "etf_holdings_snapshot" in s for s in statements
    )


def test_successful_cleanup_logs_no_failure(caplog: pytest.LogCaptureFixture):
    """清理語句全部成功時，不可因後段 log 引用錯誤而被外層 except 吞成失敗。"""
    _run_cleanup_and_capture_sql()
    assert "自動優化失敗" not in caplog.text


def test_other_260_day_retention_unchanged():
    statements = _run_cleanup_and_capture_sql()
    for table in ("stock_prices_daily", "stock_broker_transactions"):
        matched = [s for s in statements if f"DELETE FROM {table}" in s]
        assert len(matched) == 1
        assert "260 days" in matched[0]


def test_institutional_signals_never_cleaned():
    statements = _run_cleanup_and_capture_sql()
    assert not any("institutional_signals" in s for s in statements)


def _run_bare_k_retention(rows: list[tuple[str, str]]) -> tuple[list[tuple[str, str]], int]:
    """在記憶體 SQLite 實際執行裸K清理語句，回傳留下的列與刪除筆數。"""
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE bare_k_snapshots (stock_id TEXT, date TEXT, PRIMARY KEY (stock_id, date))")
    db.executemany("INSERT INTO bare_k_snapshots VALUES (?, ?)", rows)
    deleted = db.execute(sql_storage.BARE_K_RETENTION_SQL).rowcount
    remaining = db.execute("SELECT stock_id, date FROM bare_k_snapshots ORDER BY stock_id, date").fetchall()
    db.close()
    return remaining, deleted


def test_bare_k_keeps_only_latest_row_per_stock():
    remaining, deleted = _run_bare_k_retention(
        [("2330", "2026-11-02"), ("2330", "2026-11-03"), ("2317", "2026-10-01")]
    )
    assert remaining == [("2317", "2026-10-01"), ("2330", "2026-11-03")]
    assert deleted == 1


def test_bare_k_stock_no_longer_synced_keeps_last_row():
    remaining, _ = _run_bare_k_retention([("1101", "2026-04-14"), ("2330", "2026-11-03")])
    assert ("1101", "2026-04-14") in remaining


def test_bare_k_repeated_cleanup_deletes_nothing():
    remaining, deleted = _run_bare_k_retention([("2317", "2026-10-01"), ("2330", "2026-11-03")])
    assert deleted == 0
    assert len(remaining) == 2


def test_cleanup_runs_bare_k_retention():
    statements = _run_cleanup_and_capture_sql()
    assert sql_storage.BARE_K_RETENTION_SQL in statements


def test_cleanup_failure_is_logged_and_not_raised(caplog: pytest.LogCaptureFixture):
    storage = object.__new__(SQLStorage)
    conn = MagicMock()
    conn.execute.side_effect = RuntimeError("db down")
    engine = MagicMock()
    engine.connect.return_value.__enter__ = MagicMock(return_value=conn)
    engine.connect.return_value.__exit__ = MagicMock(return_value=False)
    storage.engine = engine

    storage.cleanup_old_data()

    conn.commit.assert_not_called()
    assert "db down" in caplog.text


# ── etf_holdings_snapshot 屬性欄位保留（每支 ETF 只留最新 2 個日期） ──

_SNAPSHOT_ROWS = [
    # (etf_code, stock_code, data_date, weight, shares, price, is_disposal)
    ("00981A", "2330", "2026-11-13", 9.12, 1000, 1050.0, 0),
    ("00981A", "2330", "2026-11-12", 9.10, 1000, 1040.0, 0),
    ("00981A", "2330", "2026-11-11", 9.05, 990, 1035.0, 1),
    ("00980A", "2330", "2026-11-07", 7.00, 500, 1000.0, 0),
    ("00980A", "2330", "2026-11-06", 6.90, 500, 990.0, 0),
    ("00980A", "2330", "2026-11-05", 6.80, 480, 980.0, 0),
]


def _snapshot_db() -> sqlite3.Connection:
    """欄位限制比照正式 DB：is_disposal 為 NOT NULL DEFAULT false（2026-11-15 實測）。"""
    db = sqlite3.connect(":memory:")
    attr_cols = ", ".join(f"{c} NUMERIC" for c in sql_storage.SNAPSHOT_ATTRIBUTE_COLUMNS)
    db.execute(
        "CREATE TABLE etf_holdings_snapshot (etf_code TEXT, stock_code TEXT, stock_name TEXT, "
        f"data_date TEXT, weight NUMERIC, shares INTEGER, updated_at TEXT, {attr_cols}, "
        "is_disposal INTEGER NOT NULL DEFAULT 0, "
        "PRIMARY KEY (etf_code, stock_code, data_date))"
    )
    for etf, code, d, w, s, price, disposal in _SNAPSHOT_ROWS:
        values = {c: 1 for c in sql_storage.SNAPSHOT_ATTRIBUTE_COLUMNS}
        values.update(price=price, is_disposal=disposal)
        cols = ", ".join(values)
        marks = ", ".join("?" for _ in values)
        db.execute(
            f"INSERT INTO etf_holdings_snapshot (etf_code, stock_code, stock_name, data_date, weight, shares, "
            f"updated_at, {cols}) VALUES (?, ?, '台積電', ?, ?, ?, 'ts', {marks})",
            (etf, code, d, w, s, *values.values()),
        )
    return db


def _row(db: sqlite3.Connection, etf: str, d: str) -> dict:
    cur = db.execute("SELECT * FROM etf_holdings_snapshot WHERE etf_code = ? AND data_date = ?", (etf, d))
    names = [c[0] for c in cur.description]
    return dict(zip(names, cur.fetchone()))


def test_snapshot_attributes_cleared_only_beyond_latest_two_dates():
    db = _snapshot_db()
    db.execute(sql_storage.SNAPSHOT_ATTRIBUTE_RETENTION_SQL)

    assert _row(db, "00981A", "2026-11-13")["price"] == 1050.0
    assert _row(db, "00981A", "2026-11-12")["price"] == 1040.0
    old = _row(db, "00981A", "2026-11-11")
    assert all(old[c] is None for c in sql_storage.SNAPSHOT_ATTRIBUTE_COLUMNS)
    assert (old["weight"], old["shares"], old["stock_name"], old["updated_at"]) == (9.05, 990, "台積電", "ts")
    assert old["is_disposal"] == 1  # NOT NULL 欄位不清空，保留原值


def test_snapshot_attribute_columns_exclude_not_null_is_disposal():
    assert "is_disposal" not in sql_storage.SNAPSHOT_ATTRIBUTE_COLUMNS


def test_snapshot_attribute_retention_is_per_etf():
    db = _snapshot_db()
    db.execute(sql_storage.SNAPSHOT_ATTRIBUTE_RETENTION_SQL)

    assert _row(db, "00980A", "2026-11-07")["price"] == 1000.0
    assert _row(db, "00980A", "2026-11-06")["price"] == 990.0
    assert _row(db, "00980A", "2026-11-05")["price"] is None


def test_snapshot_attribute_retention_second_run_updates_nothing():
    db = _snapshot_db()
    first = db.execute(sql_storage.SNAPSHOT_ATTRIBUTE_RETENTION_SQL).rowcount
    second = db.execute(sql_storage.SNAPSHOT_ATTRIBUTE_RETENTION_SQL).rowcount
    assert first == 2
    assert second == 0


def test_cleanup_runs_snapshot_attribute_retention():
    statements = _run_cleanup_and_capture_sql()
    assert sql_storage.SNAPSHOT_ATTRIBUTE_RETENTION_SQL in statements
