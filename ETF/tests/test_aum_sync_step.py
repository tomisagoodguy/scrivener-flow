"""Unit tests for AumSyncStep reading fund assets from PipelineContext.

Covers the fix-aum-sync-from-scrapers change:
  - _build_row unit conversion (spec example table)
  - _build_row tolerance for None nav/units (aum present)
  - _sync_all reads ctx.etf_fund_assets and upserts converted records
  - _sync_all on empty dict only warns, writes nothing

All DB / upsert calls are mocked — no network or DB access.
"""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from ETF.pipeline.steps.aum_sync_step import (
    AumSyncStep,
    compute_decomposition,
    compute_premium_pct,
)


def _ctx(
    date_str: str = "2026-06-12", fund_assets: dict | None = None
) -> SimpleNamespace:
    return SimpleNamespace(date_str=date_str, etf_fund_assets=fund_assets or {})


class TestBuildRow(unittest.TestCase):
    """_build_row 單位換算與容錯。"""

    def setUp(self) -> None:
        self.step = AumSyncStep()

    def test_unit_conversion_matches_spec_example(self) -> None:
        """spec example table：aum/units → 億單位，nav 不變。"""
        assets = {"aum": 12_345_678_900, "units": 1_000_000_000, "nav": 12.3456}
        row = self.step._build_row("00981A", "2026-06-12", assets)
        assert row is not None
        self.assertEqual(row["etf_code"], "00981A")
        self.assertEqual(row["data_date"], "2026-06-12")
        self.assertAlmostEqual(row["aum_100m"], 123.456789, places=6)
        self.assertAlmostEqual(row["units"], 10.0, places=6)
        self.assertAlmostEqual(row["nav"], 12.3456, places=4)

    def test_none_aum_returns_none(self) -> None:
        """aum 缺失 → 不產 row（無法寫入 aum_100m）。"""
        row = self.step._build_row(
            "00981A", "2026-06-12", {"aum": None, "nav": 10.0, "units": 1e9}
        )
        self.assertIsNone(row)

    def test_allows_none_nav_and_units(self) -> None:
        """元大等只給 totalav：aum 有值，nav/units 為 None 仍寫入。"""
        row = self.step._build_row(
            "00990A", "2026-06-12", {"aum": 5_000_000_000, "nav": None, "units": None}
        )
        assert row is not None
        self.assertAlmostEqual(row["aum_100m"], 50.0, places=6)
        self.assertIsNone(row["nav"])
        self.assertIsNone(row["units"])


class TestSyncAll(unittest.TestCase):
    """_sync_all 從 ctx 讀取並 upsert。"""

    def setUp(self) -> None:
        self.step = AumSyncStep()
        self.services = MagicMock()

    def test_builds_and_upserts_records_from_context(self) -> None:
        """ctx.etf_fund_assets 有資料 → 組 records 並以 (services, records) 呼叫 _upsert。"""
        fund_assets = {
            "00981A": {"aum": 12_345_678_900, "units": 1_000_000_000, "nav": 12.3456},
            "00991A": {"aum": 8_000_000_000, "units": 2_000_000_000, "nav": 4.0},
        }
        ctx = _ctx(fund_assets=fund_assets)
        with patch.object(AumSyncStep, "_upsert") as mock_upsert:
            self.step._sync_all(ctx, self.services)

        mock_upsert.assert_called_once()
        call_args = mock_upsert.call_args.args
        # 簽章必須是 (services, records) — 兩引數
        self.assertEqual(len(call_args), 2)
        self.assertIs(call_args[0], self.services)
        records = call_args[1]
        self.assertEqual(len(records), 2)
        codes = {r["etf_code"] for r in records}
        self.assertEqual(codes, {"00981A", "00991A"})

    def test_empty_context_warns_and_skips_upsert(self) -> None:
        """ctx.etf_fund_assets 為空 → 只 warning，不呼叫 _upsert。"""
        ctx = _ctx(fund_assets={})
        with patch.object(AumSyncStep, "_upsert") as mock_upsert:
            with self.assertLogs(self.step.logger, level="WARNING"):
                self.step._sync_all(ctx, self.services)
        mock_upsert.assert_not_called()


class TestComputePremiumPct(unittest.TestCase):
    """premium_pct = (close - nav) / nav * 100；任一輸入缺 → None，不估計。"""

    def test_spec_example(self) -> None:
        """spec Example: close=10.25, nav=10.00 → 2.50。"""
        self.assertAlmostEqual(compute_premium_pct(10.25, 10.00), 2.50, places=6)

    def test_none_close_returns_none(self) -> None:
        self.assertIsNone(compute_premium_pct(None, 10.00))

    def test_none_nav_returns_none(self) -> None:
        self.assertIsNone(compute_premium_pct(10.25, None))

    def test_zero_nav_returns_none(self) -> None:
        """nav=0 除零保護 → None。"""
        self.assertIsNone(compute_premium_pct(10.25, 0))


class TestComputeDecomposition(unittest.TestCase):
    """inflow = Δunits × nav_t；market_pnl = units_prev × Δnav；前值缺 → (None, None)。"""

    def test_spec_example(self) -> None:
        """spec Example: prev units=10.0 nav=10.00, today units=10.5 nav=10.20。"""
        inflow, market_pnl = compute_decomposition(10.5, 10.20, 10.0, 10.00)
        assert inflow is not None and market_pnl is not None
        self.assertAlmostEqual(inflow, 5.10, places=6)
        self.assertAlmostEqual(market_pnl, 2.00, places=6)

    def test_first_day_no_prev_returns_none_pair(self) -> None:
        """首日無前日列 → 兩者皆 None。"""
        self.assertEqual(compute_decomposition(10.5, 10.20, None, None), (None, None))

    def test_missing_today_nav_returns_none_pair(self) -> None:
        """nav_t 缺 → 兩者皆 None（inflow/market_pnl 都需要 nav_t）。"""
        self.assertEqual(compute_decomposition(10.5, None, 10.0, 10.00), (None, None))

    def test_missing_today_units_returns_none_pair(self) -> None:
        self.assertEqual(compute_decomposition(None, 10.20, 10.0, 10.00), (None, None))

    def test_missing_prev_nav_only_computes_inflow(self) -> None:
        """prev units 有、prev nav 缺 → inflow 可算，market_pnl None。"""
        inflow, market_pnl = compute_decomposition(10.5, 10.20, 10.0, None)
        assert inflow is not None
        self.assertAlmostEqual(inflow, 5.10, places=6)
        self.assertIsNone(market_pnl)


class TestEnrichMechanics(unittest.TestCase):
    """_enrich_mechanics：把 close/premium_pct/inflow/market_pnl 併入 records。"""

    def setUp(self) -> None:
        self.step = AumSyncStep()

    def _record(self, nav: float | None = 10.20, units: float | None = 10.5) -> dict:
        return {
            "etf_code": "00981A",
            "data_date": "2026-07-11",
            "aum_100m": 107.1,
            "nav": nav,
            "units": units,
            "inflow_100m": None,
        }

    def test_normal_day_all_four_fields(self) -> None:
        """正常日：close 與前日列都有 → 四欄皆有值（spec 兩個 Example 合併）。"""
        records = self.step._enrich_mechanics(
            [self._record()],
            closes={"00981A": 10.25},
            prev_rows={"00981A": {"nav": 10.00, "units": 10.0}},
        )
        r = records[0]
        self.assertAlmostEqual(r["close"], 10.25, places=6)
        self.assertAlmostEqual(
            r["premium_pct"], 0.4902, places=4
        )  # (10.25-10.20)/10.20
        self.assertAlmostEqual(r["inflow"], 5.10, places=6)
        self.assertAlmostEqual(r["market_pnl"], 2.00, places=6)

    def test_first_day_decomposition_null(self) -> None:
        """首日：無前日列 → inflow/market_pnl None，premium 仍可算。"""
        records = self.step._enrich_mechanics(
            [self._record()], closes={"00981A": 10.25}, prev_rows={}
        )
        r = records[0]
        self.assertIsNotNone(r["premium_pct"])
        self.assertIsNone(r["inflow"])
        self.assertIsNone(r["market_pnl"])

    def test_nav_missing_everything_null_but_close_kept(self) -> None:
        """NAV 缺漏：premium/inflow/market_pnl 全 None（不估計），close 照存。"""
        records = self.step._enrich_mechanics(
            [self._record(nav=None)],
            closes={"00981A": 10.25},
            prev_rows={"00981A": {"nav": 10.00, "units": 10.0}},
        )
        r = records[0]
        self.assertAlmostEqual(r["close"], 10.25, places=6)
        self.assertIsNone(r["premium_pct"])
        self.assertIsNone(r["inflow"])
        self.assertIsNone(r["market_pnl"])

    def test_close_missing_decomposition_still_computed(self) -> None:
        """close 缺（FinLab 無價）：close/premium None，拆解照算（只依 nav/units）。"""
        records = self.step._enrich_mechanics(
            [self._record()],
            closes={},
            prev_rows={"00981A": {"nav": 10.00, "units": 10.0}},
        )
        r = records[0]
        self.assertIsNone(r["close"])
        self.assertIsNone(r["premium_pct"])
        self.assertAlmostEqual(r["inflow"], 5.10, places=6)
        self.assertAlmostEqual(r["market_pnl"], 2.00, places=6)

    def test_stale_prev_row_skips_decomposition(self) -> None:
        """前值距當日超過 7 天（資料缺口）→ 拆解 None，避免跨缺口的假申購量。"""
        records = self.step._enrich_mechanics(
            [self._record()],  # data_date 2026-07-11
            closes={"00981A": 10.25},
            prev_rows={
                "00981A": {"nav": 10.00, "units": 10.0, "data_date": "2026-04-22"}
            },
        )
        r = records[0]
        self.assertIsNone(r["inflow"])
        self.assertIsNone(r["market_pnl"])
        self.assertIsNotNone(r["premium_pct"])  # 折溢價只看當日，不受缺口影響

    def test_recent_prev_row_within_gap_computes(self) -> None:
        """前值在 7 天內（含跨週末）→ 正常計算。"""
        records = self.step._enrich_mechanics(
            [self._record()],
            closes={"00981A": 10.25},
            prev_rows={
                "00981A": {"nav": 10.00, "units": 10.0, "data_date": "2026-07-08"}
            },
        )
        self.assertAlmostEqual(records[0]["inflow"], 5.10, places=6)

    def test_decimal_prev_row_from_db(self) -> None:
        """DB NUMERIC 回傳 Decimal → 需 float() 轉型後計算（本專案既知陷阱）。"""
        from decimal import Decimal

        records = self.step._enrich_mechanics(
            [self._record()],
            closes={"00981A": 10.25},
            prev_rows={"00981A": {"nav": Decimal("10.00"), "units": Decimal("10.0")}},
        )
        r = records[0]
        self.assertAlmostEqual(r["inflow"], 5.10, places=6)
        self.assertAlmostEqual(r["market_pnl"], 2.00, places=6)


if __name__ == "__main__":
    unittest.main()
