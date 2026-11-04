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
