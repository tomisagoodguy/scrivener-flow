"""
BareKService 單元測試

使用 mock FinlabClient 測試訊號條件計算邏輯，不需要真實 FinLab API。
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# 確保 project root 在 path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


# ── Fixtures ─────────────────────────────────────────────────────────────


def make_price_series(values: list[float], base_date: str = "2024-01-01") -> pd.Series:
    """建立測試用日期索引 Series"""
    idx = pd.date_range(base_date, periods=len(values), freq="B")
    return pd.Series(values, index=idx)


def make_service_with_mock_data(close_data: dict[str, list[float]]) -> "BareKService":
    """建立帶 mock 資料的 BareKService"""
    from unittest.mock import MagicMock, patch

    from ETF.services.finlab.bare_k_service import BareKService

    svc = BareKService.__new__(BareKService)
    svc._global_data_loaded = True
    svc._company_map = {"2330": "台積電", "2317": "鴻海"}

    base = "2023-01-02"

    def _df(data: dict[str, list[float]]) -> pd.DataFrame:
        result = {}
        for sid, vals in data.items():
            result[sid] = make_price_series(vals, base)
        return pd.DataFrame(result) if result else pd.DataFrame()

    svc._close = _df(close_data)
    svc._open = _df({k: [v * 0.99 for v in vals] for k, vals in close_data.items()})
    svc._high = _df({k: [v * 1.01 for v in vals] for k, vals in close_data.items()})
    svc._low = _df({k: [v * 0.98 for v in vals] for k, vals in close_data.items()})
    svc._volume = _df({k: [1_000_000] * len(vals) for k, vals in close_data.items()})
    svc._margin = _df({k: [20.0] * len(vals) for k, vals in close_data.items()})  # 健康區間
    svc._rev = _df({k: [100.0] * len(vals) for k, vals in close_data.items()})
    svc._yoy = _df({k: [5.0] * len(vals) for k, vals in close_data.items()})
    svc._mom = _df({k: [1.0] * len(vals) for k, vals in close_data.items()})
    svc._trust = _df({k: [10_000] * len(vals) for k, vals in close_data.items()})  # 正值 → 投信買超
    svc._inv = pd.DataFrame()  # 集保跳過

    return svc


# ── Tests ─────────────────────────────────────────────────────────────────


class TestSignalConditions:
    """訊號條件計算邏輯驗證"""

    def _get_last_signals(self, sid: str, close_vals: list[float]) -> dict:
        """執行 compute_snapshot 並取最後一日的訊號"""
        svc = make_service_with_mock_data({sid: close_vals})
        snapshot = svc.compute_snapshot(sid, days=min(50, len(close_vals) - 10))
        assert snapshot is not None
        return snapshot["signals"][-1]

    def test_hit260_true_when_close_near_260_high(self):
        """收盤 >= 260 日高 × 0.995 時，創260高為 True"""
        # 前 300 日遞增（確保 260 日高 ≈ 最後幾日），最後一日在高點
        vals = [100.0 + i * 0.01 for i in range(310)]
        svc = make_service_with_mock_data({"2330": vals})
        snap = svc.compute_snapshot("2330", days=30)
        assert snap is not None
        last_sig = snap["signals"][-1]
        # 在遞增序列中，最後一日就是 260 日高，應成立
        assert last_sig["hit260"] is True

    def test_hit260_false_when_close_far_below_260_high(self):
        """收盤遠低於 260 日高時，創260高為 False"""
        # 先衝高再大跌
        vals = [200.0] * 280 + [100.0] * 30
        svc = make_service_with_mock_data({"2330": vals})
        snap = svc.compute_snapshot("2330", days=25)
        assert snap is not None
        last_sig = snap["signals"][-1]
        assert last_sig["hit260"] is False

    def test_margin_ok_when_rate_in_healthy_range(self):
        """融資率 2–40% 區間時，融資健康為 True"""
        vals = [100.0] * 310
        svc = make_service_with_mock_data({"2330": vals})
        # mock 融資率為 20%（已在 make_service_with_mock_data 設定）
        snap = svc.compute_snapshot("2330", days=30)
        assert snap is not None
        last_sig = snap["signals"][-1]
        assert last_sig["margin_ok"] is True

    def test_trust_ok_with_positive_10d_cumsum(self):
        """投信 10 日累計買超 > 0 時，投信買超為 True"""
        vals = [100.0] * 310
        svc = make_service_with_mock_data({"2330": vals})
        # trust 設為正值 → 10 日累計 > 0
        snap = svc.compute_snapshot("2330", days=30)
        assert snap is not None
        last_sig = snap["signals"][-1]
        assert last_sig["trust_ok"] is True


class TestComputeSnapshot:
    """compute_snapshot 回傳結構驗證"""

    def test_returns_all_required_keys(self):
        """確認 snapshot 包含所有必要欄位"""
        vals = [100.0 + i * 0.1 for i in range(310)]
        svc = make_service_with_mock_data({"2330": vals})
        snap = svc.compute_snapshot("2330", days=30)
        assert snap is not None
        for key in ("ohlcv", "mas", "signals", "margin", "revenue", "inv_chips", "summary"):
            assert key in snap, f"Missing key: {key}"

    def test_ohlcv_length_matches_days(self):
        """OHLCV 列表長度應等於 days"""
        vals = [100.0] * 310
        svc = make_service_with_mock_data({"2330": vals})
        snap = svc.compute_snapshot("2330", days=30)
        assert snap is not None
        assert len(snap["ohlcv"]) == 30

    def test_summary_has_correct_fields(self):
        """summary 欄位結構驗證"""
        vals = [100.0 + i for i in range(310)]
        svc = make_service_with_mock_data({"2330": vals})
        snap = svc.compute_snapshot("2330", days=30)
        assert snap is not None
        s = snap["summary"]
        for k in ("last_price", "change_pct", "dist_260_pct", "signals"):
            assert k in s, f"summary missing: {k}"
        for cond in ("hit260", "low_vol", "margin_ok", "rev_9max", "trust_ok"):
            assert cond in s["signals"], f"signals missing: {cond}"

    def test_returns_none_for_unknown_stock(self):
        """不存在的股票代碼應回傳 None"""
        svc = make_service_with_mock_data({"2330": [100.0] * 310})
        result = svc.compute_snapshot("9999", days=30)
        assert result is None

    def test_returns_none_for_insufficient_history(self):
        """歷史資料不足 60 筆時應回傳 None"""
        svc = make_service_with_mock_data({"2330": [100.0] * 50})
        result = svc.compute_snapshot("2330", days=20)
        assert result is None

    def test_mas_contains_expected_keys(self):
        """mas 欄位應包含 ma5/ma20/ma60/ma120/h260"""
        vals = [100.0] * 310
        svc = make_service_with_mock_data({"2330": vals})
        snap = svc.compute_snapshot("2330", days=30)
        assert snap is not None
        for k in ("ma5", "ma20", "ma60", "ma120", "h260"):
            assert k in snap["mas"], f"mas missing: {k}"


class TestSummaryCalculation:
    """summary 計算值驗證"""

    def test_change_pct_calculated_correctly(self):
        """漲跌幅計算：(今 / 昨 - 1) × 100"""
        vals = [100.0] * 308 + [100.0, 110.0]  # 最後漲 10%
        svc = make_service_with_mock_data({"2330": vals})
        snap = svc.compute_snapshot("2330", days=5)
        assert snap is not None
        assert abs(snap["summary"]["change_pct"] - 10.0) < 0.1

    def test_dist_260_pct_negative_when_below_high(self):
        """在 260 日高以下時，dist_260_pct 應為負值"""
        vals = [200.0] * 280 + [100.0] * 30
        svc = make_service_with_mock_data({"2330": vals})
        snap = svc.compute_snapshot("2330", days=20)
        assert snap is not None
        assert snap["summary"]["dist_260_pct"] < 0
