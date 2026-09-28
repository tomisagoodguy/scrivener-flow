"""Unit tests for SignalDetectStep._weight_shift_5d (weight-shift-5d-signal change).

_weight_shift_5d is a pure function: it takes pre-fetched etf_holdings_snapshot
rows (already limited to the 6 most recent distinct data_date values for one
etf_code) and returns weight_shift_5d signal dicts. No DB / network access.
"""

from __future__ import annotations

import unittest

from ETF.pipeline.steps.signal_detect_step import SignalDetectStep


def _snapshot_row(data_date: str, stock_code: str, weight: float, stock_name: str = "") -> dict:
    return {"data_date": data_date, "stock_code": stock_code, "stock_name": stock_name, "weight": weight}


# 6 個相異交易日，由舊到新（index 5 = 5 個交易日前, index 0 = 今日）
_SIX_DATES = [
    "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-08",
]


def _rows_for_delta(weight_5d_ago: float, weight_now: float, stock_code: str = "2330") -> list[dict]:
    """建立跨 6 個相異日期的 mock rows：5 天前 weight_5d_ago，今日 weight_now，中間 3 天任意值。"""
    rows = [_snapshot_row(_SIX_DATES[0], stock_code, weight_5d_ago, "台積電")]
    for d in _SIX_DATES[1:5]:
        rows.append(_snapshot_row(d, stock_code, weight_5d_ago))
    rows.append(_snapshot_row(_SIX_DATES[5], stock_code, weight_now, "台積電"))
    return rows


class TestWeightShift5dComputesDelta(unittest.TestCase):
    """1.1 — 計算近 5 交易日累積權重變動。"""

    def setUp(self) -> None:
        self.step = SignalDetectStep()

    def test_computes_delta_from_six_distinct_dates(self) -> None:
        rows = _rows_for_delta(weight_5d_ago=4.0, weight_now=5.0)
        results = self.step._weight_shift_5d(rows, "00981A", "2026-06-08")
        self.assertEqual(len(results), 1)
        self.assertAlmostEqual(results[0]["metadata"]["delta_pp"], 1.0, places=4)
        self.assertAlmostEqual(results[0]["metadata"]["weight_5d_ago"], 4.0, places=4)
        self.assertAlmostEqual(results[0]["metadata"]["weight_now"], 5.0, places=4)


class TestWeightShift5dThresholdBoundaries(unittest.TestCase):
    """1.2 — spec Example: Threshold boundaries 表格。"""

    def setUp(self) -> None:
        self.step = SignalDetectStep()

    def test_threshold_boundaries_table(self) -> None:
        # (weight_5d_ago, weight_now, expected_strength_or_None)
        cases = [
            (4.0, 4.5, None),
            (4.0, 5.0, 1),
            (4.0, 6.9, 1),
            (4.0, 7.0, 2),
            (8.5, 5.0, 2),
        ]
        for weight_5d_ago, weight_now, expected_strength in cases:
            with self.subTest(weight_5d_ago=weight_5d_ago, weight_now=weight_now):
                rows = _rows_for_delta(weight_5d_ago, weight_now)
                results = self.step._weight_shift_5d(rows, "00981A", "2026-06-08")
                if expected_strength is None:
                    self.assertEqual(results, [])
                else:
                    self.assertEqual(len(results), 1)
                    self.assertEqual(results[0]["strength"], expected_strength)


class TestWeightShift5dSkipsInsufficientHistory(unittest.TestCase):
    """1.3 — 相異日期不足 6 個，或個股未同時出現於今日/5日前快照 → 靜默跳過。"""

    def setUp(self) -> None:
        self.step = SignalDetectStep()

    def test_fewer_than_six_distinct_dates_returns_empty(self) -> None:
        rows = [_snapshot_row(d, "2330", 5.0) for d in _SIX_DATES[:3]]
        results = self.step._weight_shift_5d(rows, "00981A", "2026-06-03")
        self.assertEqual(results, [])

    def test_stock_missing_from_five_days_ago_snapshot_is_skipped(self) -> None:
        rows = [_snapshot_row(d, "2330", 5.0) for d in _SIX_DATES[1:]]  # 缺 index 0（5天前）
        rows.append(_snapshot_row(_SIX_DATES[5], "2454", 6.0))  # 只在今日出現的新股
        results = self.step._weight_shift_5d(rows, "00981A", "2026-06-08")
        self.assertEqual(results, [])

    def test_does_not_raise_on_insufficient_history(self) -> None:
        rows = [_snapshot_row(_SIX_DATES[0], "2330", 5.0)]
        try:
            results = self.step._weight_shift_5d(rows, "00981A", "2026-06-01")
        except Exception as e:  # noqa: BLE001 - test asserts no exception at all
            self.fail(f"_weight_shift_5d raised unexpectedly: {e}")
        self.assertEqual(results, [])


class TestWeightShift5dSignalShape(unittest.TestCase):
    """1.4 — 訊號物件欄位完整、metadata.delta_pp 正負號正確。"""

    def setUp(self) -> None:
        self.step = SignalDetectStep()

    def test_signal_shape_has_all_required_fields(self) -> None:
        rows = _rows_for_delta(weight_5d_ago=4.0, weight_now=5.0, stock_code="2330")
        results = self.step._weight_shift_5d(rows, "00981A", "2026-06-08")
        self.assertEqual(len(results), 1)
        signal = results[0]
        self.assertEqual(signal["signal_type"], "weight_shift_5d")
        self.assertEqual(signal["stock_code"], "2330")
        self.assertEqual(signal["data_date"], "2026-06-08")
        self.assertEqual(signal["etf_codes"], ["00981A"])
        self.assertIn("stock_name", signal["metadata"])
        self.assertIn("weight_5d_ago", signal["metadata"])
        self.assertIn("weight_now", signal["metadata"])
        self.assertIn("delta_pp", signal["metadata"])

    def test_delta_pp_sign_positive_for_accumulation(self) -> None:
        rows = _rows_for_delta(weight_5d_ago=4.0, weight_now=5.0)
        results = self.step._weight_shift_5d(rows, "00981A", "2026-06-08")
        self.assertGreater(results[0]["metadata"]["delta_pp"], 0)

    def test_delta_pp_sign_negative_for_reduction(self) -> None:
        rows = _rows_for_delta(weight_5d_ago=8.5, weight_now=5.0)
        results = self.step._weight_shift_5d(rows, "00991A", "2026-06-08")
        self.assertLess(results[0]["metadata"]["delta_pp"], 0)


if __name__ == "__main__":
    unittest.main()
