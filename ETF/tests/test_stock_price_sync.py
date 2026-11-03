"""stock_prices_daily 寫入完整性：只寫有收盤價的列、單一交易 upsert、修復腳本。"""

from datetime import date

import numpy as np
import pandas as pd
import pytest

from ETF.database.sql_storage import build_price_records


def _frame(rows: list[dict]) -> pd.DataFrame:
    base = {"open": 1.0, "high": 1.0, "low": 1.0, "volume": 1000, "amount": 1e6,
            "margin_ratio": 1.0, "it_buy": 0, "margin_pct_rank": np.nan}
    return pd.DataFrame([base | r for r in rows])


# ── build_price_records ─────────────────────────────────────────────────────


def test_records_skip_margin_only_row():
    df = _frame([
        {"stock_id": "2330", "date": pd.Timestamp("2026-05-29"), "close": np.nan, "margin_ratio": 0.43},
        {"stock_id": "2330", "date": pd.Timestamp("2026-05-28"), "close": 2295.0},
    ])
    records = build_price_records(df)
    assert [(r["stock_code"], r["data_date"]) for r in records] == [("2330", "2026-05-28")]


def test_records_infinite_becomes_null():
    df = _frame([{"stock_id": "2330", "date": pd.Timestamp("2026-06-01"), "close": 100.0, "amount": np.inf}])
    (record,) = build_price_records(df)
    assert record["close"] == 100.0
    assert record["amount"] is None


@pytest.mark.parametrize(
    ("row", "expected"),
    [
        ({"close": 50.0, "volume": np.nan, "margin_ratio": np.nan, "it_buy": np.nan, "margin_pct_rank": np.nan},
         {"volume": 0, "margin_ratio": 0, "it_buy": 0, "margin_pct_rank": None}),
        ({"close": 8.0, "volume": 1000, "margin_ratio": 25.0, "it_buy": 3, "margin_pct_rank": 2.0},
         {"volume": 1000, "margin_ratio": 25.0, "it_buy": 3, "margin_pct_rank": 2.0}),
        ({"close": np.nan, "volume": 1000, "margin_ratio": 25.0, "it_buy": 3, "margin_pct_rank": 2.0}, None),
    ],
)
def test_records_defaults_example_table(row, expected):
    df = _frame([{"stock_id": "1101", "date": pd.Timestamp("2026-06-02")} | row])
    records = build_price_records(df)
    if expected is None:
        assert records == []
    else:
        (record,) = records
        assert {k: record[k] for k in expected} == expected
        assert record["currency"] == "TWD"


def test_records_missing_rank_column_is_null():
    df = _frame([{"stock_id": "1101", "date": pd.Timestamp("2026-06-02"), "close": 30.0}]).drop(
        columns=["margin_pct_rank"]
    )
    assert build_price_records(df)[0]["margin_pct_rank"] is None


def test_records_accept_plain_date_values():
    df = _frame([{"stock_id": 2330, "date": date(2026, 6, 3), "close": 10.0}])
    (record,) = build_price_records(df)
    assert record["stock_code"] == "2330" and record["data_date"] == "2026-06-03"


# ── SQLStorage.upsert_stock_prices ──────────────────────────────────────────


def test_upsert_stock_prices_writes_priced_rows_in_one_call():
    from ETF.database.sql_storage import SQLStorage

    storage = SQLStorage.__new__(SQLStorage)  # 不連 DB
    calls: list[tuple] = []
    storage._bulk_upsert = lambda sql, columns, keys, records: calls.append((sql, columns, keys, records))
    df = _frame([
        {"stock_id": "2330", "date": pd.Timestamp("2026-06-01"), "close": 1.0},
        {"stock_id": "2317", "date": pd.Timestamp("2026-06-01"), "close": 2.0},
        {"stock_id": "2454", "date": pd.Timestamp("2026-06-01"), "close": 3.0},
        {"stock_id": "9999", "date": pd.Timestamp("2026-06-01"), "close": np.nan},
    ])

    assert storage.upsert_stock_prices(df) == 3
    ((sql, columns, keys, records),) = calls
    assert "ON CONFLICT (stock_code, data_date) DO UPDATE" in sql
    assert "close = EXCLUDED.close" in sql
    assert keys == ["stock_code", "data_date"]
    assert sorted(r["stock_code"] for r in records) == ["2317", "2330", "2454"]


def test_upsert_stock_prices_skips_db_when_nothing_priced():
    from ETF.database.sql_storage import SQLStorage

    storage = SQLStorage.__new__(SQLStorage)
    storage._bulk_upsert = lambda *a: pytest.fail("should not write")
    df = _frame([{"stock_id": "9999", "date": pd.Timestamp("2026-06-01"), "close": np.nan}])
    assert storage.upsert_stock_prices(df) == 0


# ── SyncOHLCVStep ───────────────────────────────────────────────────────────


def _step_ctx():
    from unittest.mock import MagicMock

    ctx = MagicMock()
    ctx.df = pd.DataFrame({"code": [f"{1100 + i}" for i in range(20)]})
    ctx.secondary_stock_codes = []
    ctx.args.days = 30
    return ctx


def test_sync_ohlcv_step_logs_and_continues_on_write_failure(caplog):
    from unittest.mock import MagicMock

    from ETF.pipeline.steps.sync_ohlcv_step import SyncOHLCVStep

    services = MagicMock()
    services.finlab_srv.get_ohlcv.return_value = _frame(
        [{"stock_id": "1101", "date": pd.Timestamp("2026-06-01"), "close": 10.0}]
    )
    services.sql_storage.upsert_stock_prices.side_effect = RuntimeError("deadlock detected")

    with caplog.at_level("ERROR"):
        SyncOHLCVStep().execute(_step_ctx(), services)  # 不 raise

    assert "OHLCV upsert failed" in caplog.text and "deadlock detected" in caplog.text


def test_sync_ohlcv_step_writes_via_sql_storage():
    from unittest.mock import MagicMock

    from ETF.pipeline.steps.sync_ohlcv_step import SyncOHLCVStep

    services = MagicMock()
    frame = _frame([{"stock_id": "1101", "date": pd.Timestamp("2026-06-01"), "close": 10.0}])
    services.finlab_srv.get_ohlcv.return_value = frame
    services.sql_storage.upsert_stock_prices.return_value = 1

    SyncOHLCVStep().execute(_step_ctx(), services)
    services.sql_storage.upsert_stock_prices.assert_called_once_with(frame)
    services.storage.save_stock_prices.assert_not_called()


# ── repair_stock_prices ─────────────────────────────────────────────────────


class _FakeFinlab:
    def __init__(self, frame: pd.DataFrame, close_index: list[str]):
        self.frame = frame
        self.close = pd.DataFrame(index=pd.to_datetime(close_index))
        self.requested: list[tuple[list[str], int]] = []

    def _get_data(self, key):
        assert key == "close"
        return self.close

    def get_ohlcv(self, codes, days):
        self.requested.append((list(codes), days))
        return self.frame


class _FakeStorage:
    def __init__(self):
        self.written: list[pd.DataFrame] = []

    def upsert_stock_prices(self, df):
        self.written.append(df)
        return len(df[df["close"].notna()])


def test_repair_only_writes_rows_on_or_after_since(capsys):
    from ETF.scripts.repair_stock_prices import repair

    frame = _frame([
        {"stock_id": "2330", "date": pd.Timestamp("2026-03-31"), "close": 2000.0},
        {"stock_id": "2330", "date": pd.Timestamp("2026-04-01"), "close": 2010.0},
    ])
    finlab = _FakeFinlab(frame, ["2026-03-31", "2026-04-01", "2026-04-02"])
    storage = _FakeStorage()

    written = repair(storage, finlab, ["2330"], date(2026, 4, 1), dry_run=False)

    assert written == 1
    (df,) = storage.written
    assert list(df["date"]) == [pd.Timestamp("2026-04-01")]
    # FinLab 交易日 >= since 共 2 天 → 抓 2 天
    assert finlab.requested == [(["2330"], 2)]


def test_repair_dry_run_does_not_write(capsys):
    from ETF.scripts.repair_stock_prices import repair

    rows = [{"stock_id": f"{1000 + i}", "date": pd.Timestamp("2026-04-01"), "close": 1.0} for i in range(1200)]
    finlab = _FakeFinlab(_frame(rows), ["2026-04-01"])
    storage = _FakeStorage()

    planned = repair(storage, finlab, [r["stock_id"] for r in rows], date(2026, 4, 1), dry_run=True)

    assert planned == 1200
    assert storage.written == []
    assert "1200 rows would be repaired" in capsys.readouterr().out
