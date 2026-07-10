"""MarketChipsStep 純函式單元測試。

涵蓋：散戶多空比運算（spec 範例值）、三種訊號各正/反例，
含「幅度不足不觸發 divergence」與「跨週末仍算連續交易日」。
"""

from ETF.pipeline.steps.market_chips_step import (
    compute_consecutive_buy,
    compute_divergence,
    compute_dual_buy,
    compute_retail_rows,
)


def _pos(contract: str, institution: str, long_oi: int, short_oi: int) -> dict:
    return {
        "contract": contract,
        "institution": institution,
        "long_oi": long_oi,
        "short_oi": short_oi,
        "net_oi": long_oi - short_oi,
    }


def _row(code: str, foreign: int, trust: int) -> dict:
    return {"stock_code": code, "foreign_net": foreign, "trust_net": trust}


class TestComputeRetailRows:
    def test_spec_example_ratio_arithmetic(self):
        """spec 範例：TMF market_oi=100000，法人多單合計 40000、空單合計 55000 → 15.0"""
        positions = [
            _pos("TMF", "dealer", 10000, 20000),
            _pos("TMF", "trust", 10000, 15000),
            _pos("TMF", "foreign", 20000, 20000),
        ]
        rows = compute_retail_rows(positions, {"TMF": 100000})
        assert len(rows) == 1
        row = rows[0]
        assert row["institution"] == "retail_summary"
        assert row["long_oi"] == 60000
        assert row["short_oi"] == 45000
        assert row["retail_ls_ratio"] == 15.0
        assert row["market_oi"] == 100000

    def test_tx_never_gets_retail_row(self):
        """TX 不計算散戶多空比（即使給了 market_oi 也不產生列）"""
        positions = [
            _pos("TX", "dealer", 1000, 2000),
            _pos("TX", "trust", 1000, 1500),
            _pos("TX", "foreign", 2000, 2000),
        ]
        rows = compute_retail_rows(positions, {"TX": 100000, "MXF": 0, "TMF": 0})
        assert rows == []

    def test_missing_market_oi_skips_contract(self):
        positions = [
            _pos("MXF", "dealer", 100, 200),
            _pos("MXF", "trust", 100, 150),
            _pos("MXF", "foreign", 200, 200),
        ]
        assert compute_retail_rows(positions, {}) == []


class TestComputeDualBuy:
    def test_both_positive_fires(self):
        signals = compute_dual_buy([_row("2330", 5000, 3000)])
        assert len(signals) == 1
        assert signals[0]["signal_type"] == "dual_buy"
        assert signals[0]["metadata"] == {"foreign_net": 5000, "trust_net": 3000}

    def test_one_negative_does_not_fire(self):
        assert compute_dual_buy([_row("2330", 5000, -3000)]) == []
        assert compute_dual_buy([_row("2330", -5000, 3000)]) == []
        assert compute_dual_buy([_row("2330", 5000, 0)]) == []


class TestComputeDivergence:
    def test_opposite_signs_in_top_rank_fires(self):
        rows = [_row("2330", 100000, -80000)] + [
            _row(f"{1000 + i}", 10, 10) for i in range(60)
        ]
        signals = compute_divergence(rows, top_n=50)
        codes = [s["stock_code"] for s in signals]
        assert codes == ["2330"]
        assert signals[0]["metadata"] == {"foreign_net": 100000, "trust_net": -80000}

    def test_insufficient_magnitude_does_not_fire(self):
        """spec 反例：+200/−100 但兩者絕對值皆不進當日前 50 → 不觸發"""
        big = [_row(f"{2000 + i}", 1_000_000 - i, -(900_000 - i)) for i in range(50)]
        rows = big + [_row("9999", 200, -100)]
        signals = compute_divergence(rows, top_n=50)
        assert "9999" not in [s["stock_code"] for s in signals]

    def test_same_sign_does_not_fire(self):
        rows = [_row("2330", 100000, 80000)] + [
            _row(f"{1000 + i}", 10, 10) for i in range(10)
        ]
        assert compute_divergence(rows, top_n=50) == []


class TestComputeConsecutiveBuy:
    def test_three_trading_days_across_weekend_fires(self):
        """spec 情境：週五/週一/週二皆正 → 週二觸發（以交易日計，跨週末不中斷）"""
        daily = [
            ("2026-07-07", {"2330": _row("2330", 1000, 500)}),   # Tue
            ("2026-07-06", {"2330": _row("2330", 800, 200)}),    # Mon
            ("2026-07-03", {"2330": _row("2330", 300, 100)}),    # Fri
        ]
        signals = compute_consecutive_buy(daily, min_days=3)
        assert len(signals) == 1
        meta = signals[0]["metadata"]
        assert meta["consecutive_days"] == 3
        assert meta["combined_series"] == [1500, 1000, 400]
        assert meta["foreign_net"] == 1000

    def test_two_days_only_does_not_fire(self):
        daily = [
            ("2026-07-07", {"2330": _row("2330", 1000, 500)}),
            ("2026-07-06", {"2330": _row("2330", 800, 200)}),
            ("2026-07-03", {"2330": _row("2330", -300, 100)}),  # 合計 < 0，中斷
        ]
        assert compute_consecutive_buy(daily, min_days=3) == []

    def test_missing_day_breaks_streak(self):
        daily = [
            ("2026-07-07", {"2330": _row("2330", 1000, 500)}),
            ("2026-07-06", {}),  # 該日無此股資料
            ("2026-07-03", {"2330": _row("2330", 300, 100)}),
        ]
        assert compute_consecutive_buy(daily, min_days=3) == []

    def test_streak_longer_than_min_reports_actual_days(self):
        daily = [
            (f"2026-07-0{7 - i}", {"2330": _row("2330", 100, 100)}) for i in range(5)
        ]
        signals = compute_consecutive_buy(daily, min_days=3)
        assert signals[0]["metadata"]["consecutive_days"] == 5
