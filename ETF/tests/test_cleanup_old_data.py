"""cleanup_old_data 保留政策測試。

驗證 institutional_stock_daily 有 90 天滾動刪除，
且訊號結果表 institutional_signals 不在清理清單（長存）。
"""

from unittest.mock import MagicMock

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


def test_institutional_signals_never_cleaned():
    statements = _run_cleanup_and_capture_sql()
    assert not any("institutional_signals" in s for s in statements)
