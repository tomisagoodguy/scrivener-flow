"""SectorRrgStep 純函式單元測試。

涵蓋：RS-Ratio/RS-Momentum 的 EMA min_periods 邊界（14 / 24 個交易日）、
四象限分類（design.md 邊界值表）、strength_score 依象限加權。
"""

import numpy as np
import pandas as pd
import pytest

from ETF.pipeline.steps.sector_rrg_step import (
    _apply_quadrant_weight,
    _classify_quadrant,
    _compute_rs_ratio_momentum,
)


def _series(n: int, start: float, step: float) -> pd.Series:
    idx = pd.date_range("2024-01-01", periods=n, freq="D")
    return pd.Series(np.linspace(start, start + step * n, n), index=idx)


class TestComputeRsRatioMomentum:
    def test_below_14_days_returns_none_none(self):
        """rs.ewm(span=14, min_periods=14) 未滿 14 筆時回傳 NaN → 兩者皆 None"""
        cat_close = _series(13, 100, 1)
        taiex_close = _series(13, 1000, 2)
        rs_ratio, rs_momentum = _compute_rs_ratio_momentum(cat_close, taiex_close)
        assert rs_ratio is None
        assert rs_momentum is None

    def test_14_to_23_days_ratio_present_momentum_none(self):
        """滿 14 筆可算 rs_ratio，但 rs_momentum 的 ewm(span=10, min_periods=10) 需再 10 筆有效值（總計 24 筆）才非 NaN"""
        cat_close = _series(20, 100, 1)
        taiex_close = _series(20, 1000, 2)
        rs_ratio, rs_momentum = _compute_rs_ratio_momentum(cat_close, taiex_close)
        assert rs_ratio is not None
        assert isinstance(rs_ratio, float)
        assert rs_momentum is None

    def test_24_days_or_more_both_present(self):
        """滿 24 筆時 rs_ratio 與 rs_momentum 皆非 NaN"""
        cat_close = _series(30, 100, 1)
        taiex_close = _series(30, 1000, 2)
        rs_ratio, rs_momentum = _compute_rs_ratio_momentum(cat_close, taiex_close)
        assert rs_ratio is not None
        assert rs_momentum is not None
        assert isinstance(rs_ratio, float)
        assert isinstance(rs_momentum, float)

    def test_misaligned_dates_use_inner_join(self):
        """族群序列與 TAIEX 序列日期不完全重疊時，僅取交集計算，交集不足 14 筆回傳 None"""
        cat_idx = pd.date_range("2024-01-01", periods=30, freq="D")
        taiex_idx = pd.date_range(
            "2024-01-20", periods=30, freq="D"
        )  # 僅與 cat_idx 重疊 11 天
        cat_close = pd.Series(np.linspace(100, 130, 30), index=cat_idx)
        taiex_close = pd.Series(np.linspace(1000, 1060, 30), index=taiex_idx)
        rs_ratio, rs_momentum = _compute_rs_ratio_momentum(cat_close, taiex_close)
        assert rs_ratio is None
        assert rs_momentum is None


class TestClassifyQuadrant:
    @pytest.mark.parametrize(
        "rs_ratio,rs_momentum,expected",
        [
            (1.05, 0.002, "leading"),
            (1.02, -0.001, "weakening"),
            (0.97, 0.003, "improving"),
            (0.95, -0.002, "lagging"),
            (1.00, 0.000, "leading"),
        ],
    )
    def test_boundary_table(self, rs_ratio, rs_momentum, expected):
        """design.md 四象限邊界值表"""
        assert _classify_quadrant(rs_ratio, rs_momentum) == expected

    def test_none_inputs_return_none(self):
        assert _classify_quadrant(None, 0.001) is None
        assert _classify_quadrant(1.05, None) is None
        assert _classify_quadrant(None, None) is None


class TestApplyQuadrantWeight:
    @pytest.mark.parametrize(
        "quadrant,multiplier",
        [
            ("leading", 1.15),
            ("improving", 1.05),
            ("weakening", 0.95),
            ("lagging", 0.85),
        ],
    )
    def test_weight_multiplied(self, quadrant, multiplier):
        assert _apply_quadrant_weight(0.02, quadrant) == pytest.approx(
            0.02 * multiplier
        )

    def test_none_quadrant_keeps_original_score(self):
        assert _apply_quadrant_weight(0.02, None) == 0.02

    def test_none_score_stays_none(self):
        assert _apply_quadrant_weight(None, "leading") is None
