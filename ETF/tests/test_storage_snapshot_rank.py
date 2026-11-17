"""
ETFStorage.save_snapshot 必須為每列寫入 rank：同 ETF 同日依 weight 降序、同分依代碼升冪，1 起算。

背景：etf_weight_history view 改讀 snapshot 儲存的 rank（change: store-weight-history-rank），
不再即時以視窗函式計算；rank 規則必須與原 view 的
row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code) 一致。
"""
from unittest.mock import MagicMock

import pandas as pd
import pytest

from ETF.database import storage as mod

# spec Example「ranks with a tie」
EXPECTED = {"2330": 1, "2317": 2, "2454": 3, "3008": 4}
ROWS = [
    {"code": "2330", "name": "台積電", "shares": 1000, "weight": 9.5},
    {"code": "2317", "name": "鴻海", "shares": 800, "weight": 4.2},
    {"code": "2454", "name": "聯發科", "shares": 300, "weight": 4.2},
    {"code": "3008", "name": "大立光", "shares": 50, "weight": 1.0},
]


def _save(monkeypatch: pytest.MonkeyPatch, rows: list[dict]) -> list[dict]:
    posted: list[dict] = []

    def fake_post(url: str, headers: dict, json: list[dict]) -> MagicMock:  # noqa: A002
        posted.extend(json)
        return MagicMock()

    monkeypatch.setattr(mod.requests, "post", fake_post)
    storage = object.__new__(mod.ETFStorage)
    storage.supabase_url = "https://example.supabase.co"
    storage.headers = {}
    storage.save_snapshot(pd.DataFrame(rows), "00981A", "2026-11-17")
    return posted


def test_ranks_by_weight_desc_then_code_asc(monkeypatch: pytest.MonkeyPatch) -> None:
    records = _save(monkeypatch, ROWS)
    assert {r["stock_code"]: r["rank"] for r in records} == EXPECTED


def test_ranks_do_not_depend_on_input_order(monkeypatch: pytest.MonkeyPatch) -> None:
    shuffled = [ROWS[3], ROWS[2], ROWS[0], ROWS[1]]
    records = _save(monkeypatch, shuffled)
    assert {r["stock_code"]: r["rank"] for r in records} == EXPECTED


def test_rank_is_a_plain_int(monkeypatch: pytest.MonkeyPatch) -> None:
    records = _save(monkeypatch, ROWS)
    assert all(type(r["rank"]) is int for r in records)
