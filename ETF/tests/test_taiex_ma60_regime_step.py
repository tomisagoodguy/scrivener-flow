"""TaiexMa60RegimeStep 單元測試。

涵蓋：三類跌破分類、季線未成形不判跌破、下一交易日跌破門檻、狀態、本波跌破次數、
各類歷史統計（排除不足 20 日後資料的事件）、步驟失敗不中斷 pipeline。
預期值皆由合成序列的構造推得（如 close=100+i 時最近 59 日平均恰為 220）。
"""

import argparse
import logging
import pathlib
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.taiex_ma60_regime_step import (
    TaiexMa60RegimeStep,
    build_daily_record,
    compute_class_stats,
    compute_regime_frame,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rising(n: int) -> list[float]:
    """close = 100 + i：季線落後收盤 29.5 點，第 59 日起每天都站上季線。"""
    return [100.0 + i for i in range(n)]


def _frame(closes: list[float], lows: list[float] | None = None) -> pd.DataFrame:
    idx = pd.bdate_range("2020-01-01", periods=len(closes))
    close = pd.Series(closes, index=idx, dtype=float)
    low = pd.Series(lows if lows is not None else [c - 1 for c in closes], index=idx, dtype=float)
    return compute_regime_frame(close, low)


def _first_then_rebreak(total: int = 186) -> list[float]:
    """第 150 日第一次跌破（前站上 91 日），第 151～175 日站回 25 日，第 176 日再跌破。"""
    closes = _rising(total)
    closes[150] = 50.0
    closes[176] = 50.0
    return closes


def _falling_with_spike() -> list[float]:
    """收盤每日 -1 的下跌序列，第 100 日單日拉到 1000 站上季線，第 101 日跌回季線下。"""
    closes = [300.0 - i for i in range(130)]
    closes[100] = 1000.0
    return closes


# ---------------------------------------------------------------------------
# 1.1 MA60 break classification
# ---------------------------------------------------------------------------

class TestComputeRegimeFrame:
    def test_first_break_after_long_run_with_rising_average(self):
        f = _frame(_first_then_rebreak())
        assert int(f["prev_days_above"].iloc[150]) == 91
        assert bool(f["ma_rising"].iloc[150]) is True
        assert f["break_type"].iloc[150] == "first_break"

    def test_rebreak_after_short_run_with_rising_average(self):
        f = _frame(_first_then_rebreak())
        assert int(f["prev_days_above"].iloc[176]) == 25
        assert f["break_type"].iloc[176] == "rebreak_rising"

    def test_break_with_falling_average(self):
        f = _frame(_falling_with_spike())
        assert bool(f["ma_rising"].iloc[101]) is False
        assert f["break_type"].iloc[101] == "break_falling"

    def test_only_cross_days_are_breaks(self):
        f = _frame(_first_then_rebreak())
        breaks = f.index[f["break_type"].notna()]
        assert list(breaks) == [f.index[150], f.index[176]]

    def test_no_break_before_slope_lookback_exists(self):
        """季線第 59 日才成形、20 日前季線第 79 日才有，第 70 日的跌破不分類。"""
        closes = _rising(90)
        closes[70] = 50.0
        f = _frame(closes)
        assert f["break_type"].isna().all()

    def test_close_equal_to_ma_counts_as_below(self):
        closes = _rising(150) + [220.0]
        f = _frame(closes)
        assert f["ma60"].iloc[-1] == pytest.approx(220.0)
        assert f["break_type"].iloc[-1] == "first_break"


# ---------------------------------------------------------------------------
# 1.2 Wave break count / next-day threshold / state
# ---------------------------------------------------------------------------

class TestBuildDailyRecord:
    def test_threshold_is_mean_of_latest_59_closes(self):
        """close=100+i，第 91～149 日平均 = 220。"""
        f = _frame(_rising(150))
        rec = build_daily_record(f, f.index[-1], stats={})
        assert rec["next_break_threshold"] == pytest.approx(220.0)
        assert rec["next_break_type"] == "first_break"
        assert rec["state"] == "above"
        assert rec["days_above"] == 91

    def test_threshold_boundary_turns_into_break(self):
        at = _frame(_rising(150) + [220.0])
        above = _frame(_rising(150) + [220.01])
        assert at["break_type"].iloc[-1] == "first_break"
        assert above["break_type"].iloc[-1] is None

    def test_above_after_rebreak_counts_wave_and_predicts_rebreak(self):
        f = _frame(_first_then_rebreak())
        rec = build_daily_record(f, f.index[180], stats={})
        assert rec["state"] == "above"
        assert rec["days_above"] == 4
        assert rec["wave_break_count"] == 2
        assert rec["next_break_type"] == "rebreak_rising"

    def test_below_after_first_break(self):
        closes = _first_then_rebreak()
        closes[151] = 50.0
        f = _frame(closes)
        rec = build_daily_record(f, f.index[151], stats={})
        assert rec["state"] == "below_after_first_break"
        assert rec["break_type"] is None
        assert rec["wave_break_count"] == 1
        assert rec["next_break_threshold"] is None
        assert rec["next_break_type"] is None

    def test_below_after_rebreak(self):
        f = _frame(_first_then_rebreak())
        rec = build_daily_record(f, f.index[176], stats={})
        assert rec["state"] == "below_after_rebreak"
        assert rec["break_type"] == "rebreak_rising"

    def test_below_ma_falling_without_first_break(self):
        f = _frame(_falling_with_spike())
        rec = build_daily_record(f, f.index[105], stats={})
        assert rec["state"] == "below_ma_falling"
        assert rec["wave_break_count"] is None

    def test_record_uses_native_types(self):
        f = _frame(_rising(150))
        rec = build_daily_record(f, f.index[-1], stats={})
        assert rec["date"] == f.index[-1].strftime("%Y-%m-%d")
        assert type(rec["close"]) is float
        assert type(rec["days_above"]) is int
        assert type(rec["ma_rising"]) is bool


# ---------------------------------------------------------------------------
# 1.3 Historical class statistics
# ---------------------------------------------------------------------------

class TestComputeClassStats:
    @pytest.fixture()
    def stats(self) -> dict:
        """第 150 日 first_break 收 50，之後收盤 100+i；第 160 日盤中低 40；資料到第 185 日。
        第 176 日的再跌破只剩 9 日後資料 → 必須被排除。"""
        closes = _first_then_rebreak(186)
        lows = [c - 1 for c in closes]
        lows[160] = 40.0
        return compute_class_stats(_frame(closes, lows))

    def test_first_break_values(self, stats):
        s = stats["first_break"]
        assert s["n"] == 1
        assert s["next_day_up_rate"] == pytest.approx(1.0)
        assert s["median_r20"] == pytest.approx(270 / 50 - 1)  # 第 170 日收 270
        assert s["mean_r20"] == pytest.approx(270 / 50 - 1)
        assert s["up_rate_r20"] == pytest.approx(1.0)
        assert s["back_above_within20"] == 1
        assert s["median_min_low20"] == pytest.approx(40 / 50 - 1)
        assert s["count_min_low_below_5pct"] == 1
        assert s["sample_start"] == s["sample_end"] == pd.bdate_range("2020-01-01", periods=186)[150].strftime("%Y-%m-%d")

    def test_events_without_full_forward_window_are_excluded(self, stats):
        s = stats["rebreak_rising"]
        assert s["n"] == 0
        assert s["median_r20"] is None
        assert s["sample_start"] is None
        # 第 176 日的再跌破未納入：收黑日基準的樣本也停在它之前
        day176 = pd.bdate_range("2020-01-01", periods=186)[176].strftime("%Y-%m-%d")
        assert stats["down_day"]["sample_end"] < day176

    def test_down_day_baseline_excludes_back_above(self, stats):
        s = stats["down_day"]
        assert s["n"] == 1  # 唯一有完整 20 日後資料的收黑日是第 150 日
        assert s["median_r20"] == pytest.approx(270 / 50 - 1)
        assert s["back_above_within20"] is None

    def test_all_classes_present(self, stats):
        assert set(stats) == {"first_break", "rebreak_rising", "break_falling", "down_day"}


# ---------------------------------------------------------------------------
# 真實資料對帳（spec Example「reconciliation with verified history」）
# fixture：FinLab taiex_total_index 收盤／最低，1999-01-01～2026-10-16（2026-11-03 匯出）
# 預期值來自 2026-11-01 獨立驗證腳本與外部研究文章，不由被測程式產生
# ---------------------------------------------------------------------------

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "taiex_close_low_19990101_20261016.csv"


class TestReconciliationWithVerifiedHistory:
    @pytest.fixture(scope="class")
    def real(self) -> tuple[pd.DataFrame, dict]:
        df = pd.read_csv(FIXTURE, index_col="date", parse_dates=True)
        frame = compute_regime_frame(df["close"], df["low"])
        return frame, compute_class_stats(frame)

    def test_break_counts(self, real):
        frame, _ = real
        bt = frame["break_type"]
        firsts = bt[bt == "first_break"].index
        assert len(firsts) == 42
        assert firsts[0] == pd.Timestamp("1999-05-31")
        assert firsts[-1] == pd.Timestamp("2026-07-17")
        assert int((bt == "rebreak_rising").sum()) == 91
        assert int((bt.notna() & (frame["prev_days_above"] < 40)).sum()) == 133

    def test_first_break_statistics(self, real):
        s = real[1]["first_break"]
        assert s["n"] == 42
        assert s["next_day_up_rate"] == pytest.approx(23 / 42)
        assert s["median_r20"] == pytest.approx(0.0213, abs=5e-5)
        assert s["mean_r20"] == pytest.approx(0.0300, abs=5e-5)
        assert s["up_rate_r20"] == pytest.approx(28 / 42)
        assert s["back_above_within20"] == 34
        assert s["median_min_low20"] == pytest.approx(-0.0235, abs=5e-5)
        assert s["count_min_low_below_5pct"] == 13

    def test_rebreak_statistics(self, real):
        assert real[1]["rebreak_rising"]["median_r20"] == pytest.approx(0.0109, abs=5e-5)

    def test_record_on_2026_10_16(self, real):
        frame, stats = real
        rec = build_daily_record(frame, pd.Timestamp("2026-10-16"), stats)
        assert rec["close"] == pytest.approx(47111.26)
        assert rec["ma60"] == pytest.approx(46055.78, abs=0.01)
        assert rec["days_above"] == 36
        assert rec["wave_break_count"] == 5
        assert rec["next_break_type"] == "rebreak_rising"
        assert round(rec["next_break_threshold"]) == 46077


# ---------------------------------------------------------------------------
# 2.2 Step behaviour
# ---------------------------------------------------------------------------

def _make_ctx(dry_run: bool = False) -> PipelineContext:
    ctx = PipelineContext(args=argparse.Namespace(days=30, dry_run=dry_run), output_dir=pathlib.Path("."))
    ctx.date_str = "2026-10-16"
    ctx.is_dry_run = dry_run
    return ctx


def _make_services():
    services = MagicMock()
    services.finlab_srv._client.login.return_value = True
    conn = MagicMock()
    services.sql_storage.engine.connect.return_value.__enter__ = MagicMock(return_value=conn)
    services.sql_storage.engine.connect.return_value.__exit__ = MagicMock(return_value=False)
    return services, conn


class TestStep:
    def test_skips_dry_run(self):
        assert TaiexMa60RegimeStep().should_skip(_make_ctx(dry_run=True)) is True

    def test_fetch_failure_logs_error_and_does_not_write(self, caplog):
        services, conn = _make_services()
        with caplog.at_level(logging.ERROR), patch("finlab.data.get", side_effect=RuntimeError("quota exceeded")):
            TaiexMa60RegimeStep().execute(_make_ctx(), services)
        conn.execute.assert_not_called()
        assert any("quota exceeded" in r.getMessage() for r in caplog.records if r.levelno >= logging.ERROR)

    def test_writes_one_row_for_latest_available_date(self):
        closes = _rising(150)
        idx = pd.bdate_range("2026-03-01", periods=150)  # 最後一日早於 ctx.date_str
        close_df = pd.DataFrame({"TAIEX": closes}, index=idx)
        low_df = pd.DataFrame({"TAIEX": [c - 1 for c in closes]}, index=idx)
        services, conn = _make_services()
        with patch("finlab.data.get", side_effect=[close_df, low_df]):
            TaiexMa60RegimeStep().execute(_make_ctx(), services)
        assert conn.execute.call_count == 1
        params = conn.execute.call_args[0][1]
        assert params["date"] == idx[-1].strftime("%Y-%m-%d")
        assert params["state"] == "above"
        assert '"first_break"' in params["stats"]
        assert not np.isnan(params["ma60"])
