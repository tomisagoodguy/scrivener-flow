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

from ETF.pipeline.steps.aum_sync_step import AumSyncStep


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


if __name__ == "__main__":
    unittest.main()
