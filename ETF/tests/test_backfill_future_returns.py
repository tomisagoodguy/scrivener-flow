"""Tests for backfill_future_returns.py：全歷史分頁回補與冪等。"""

from datetime import date

import pytest

from ETF.pipeline.steps import backfill_future_returns as mod

TODAY = date(2026, 7, 31)


@pytest.fixture
def fake_db(monkeypatch):
    """2,500 筆 2026-07-01 事件皆缺 "20"，股價齊；merge 寫回記憶體以模擬重跑。"""
    events = {
        i: {"id": i, "stock_code": f"S{i % 50}", "event_date": date(2026, 7, 1),
            "future_returns": {"1": 0.0}}
        for i in range(1, 2501)
    }
    lookup = {}
    for s in range(50):
        lookup[(f"S{s}", "2026-07-01")] = 100.0
        lookup[(f"S{s}", "2026-07-21")] = 105.0
    pages: list[int] = []

    def fetch_page(conn, last_id, page_size):
        ids = sorted(i for i in events if i > last_id)[:page_size]
        pages.append(len(ids))
        return [dict(events[i], future_returns=dict(events[i]["future_returns"])) for i in ids]

    def merge(engine, updates):
        for event_id, new_data in updates:
            events[event_id]["future_returns"].update(new_data)

    monkeypatch.setattr(mod, "_fetch_page", fetch_page)
    monkeypatch.setattr(mod, "_fetch_price_lookup", lambda engine, page, today: lookup)
    monkeypatch.setattr(mod, "bulk_merge_future_returns", merge)
    return events, pages


class _Engine:
    def connect(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_run_backfill_updates_every_page(fake_db):
    events, pages = fake_db
    updated = mod.run_backfill(_Engine(), today=TODAY)

    assert updated == 2500
    assert pages[:3] == [1000, 1000, 500]
    assert all(e["future_returns"]["20"] == 0.05 for e in events.values())
    assert all(e["future_returns"]["1"] == 0.0 for e in events.values())  # 既有值不覆蓋


def test_run_backfill_is_idempotent(fake_db):
    mod.run_backfill(_Engine(), today=TODAY)
    assert mod.run_backfill(_Engine(), today=TODAY) == 0


def test_main_prints_no_records_when_nothing_updated(monkeypatch, capsys):
    monkeypatch.setenv("DATABASE_URL", "postgresql://fake")
    monkeypatch.setattr("sqlalchemy.create_engine", lambda url: _Engine())
    monkeypatch.setattr(mod, "run_backfill", lambda engine, today=None: 0)

    assert mod.main() == 0
    assert "No records need backfill" in capsys.readouterr().out


def test_main_prints_updated_count(monkeypatch, capsys):
    monkeypatch.setenv("DATABASE_URL", "postgresql://fake")
    monkeypatch.setattr("sqlalchemy.create_engine", lambda url: _Engine())
    monkeypatch.setattr(mod, "run_backfill", lambda engine, today=None: 2500)

    assert mod.main() == 0
    assert "Updated future_returns for 2500 records" in capsys.readouterr().out


def test_import_does_not_touch_global_logging_or_sys_path():
    import importlib
    import logging
    import sys

    root = logging.getLogger()
    saved = list(root.handlers)
    root.handlers.clear()  # pytest 已掛 handler 時 basicConfig 不生效，先清空才測得到
    path_before = list(sys.path)
    try:
        importlib.reload(mod)
        assert root.handlers == []
        assert sys.path == path_before
    finally:
        root.handlers[:] = saved
