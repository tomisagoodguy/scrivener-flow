"""buying_pattern_stats 純函式測試：前瞻報酬、補值選取、基準樣本、週區塊重抽。"""

from datetime import date, timedelta

import pytest

from ETF.analysis.buying_pattern_stats import (
    HORIZONS,
    compute_missing_returns,
    due_missing_horizons,
    forward_return,
)

FRI = date(2026, 7, 3)


def _lookup(stock: str, prices: dict[str, float]) -> dict[tuple[str, str], float]:
    return {(stock, d): p for d, p in prices.items()}


# ── forward_return ──────────────────────────────────────────────────────────


def test_forward_return_weekend_target_uses_next_trading_close():
    lookup = _lookup("2330", {"2026-07-03": 100.0, "2026-07-06": 104.0})
    assert forward_return("2330", FRI, 1, lookup) == 0.04


def test_forward_return_none_when_three_days_without_price():
    # 目標日 7/4 起 7/4、7/5、7/6 皆無價 → 不估計
    lookup = _lookup("2330", {"2026-07-03": 100.0, "2026-07-07": 110.0})
    assert forward_return("2330", FRI, 1, lookup) is None


def test_forward_return_none_without_base_price():
    lookup = _lookup("2330", {"2026-07-06": 104.0})
    assert forward_return("2330", FRI, 1, lookup) is None


def test_horizons_are_ten_calendar_day_keys():
    assert HORIZONS == (1, 2, 3, 5, 7, 10, 15, 20, 25, 30)


# ── compute_missing_returns ─────────────────────────────────────────────────


def test_compute_missing_returns_preserves_existing_and_skips_future():
    lookup = _lookup("2330", {"2026-07-03": 100.0, "2026-07-06": 104.0, "2026-07-08": 90.0})
    event = {"stock_code": "2330", "event_date": FRI, "future_returns": {"1": 0.5}}
    # today=7/8：只到期 1、2、3、5 日；"1" 已存在不覆蓋
    result = compute_missing_returns(event, lookup, date(2026, 7, 8))
    assert result == {"2": 0.04, "3": 0.04, "5": -0.1}


def test_compute_missing_returns_accepts_json_string():
    lookup = _lookup("2330", {"2026-07-03": 100.0, "2026-07-06": 104.0})
    event = {"stock_code": "2330", "event_date": "2026-07-03", "future_returns": "{}"}
    assert compute_missing_returns(event, lookup, date(2026, 7, 4)) == {"1": 0.04}


# ── due_missing_horizons ────────────────────────────────────────────────────


def test_due_missing_horizons_only_due_and_missing():
    fr = {"1": 0.01, "2": None}
    # today = 事件日 + 5 → 到期 1,2,3,5；"1" 已有值
    assert due_missing_horizons(fr, FRI, date(2026, 7, 8)) == [2, 3, 5]


def test_due_missing_horizons_empty_when_complete():
    fr = {str(h): 0.0 for h in HORIZONS}
    assert due_missing_horizons(fr, FRI, date(2026, 12, 31)) == []


# ── BuyingPatternStep._fill_forward_returns：選取不截斷 ─────────────────────


def _fill_fixture() -> tuple[list[dict], dict[tuple[str, str], float], date]:
    """1,500 筆事件：最舊 300 筆（2026-07-01）缺 "20"，其餘 1,200 筆（2026-07-25）已齊到期天期。"""
    today = date(2026, 7, 31)
    old_fr = {str(h): 0.0 for h in HORIZONS if h < 20}
    new_fr = {str(h): 0.0 for h in HORIZONS if h <= 6}
    # 新事件排前面，對應 DB 依 event_date DESC 回傳時舊事件被擠到尾端
    events = [
        {"id": 300 + i, "stock_code": f"S{i}", "event_date": date(2026, 7, 25), "future_returns": dict(new_fr)}
        for i in range(1200)
    ] + [
        {"id": i, "stock_code": f"S{i}", "event_date": date(2026, 7, 1), "future_returns": dict(old_fr)}
        for i in range(300)
    ]
    lookup: dict[tuple[str, str], float] = {}
    for i in range(1200):
        for d in ("2026-07-01", "2026-07-21", "2026-07-25"):
            lookup[(f"S{i}", d)] = 100.0
    for i in range(300):
        lookup[(f"S{i}", "2026-07-21")] = 110.0  # 7/1 + 20 天
    return events, lookup, today


def test_fill_forward_returns_updates_all_old_events_without_truncation(monkeypatch):
    from unittest.mock import MagicMock

    from ETF.pipeline.steps import buying_pattern_step as mod

    events, lookup, today = _fill_fixture()
    captured: list[list[tuple[int, dict]]] = []
    monkeypatch.setattr(mod.BuyingPatternStep, "_fetch_window_events", staticmethod(lambda conn, cutoff: events))
    monkeypatch.setattr(mod.BuyingPatternStep, "_fetch_price_lookup", staticmethod(lambda conn, codes, cutoff, t: lookup))
    monkeypatch.setattr(mod, "bulk_merge_future_returns", lambda engine, updates: captured.append(updates))

    ctx = MagicMock(date_str=today.isoformat())
    mod.BuyingPatternStep()._fill_forward_returns(ctx, MagicMock())

    updates = dict(captured[0])
    assert len(updates) == 300
    assert all(updates[i] == {"20": 0.1} for i in range(300))
    assert not any(i >= 300 for i in updates)


def test_fill_window_covers_longest_horizon_plus_scan():
    from ETF.pipeline.steps.buying_pattern_step import FILL_WINDOW_DAYS

    assert FILL_WINDOW_DAYS == 35


# ── build_baseline_samples ──────────────────────────────────────────────────


def test_baseline_sample_matches_event_return_definition():
    from ETF.analysis.buying_pattern_stats import build_baseline_samples

    lookup = _lookup("2330", {"2026-07-03": 100.0, "2026-07-06": 104.0})
    samples = build_baseline_samples(["2330"], date(2026, 7, 1), date(2026, 7, 31), lookup)
    # 7/3（ISO 2026-W27）的 1 日報酬 = 0.04；7/6 自身往後無價 → 不產生樣本
    assert samples[1] == [((2026, 27), 0.04)]


def test_baseline_skips_days_outside_period_and_other_stocks():
    from ETF.analysis.buying_pattern_stats import build_baseline_samples

    lookup = {
        ("2330", "2026-06-30"): 100.0, ("2330", "2026-07-01"): 101.0,
        ("2330", "2026-07-02"): 103.02, ("9999", "2026-07-01"): 50.0, ("9999", "2026-07-02"): 60.0,
    }
    samples = build_baseline_samples(["2330"], date(2026, 7, 1), date(2026, 7, 31), lookup)
    assert samples[1] == [((2026, 27), 0.02)]


# ── bootstrap_excess ────────────────────────────────────────────────────────


def _weeks(n_weeks: int, per_week: int, value: float) -> list[tuple[tuple[int, int], float]]:
    return [((2026, w), value) for w in range(1, n_weeks + 1) for _ in range(per_week)]


def test_bootstrap_clearly_better_pattern_has_positive_lower_bound():
    from ETF.analysis.buying_pattern_stats import bootstrap_excess

    ci = bootstrap_excess(_weeks(20, 10, 0.05), _weeks(20, 50, 0.0))
    assert ci is not None
    # 每次重抽模式皆 +0.05、基準皆 0 → 超額報酬恆為 0.05；勝率 1 對 0 → 超額勝率恆為 1
    assert ci.ret_lo == pytest.approx(0.05) and ci.ret_hi == pytest.approx(0.05)
    assert ci.win_lo == pytest.approx(1.0) and ci.win_hi == pytest.approx(1.0)


def test_bootstrap_is_reproducible():
    import random

    from ETF.analysis.buying_pattern_stats import bootstrap_excess

    rnd = random.Random(7)
    events = [((2026, rnd.randint(1, 20)), rnd.gauss(0.01, 0.05)) for _ in range(200)]
    base = [((2026, rnd.randint(1, 20)), rnd.gauss(0.0, 0.05)) for _ in range(2000)]
    assert bootstrap_excess(events, base) == bootstrap_excess(events, base)


def test_bootstrap_insufficient_events_returns_none():
    from ETF.analysis.buying_pattern_stats import bootstrap_excess

    assert bootstrap_excess(_weeks(11, 1, 0.05), _weeks(20, 50, 0.0)) is None


def test_bootstrap_insufficient_weeks_returns_none():
    from ETF.analysis.buying_pattern_stats import bootstrap_excess

    # 70 筆但只涵蓋 7 週 → 不足 8 週
    assert bootstrap_excess(_weeks(7, 10, 0.05), _weeks(20, 50, 0.0)) is None


# ── build_stats_rows / BuyingPatternStep._refresh_stats ─────────────────────

PATTERNS = ["new_position", "window_break", "chase_high", "dip_buy", "volume_spike", "sustained_buy"]


def _stats_fixture() -> tuple[list[dict], dict[tuple[str, str], float]]:
    """6 種模式各 40 筆事件（10 週 × 4 筆），所有天期報酬 +0.02；基準股價恆定（報酬 0）。"""
    events = []
    for p in PATTERNS:
        for w in range(10):
            for k in range(4):
                events.append({
                    "pattern_type": p, "stock_code": "2330",
                    "event_date": date(2026, 5, 4) + timedelta(weeks=w),  # 每週一
                    "future_returns": {str(h): 0.02 for h in HORIZONS} | ({"1": -0.01} if k == 0 else {}),
                })
    lookup = {}
    d = date(2026, 5, 1)
    while d <= date(2026, 8, 31):
        lookup[("2330", d.isoformat())] = 100.0
        d = date.fromordinal(d.toordinal() + 1)
    return events, lookup


def test_build_stats_rows_one_row_per_pattern_and_horizon():
    from ETF.analysis.buying_pattern_stats import build_stats_rows

    events, lookup = _stats_fixture()
    rows = build_stats_rows(events, lookup)

    assert len(rows) == 60
    row = next(r for r in rows if r["pattern_type"] == "window_break" and r["horizon"] == 1)
    # 每週 4 筆中 1 筆 -0.01、3 筆 +0.02 → 勝率 0.75、平均 0.0125
    assert row["n"] == 40 and row["n_weeks"] == 10
    assert row["win_rate"] == pytest.approx(0.75)
    assert row["avg_return"] == pytest.approx(0.0125)
    assert row["baseline_win_rate"] == 0.0 and row["baseline_avg_return"] == 0.0
    assert row["excess_ret_lo"] > 0
    assert row["period_start"] == date(2026, 5, 4) and row["period_end"] == date(2026, 7, 6)


def test_refresh_stats_writes_rows(monkeypatch):
    from unittest.mock import MagicMock

    from ETF.pipeline.steps import buying_pattern_step as mod

    events, lookup = _stats_fixture()
    written: list[list[dict]] = []
    monkeypatch.setattr(mod.BuyingPatternStep, "_fetch_stats_inputs", staticmethod(lambda engine: (events, lookup)))
    monkeypatch.setattr(mod.BuyingPatternStep, "_replace_stats", staticmethod(lambda engine, rows: written.append(rows)))

    mod.BuyingPatternStep()._refresh_stats(MagicMock())
    assert len(written) == 1 and len(written[0]) == 60


def test_refresh_stats_failure_keeps_previous_stats(monkeypatch):
    from unittest.mock import MagicMock

    from ETF.pipeline.steps import buying_pattern_step as mod

    def boom(engine):
        raise RuntimeError("price query failed")

    replace = MagicMock()
    monkeypatch.setattr(mod.BuyingPatternStep, "_fetch_stats_inputs", staticmethod(boom))
    monkeypatch.setattr(mod.BuyingPatternStep, "_replace_stats", staticmethod(replace))

    mod.BuyingPatternStep()._refresh_stats(MagicMock())  # 不 raise
    replace.assert_not_called()


def test_bootstrap_ignores_event_weeks_without_baseline():
    from ETF.analysis.buying_pattern_stats import bootstrap_excess

    # 第 21 週只有事件（+1.0 極端值）、沒有基準 → 不應進入抽樣，區間只反映 +0.05
    events = _weeks(20, 10, 0.05) + [((2026, 21), 1.0)] * 10
    ci = bootstrap_excess(events, _weeks(20, 50, 0.0))
    assert ci is not None
    assert ci.ret_hi == pytest.approx(0.05)


class _FakeCursor:
    def __init__(self, log: list, fail_on_insert: bool):
        self.log, self.fail_on_insert = log, fail_on_insert

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, *args):
        if sql.startswith("INSERT") and self.fail_on_insert:
            raise RuntimeError("insert failed")
        self.log.append(sql.split()[0])


class _FakeRaw:
    def __init__(self, fail_on_insert: bool = False):
        self.log: list[str] = []
        self.fail_on_insert = fail_on_insert

    def cursor(self):
        return _FakeCursor(self.log, self.fail_on_insert)

    def commit(self):
        self.log.append("COMMIT")

    def rollback(self):
        self.log.append("ROLLBACK")

    def close(self):
        self.log.append("CLOSE")


def _engine_with(raw):
    from unittest.mock import MagicMock

    engine = MagicMock()
    engine.raw_connection.return_value = raw
    return engine


def _fake_execute_values(cur, sql, rows, template=None, page_size=100):
    cur.execute(sql.replace("VALUES %s", f"VALUES <{len(rows)} rows>"))


def test_replace_stats_deletes_then_inserts_then_commits(monkeypatch):
    from ETF.pipeline.steps import buying_pattern_step as mod

    monkeypatch.setattr(mod, "execute_values", _fake_execute_values)
    raw = _FakeRaw()
    rows = [dict.fromkeys(mod.BuyingPatternStep._STATS_COLUMNS) for _ in range(60)]
    mod.BuyingPatternStep._replace_stats(_engine_with(raw), rows)
    assert raw.log == ["DELETE", "INSERT", "COMMIT", "CLOSE"]


def test_replace_stats_rolls_back_when_insert_fails(monkeypatch):
    from ETF.pipeline.steps import buying_pattern_step as mod

    monkeypatch.setattr(mod, "execute_values", _fake_execute_values)
    raw = _FakeRaw(fail_on_insert=True)
    with pytest.raises(RuntimeError):
        mod.BuyingPatternStep._replace_stats(_engine_with(raw), [dict.fromkeys(mod.BuyingPatternStep._STATS_COLUMNS)])
    assert "COMMIT" not in raw.log
    assert raw.log == ["DELETE", "ROLLBACK", "CLOSE"]
