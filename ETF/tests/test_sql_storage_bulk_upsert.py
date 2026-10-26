"""
迴歸測試：sql_storage 批次 upsert 必須走 execute_values（多列 VALUES），
不可退回 `conn.execute(text(...), list_of_dicts)`。

背景：psycopg2 executemany 每列一次網路來回，CI → Supabase 約 140ms/列，
券商交易 45k 筆寫了 105 分鐘，撞 etf_financials.yml 110 分鐘 timeout。
"""
from unittest.mock import MagicMock

import pytest

from ETF.database import sql_storage as mod


def _make_storage(monkeypatch):
    calls = []

    def fake_execute_values(cur, sql, rows, template, page_size):
        calls.append({"sql": sql, "rows": list(rows), "template": template, "page_size": page_size})

    monkeypatch.setattr(mod, "execute_values", fake_execute_values)
    storage = object.__new__(mod.SQLStorage)
    raw = MagicMock()
    storage.engine = MagicMock()
    storage.engine.raw_connection.return_value = raw
    return storage, raw, calls


def test_dedupe_keeps_last_record_per_key():
    records = [
        {"stock_code": "2330", "data_date": "2026-10-21", "v": 1},
        {"stock_code": "2330", "data_date": "2026-10-21", "v": 2},
        {"stock_code": "1101", "data_date": "2026-10-21", "v": 3},
    ]
    result = mod._dedupe_by_keys(records, ["stock_code", "data_date"])
    assert sorted(r["v"] for r in result) == [2, 3]


def test_broker_upsert_uses_execute_values_single_round_trip_per_chunk(monkeypatch):
    storage, raw, calls = _make_storage(monkeypatch)
    records = [
        {
            "stock_code": f"{i:04d}",
            "data_date": "2026-10-21",
            "buy_amount": 1.0,
            "sell_amount": 2.0,
            "net_volume": -1.0,
            "force_metric": None,
        }
        for i in range(4500)
    ]

    storage.upsert_broker_transactions(records)

    assert len(calls) == 2  # 3000 + 1500 兩片
    assert "VALUES %s" in calls[0]["sql"]
    assert calls[0]["template"].startswith("(%(stock_code)s, %(data_date)s")
    assert sum(len(c["rows"]) for c in calls) == 4500
    assert raw.commit.call_count == 2


def test_bulk_upsert_rolls_back_and_raises_on_error(monkeypatch):
    storage, raw, _ = _make_storage(monkeypatch)

    def boom(*args, **kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(mod, "execute_values", boom)

    with pytest.raises(RuntimeError):
        storage._bulk_upsert("INSERT ... VALUES %s", ["a"], ["a"], [{"a": 1}])
    raw.rollback.assert_called_once()
    raw.close.assert_called_once()
