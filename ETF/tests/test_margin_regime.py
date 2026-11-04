"""margin_regime 純函式與 MarginRegimeStep 測試。"""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from ETF.analysis.margin_regime import (
    build_margin_record,
    compute_margin_frame,
    compute_margin_stats,
)

FIXTURE = Path(__file__).parent / "fixtures" / "margin_regime_20080101_20261102.csv"


def _series(values, start="2020-01-01") -> pd.Series:
    return pd.Series(values, index=pd.bdate_range(start, periods=len(values)), dtype=float)


# ── compute_margin_frame ────────────────────────────────────────────────────


def test_frame_one_year_high_needs_250_days():
    margin = _series(np.arange(1, 301))
    close = _series(np.full(300, 100.0))
    frame = compute_margin_frame(margin, close, close)
    assert frame["margin_1y_high"].iloc[:249].isna().all()  # 不滿 250 日不判定
    assert frame["margin_1y_high"].iloc[249:].eq(1.0).all()  # 遞增序列每天都是新高


def test_frame_one_year_high_false_below_max():
    margin = _series(np.r_[np.full(250, 100.0), 99.0])
    close = _series(np.full(251, 100.0))
    assert compute_margin_frame(margin, close, close)["margin_1y_high"].iloc[-1] == 0.0


def test_frame_drawdown_uses_next_60_day_intraday_low():
    close = _series(np.full(400, 100.0))
    low = close.copy()
    low.iloc[100] = 90.0  # 第 100 日盤中 90 → 第 40～99 日的前瞻 60 日內觸及 -10%
    frame = compute_margin_frame(_series(np.ones(400)), close, low)
    assert frame["dd10"].iloc[40] == 1.0 and frame["dd10"].iloc[99] == 1.0
    assert frame["dd10"].iloc[39] == 0.0 and frame["dd10"].iloc[100] == 0.0  # 當日不算
    assert frame["dd10"].iloc[-60:].isna().all()  # 前瞻不足 60 日


def test_frame_index_near_high_three_percent():
    close = _series(np.r_[np.full(249, 100.0), 97.0, 96.9])
    frame = compute_margin_frame(_series(np.ones(251)), close, close)
    assert frame["index_near_high"].iloc[249] == 1.0
    assert frame["index_near_high"].iloc[250] == 0.0


# ── compute_margin_stats：FinLab fixture 對帳 ────────────────────────────────


@pytest.fixture(scope="module")
def fixture_stats() -> dict:
    df = pd.read_csv(FIXTURE, parse_dates=["date"], index_col="date")
    return compute_margin_stats(compute_margin_frame(df["margin"], df["close"], df["low"]))


def test_stats_reproduce_verified_study(fixture_stats):
    s = fixture_stats
    assert s["margin_high"]["n"] == 588
    assert s["margin_high"]["dd10_rate"] == pytest.approx(0.138, abs=0.005)
    assert s["all"]["dd10_rate"] == pytest.approx(0.201, abs=0.005)
    assert s["index_high_only"]["n"] == 196
    assert s["index_high_only"]["dd10_rate"] == pytest.approx(0.102, abs=0.005)
    assert s["shadow"]["margin_high"] == pytest.approx(0.935, abs=0.005)
    assert s["shadow"]["all"] == pytest.approx(0.400, abs=0.005)
    assert s["sample_start"] == "2008-01-04"  # fixture 第 250 個交易日，一年新高才可判定


def test_stats_margin_high_interval_crosses_zero(fixture_stats):
    ci = fixture_stats["diff"]["margin_high_vs_all"]
    assert ci["lo"] < 0 < ci["hi"]


def test_stats_are_json_serialisable(fixture_stats):
    import json

    json.dumps(fixture_stats)


# ── build_margin_record ─────────────────────────────────────────────────────


def test_record_uses_latest_row_and_converts_units():
    margin = _series(np.r_[np.full(250, 5e11), 8.817e11])  # 元
    close = _series(np.full(251, 100.0))
    frame = compute_margin_frame(margin, close, close)
    record = build_margin_record(frame, frame.index[-1], {"k": 1})
    assert record["date"] == frame.index[-1].strftime("%Y-%m-%d")
    assert record["margin_balance"] == pytest.approx(8817.0)  # 億元
    assert record["margin_1y_high"] is True and record["index_near_high"] is True
    assert record["stats"] == {"k": 1}


# ── MarginRegimeStep ────────────────────────────────────────────────────────


def _ctx(date_str="2026-11-02"):
    from unittest.mock import MagicMock

    ctx = MagicMock()
    ctx.date_str = date_str
    ctx.is_dry_run = False
    return ctx


def test_step_failure_logs_and_writes_nothing(monkeypatch, caplog):
    from unittest.mock import MagicMock

    from ETF.pipeline.steps import margin_regime_step as mod

    def boom(self):
        raise RuntimeError("margin_balance unavailable")

    upsert = MagicMock()
    monkeypatch.setattr(mod.MarginRegimeStep, "_fetch_series", boom)
    monkeypatch.setattr(mod.MarginRegimeStep, "_upsert", upsert)

    with caplog.at_level("ERROR"):
        mod.MarginRegimeStep().execute(_ctx(), MagicMock())
    upsert.assert_not_called()
    assert "margin_balance unavailable" in caplog.text


def test_step_writes_one_record_for_target_date(monkeypatch):
    from unittest.mock import MagicMock

    from ETF.pipeline.steps import margin_regime_step as mod

    df = pd.read_csv(FIXTURE, parse_dates=["date"], index_col="date")
    written: list[dict] = []
    monkeypatch.setattr(mod.MarginRegimeStep, "_fetch_series", lambda self: (df["margin"], df["close"], df["low"]))
    monkeypatch.setattr(mod.MarginRegimeStep, "_upsert", lambda self, record, services: written.append(record))

    mod.MarginRegimeStep().execute(_ctx("2026-11-02"), MagicMock())
    (record,) = written
    assert record["date"] == "2026-11-02"
    assert record["stats"]["margin_high"]["n"] == 588


def test_step_registered_after_taiex_regime():
    from ETF.pipeline import orchestrator

    names = [cls.__name__ for cls in orchestrator.PipelineOrchestrator.DEFAULT_STEPS]
    assert names.index("MarginRegimeStep") == names.index("TaiexMa60RegimeStep") + 1


def test_upsert_overwrites_same_date():
    from unittest.mock import MagicMock

    from ETF.pipeline.steps.margin_regime_step import MarginRegimeStep

    services = MagicMock()
    conn = services.sql_storage.engine.connect.return_value.__enter__.return_value
    record = {"date": "2026-11-02", "margin_balance": 1.0, "margin_1y_high": False,
              "index_near_high": False, "stats": {}}
    MarginRegimeStep()._upsert(record, services)
    sql = str(conn.execute.call_args[0][0])
    assert "ON CONFLICT (date) DO UPDATE" in sql
    conn.commit.assert_called_once()


def test_step_skips_write_when_margin_not_published(monkeypatch, caplog):
    from unittest.mock import MagicMock

    from ETF.pipeline.steps import margin_regime_step as mod

    df = pd.read_csv(FIXTURE, parse_dates=["date"], index_col="date")
    extra = pd.Timestamp("2026-11-03")  # 指數已有當天、融資尚未公布
    close = pd.concat([df["close"], pd.Series([23000.0], index=[extra])])
    low = pd.concat([df["low"], pd.Series([22900.0], index=[extra])])
    upsert = MagicMock()
    monkeypatch.setattr(mod.MarginRegimeStep, "_fetch_series", lambda self: (df["margin"], close, low))
    monkeypatch.setattr(mod.MarginRegimeStep, "_upsert", upsert)

    with caplog.at_level("WARNING"):
        mod.MarginRegimeStep().execute(_ctx("2026-11-03"), MagicMock())
    upsert.assert_not_called()
    assert "margin not published" in caplog.text
