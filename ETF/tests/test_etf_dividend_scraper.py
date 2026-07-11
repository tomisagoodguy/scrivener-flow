"""Unit tests for the ETF dividend scraper and DividendSyncStep.

Source: TWSE ETF 分配收益 API（etf-market-mechanics 任務 1.1 spike 定案）。
All HTTP / DB calls are mocked — no network or DB access.
"""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from ETF.pipeline.steps.dividend_sync_step import DividendSyncStep
from ETF.scrapers.etf_dividend_scraper import _parse_response, _roc_date_to_iso


def _twse_row(
    code: str = "00984D",
    ex: str = "115年07月02日",
    base: str = "115年07月08日",
    pay: str = "115年07月24日",
    amount: object = "0.085",
) -> list:
    return [code, "主動聯博全球非投", ex, base, pay, amount, "收益分配標準說明…", 115]


class TestRocDateToIso(unittest.TestCase):
    def test_normal_roc_date(self) -> None:
        self.assertEqual(_roc_date_to_iso("115年07月02日"), "2026-07-02")

    def test_single_digit_parts(self) -> None:
        self.assertEqual(_roc_date_to_iso("114年1月5日"), "2025-01-05")

    def test_garbage_returns_none(self) -> None:
        self.assertIsNone(_roc_date_to_iso("N/A"))
        self.assertIsNone(_roc_date_to_iso(""))


class TestParseResponse(unittest.TestCase):
    def test_normal_record(self) -> None:
        """正常列 → period 由 ex_date 推導（YYYY-MM），pay_date/金額齊全。"""
        js = {"status": "ok", "data": [_twse_row()]}
        records = _parse_response(js)
        self.assertEqual(len(records), 1)
        r = records[0]
        self.assertEqual(r["etf_code"], "00984D")
        self.assertEqual(r["period"], "2026-07")
        self.assertAlmostEqual(r["cash_per_unit"], 0.085, places=6)
        self.assertEqual(r["ex_date"], "2026-07-02")
        self.assertEqual(r["pay_date"], "2026-07-24")
        self.assertIsNone(r["yield_pct"])  # 來源未提供
        self.assertEqual(r["source"], "twse_etfdiv")

    def test_null_amount_skipped(self) -> None:
        """金額 null（已公告除息日、金額未定，如 00929）→ 跳過該筆。"""
        js = {"status": "ok", "data": [_twse_row(amount=None), _twse_row()]}
        records = _parse_response(js)
        self.assertEqual(len(records), 1)

    def test_missing_pay_date_kept_with_none(self) -> None:
        """發放日缺 → pay_date None，仍保留記錄（design Open Question 預設）。"""
        js = {"status": "ok", "data": [_twse_row(pay="")]}
        records = _parse_response(js)
        self.assertEqual(len(records), 1)
        self.assertIsNone(records[0]["pay_date"])

    def test_no_dividend_etf_returns_empty(self) -> None:
        """無配息 ETF：data 空 → 空清單、不報錯。"""
        self.assertEqual(_parse_response({"status": "ok", "data": []}), [])
        self.assertEqual(_parse_response({"status": "ok"}), [])


class TestDividendSyncStep(unittest.TestCase):
    def setUp(self) -> None:
        self.step = DividendSyncStep()
        self.services = MagicMock()
        self.ctx = SimpleNamespace(is_dry_run=False, date_str="2026-07-11")

    def test_skips_on_dry_run(self) -> None:
        self.assertTrue(self.step.should_skip(SimpleNamespace(is_dry_run=True)))

    def test_single_etf_failure_logs_and_continues(self) -> None:
        """單一 ETF fetch 失敗 → log error，其餘 ETF 照常 upsert，不 raise。"""
        records = [_dividend_record("00984D")]

        def fake_fetch(code: str) -> list[dict]:
            if code == "00981A":
                raise RuntimeError("boom")
            return records if code == "00984D" else []

        with (
            patch(
                "ETF.pipeline.steps.dividend_sync_step.get_all_etf_codes",
                return_value=["00981A", "00984D", "00990A"],
            ),
            patch(
                "ETF.pipeline.steps.dividend_sync_step.fetch_dividends",
                side_effect=fake_fetch,
            ),
            patch.object(DividendSyncStep, "_upsert") as mock_upsert,
            self.assertLogs(self.step.logger, level="ERROR"),
        ):
            self.step.execute(self.ctx, self.services)

        mock_upsert.assert_called_once()
        upserted = mock_upsert.call_args.args[1]
        self.assertEqual(len(upserted), 1)
        self.assertEqual(upserted[0]["etf_code"], "00984D")

    def test_no_records_no_upsert(self) -> None:
        """全部 ETF 無配息 → 不呼叫 _upsert、不報錯。"""
        with (
            patch(
                "ETF.pipeline.steps.dividend_sync_step.get_all_etf_codes",
                return_value=["00990A"],
            ),
            patch(
                "ETF.pipeline.steps.dividend_sync_step.fetch_dividends",
                return_value=[],
            ),
            patch.object(DividendSyncStep, "_upsert") as mock_upsert,
        ):
            self.step.execute(self.ctx, self.services)
        mock_upsert.assert_not_called()

    def test_step_is_auxiliary(self) -> None:
        """輔助步驟：is_critical 必須為 False（失敗不中斷 pipeline）。"""
        self.assertFalse(self.step.is_critical)


def _dividend_record(etf_code: str) -> dict:
    return {
        "etf_code": etf_code,
        "period": "2026-07",
        "cash_per_unit": 0.085,
        "ex_date": "2026-07-02",
        "pay_date": "2026-07-24",
        "yield_pct": None,
        "source": "twse_etfdiv",
    }


if __name__ == "__main__":
    unittest.main()
