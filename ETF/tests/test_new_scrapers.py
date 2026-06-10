"""Unit tests for new scrapers: JPM XLSX, Cathay REST API, CTBC HTML.

Tests follow TDD Red-Green-Refactor. All HTTP calls are mocked.
"""

from __future__ import annotations

import io
import json
import unittest
from unittest.mock import MagicMock, patch

import pandas as pd


# ── Helpers ────────────────────────────────────────────────────────────────────


def _make_jpm_xlsx(total_market_value: float = 1_000_000.0) -> bytes:
    """Build a minimal JPM-style XLSX in memory with two-section structure."""
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active

    # Section 1: Summary header + one "S" row
    ws.append(["Record Type", "Fund Ticker", "Fund Name", "Estimated Total Market Value"])
    ws.append(["S", "00401A TW", "JPM Taiwan ETF", total_market_value])
    ws.append([])  # spacer

    # Section 2: Detail header + "D" rows
    ws.append(["Record Type", "Constituent Ticker", "Constituent Description", "Shares or PAR Amount", "Market Value Base"])
    ws.append(["D", "2330", "TSMC", 10_000, 100_000.0])
    ws.append(["D", "2454", "MediaTek", 5_000, 50_000.0])
    ws.append(["T", "TOTAL", "", None, 150_000.0])  # total row, should be skipped

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _make_cathay_json(stock_weights: list[dict] | None = None) -> bytes:
    """Build a Cathay GetIndexStockWeights JSON response."""
    if stock_weights is None:
        stock_weights = [
            {"stockCode": "2330", "stockName": "台積電", "weights": 9.78},
            {"stockCode": "2454", "stockName": "聯發科", "weights": 6.09},
        ]
    payload = {"result": {"stockWeights": stock_weights}}
    return json.dumps(payload).encode("utf-8")


def _make_ctbc_html(holdings: list[tuple[str, str, str, str]] | None = None, label_aum01: str = "2026/04/21") -> bytes:
    """Build a minimal CTBC ASP.NET pcd.aspx HTML page."""
    if holdings is None:
        holdings = [
            ("2330", "台積電", "10,000", "9.78"),
            ("2454", "聯發科", "5,000", "6.09"),
        ]
    rows_html = "\n".join(
        f"<tr><td>{code}</td><td>{name}</td><td>{shares}</td><td>{weight}%</td></tr>"
        for code, name, shares, weight in holdings
    )
    return f"""<html><body>
    <span id="Label_AUM01">{label_aum01}</span>
    <span id="Label_AUM02">100,000,000</span>
    <table>
      <tr><th>代號</th><th>名稱</th><th>股數</th><th>比重(%)</th></tr>
      {rows_html}
      <tr><td>非4位</td><td>不應出現</td><td>0</td><td>0.00</td></tr>
    </table>
    </body></html>""".encode("utf-8")


# ── CATALOG entry tests ────────────────────────────────────────────────────────


class TestCatalogEntries(unittest.TestCase):
    """Tasks 1.1–1.4: Verify CATALOG has correct entries for new ETFs."""

    def setUp(self) -> None:
        from ETF.scrapers.official_api_scraper import CATALOG
        self.catalog = CATALOG

    def test_00400A_cathay_entry(self) -> None:
        """00400A 應有 issuer='cathay' 且 fund_code='EA'。"""
        self.assertIn("00400A", self.catalog)
        entry = self.catalog["00400A"]
        self.assertEqual(entry["issuer"], "cathay")
        self.assertEqual(entry["fund_code"], "EA")

    def test_00996A_fund_id_is_23(self) -> None:
        """00996A fund_id 應從 None 改為 '23'。"""
        self.assertIn("00996A", self.catalog)
        self.assertEqual(self.catalog["00996A"]["fund_id"], "23")

    def test_00401A_jpm_entry(self) -> None:
        """00401A 應有 issuer='jpm' 且含正確 xlsx_url。"""
        self.assertIn("00401A", self.catalog)
        entry = self.catalog["00401A"]
        self.assertEqual(entry["issuer"], "jpm")
        self.assertIn("00401A_TW00000401A1.xlsx", entry["xlsx_url"])

    def test_00989A_jpm_entry(self) -> None:
        """00989A 應有 issuer='jpm' 且含正確 xlsx_url，與 00401A 不同。"""
        self.assertIn("00989A", self.catalog)
        entry = self.catalog["00989A"]
        self.assertEqual(entry["issuer"], "jpm")
        self.assertIn("00989A_TW00000989A5.xlsx", entry["xlsx_url"])
        self.assertNotEqual(entry["xlsx_url"], self.catalog["00401A"]["xlsx_url"])

    def test_00983A_ctbc_html_entry(self) -> None:
        """00983A 應有 issuer='ctbc_html' 且 fund_code='00983A'。"""
        self.assertIn("00983A", self.catalog)
        entry = self.catalog["00983A"]
        self.assertEqual(entry["issuer"], "ctbc_html")
        self.assertEqual(entry["fund_code"], "00983A")


# ── _fetch_jpm() tests ─────────────────────────────────────────────────────────


class TestFetchJpm(unittest.TestCase):
    """Tasks 2.1: Unit tests for _fetch_jpm()."""

    def _fetch_jpm(self, xlsx_bytes: bytes) -> list[dict]:
        from ETF.scrapers.official_api_scraper import _fetch_jpm

        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.read.return_value = xlsx_bytes
            mock_resp.__enter__ = lambda s: s
            mock_resp.__exit__ = MagicMock(return_value=False)
            mock_urlopen.return_value = mock_resp
            return _fetch_jpm("https://am.jpmorgan.com/fake.xlsx")

    def test_parses_detail_rows(self) -> None:
        """D 行應解析成 code/name/shares/weight_pct 字典。"""
        xlsx = _make_jpm_xlsx(total_market_value=1_000_000.0)
        result = self._fetch_jpm(xlsx)
        self.assertEqual(len(result), 2)
        codes = [r["code"] for r in result]
        self.assertIn("2330", codes)
        self.assertIn("2454", codes)

    def test_weight_calculation(self) -> None:
        """weight_pct = Market Value Base / Estimated Total Market Value * 100。"""
        xlsx = _make_jpm_xlsx(total_market_value=1_000_000.0)
        result = self._fetch_jpm(xlsx)
        r2330 = next(r for r in result if r["code"] == "2330")
        self.assertAlmostEqual(r2330["weight_pct"], 10.0, places=4)

    def test_total_row_excluded(self) -> None:
        """Record Type != 'D' の行（Tなど）は除外される。"""
        xlsx = _make_jpm_xlsx()
        result = self._fetch_jpm(xlsx)
        codes = [r["code"] for r in result]
        self.assertNotIn("TOTAL", codes)

    def test_shares_as_int(self) -> None:
        """shares は int 型であること。"""
        xlsx = _make_jpm_xlsx()
        result = self._fetch_jpm(xlsx)
        r = next(r for r in result if r["code"] == "2330")
        self.assertIsInstance(r["shares"], int)
        self.assertEqual(r["shares"], 10_000)

    def test_returns_empty_on_http_error(self) -> None:
        """HTTP エラー時は空リストを返し raise しない。"""
        import urllib.error
        from ETF.scrapers.official_api_scraper import _fetch_jpm

        with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("timeout")):
            result = _fetch_jpm("https://am.jpmorgan.com/fake.xlsx")
        self.assertEqual(result, [])


# ── _fetch_cathay() tests ──────────────────────────────────────────────────────


class TestFetchCathay(unittest.TestCase):
    """Tasks 3.1: Unit tests for _fetch_cathay()."""

    def _run(self, json_bytes: bytes) -> list[dict]:
        from ETF.scrapers.official_api_scraper import _fetch_cathay

        with patch("ETF.scrapers.official_api_scraper._get", return_value=json_bytes):
            return _fetch_cathay("EA")

    def test_parses_stock_weights(self) -> None:
        """stockWeights 陣列解析成 code/name/shares/weight_pct。"""
        result = self._run(_make_cathay_json())
        self.assertEqual(len(result), 2)
        codes = [r["code"] for r in result]
        self.assertIn("2330", codes)

    def test_shares_always_zero(self) -> None:
        """國泰官方不揭露股數，shares 必須為 0。"""
        result = self._run(_make_cathay_json())
        for r in result:
            self.assertEqual(r["shares"], 0)

    def test_weight_pct_mapped(self) -> None:
        """weights 欄位正確對應 weight_pct。"""
        result = self._run(_make_cathay_json())
        r = next(r for r in result if r["code"] == "2330")
        self.assertAlmostEqual(r["weight_pct"], 9.78)

    def test_empty_stock_weights_returns_empty_list(self) -> None:
        """stockWeights 為空時回傳空 list，不 raise。"""
        empty_json = _make_cathay_json(stock_weights=[])
        result = self._run(empty_json)
        self.assertEqual(result, [])

    def test_fund_code_used_in_url(self) -> None:
        """fund_code 參數作為 GET URL 查詢參數。"""
        from ETF.scrapers.official_api_scraper import _fetch_cathay

        captured_urls: list[str] = []

        def fake_get(url: str, **kwargs: object) -> bytes:
            captured_urls.append(url)
            return _make_cathay_json()

        with patch("ETF.scrapers.official_api_scraper._get", side_effect=fake_get):
            _fetch_cathay("EB")

        self.assertTrue(any("fundCode=EB" in u for u in captured_urls))


# ── _fetch_ctbc_html() tests ───────────────────────────────────────────────────


class TestFetchCtbcHtml(unittest.TestCase):
    """Tasks 4.1: Unit tests for _fetch_ctbc_html()."""

    def _run(self, html_bytes: bytes, etf_code: str = "00983A") -> list[dict]:
        from ETF.scrapers.official_api_scraper import _fetch_ctbc_html

        with patch("ETF.scrapers.official_api_scraper._get", return_value=html_bytes):
            return _fetch_ctbc_html(etf_code)

    def test_parses_holdings_table(self) -> None:
        """4 欄 <tr> 行を正しく解析する。"""
        result = self._run(_make_ctbc_html())
        self.assertGreater(len(result), 0)
        codes = [r["code"] for r in result]
        self.assertIn("2330", codes)

    def test_filters_invalid_codes(self) -> None:
        """非法代號（中文/亂碼，例：'非4位'）は除外；台股4碼與美股代號均保留。"""
        result = self._run(_make_ctbc_html())
        codes = [r["code"] for r in result]
        # '非4位' is Chinese text — should be filtered out
        self.assertNotIn("非4位", codes)
        # Valid Taiwan codes (4 digits) are kept
        self.assertIn("2330", codes)

    def test_shares_parsed(self) -> None:
        """shares 欄位（含逗號）を int に変換。"""
        result = self._run(_make_ctbc_html())
        r = next(r for r in result if r["code"] == "2330")
        self.assertEqual(r["shares"], 10_000)

    def test_weight_pct_parsed(self) -> None:
        """weight_pct 欄位が正しく float に変換される。"""
        result = self._run(_make_ctbc_html())
        r = next(r for r in result if r["code"] == "2330")
        self.assertAlmostEqual(r["weight_pct"], 9.78)

    def test_ssl_disabled(self) -> None:
        """_get() が verify_ssl=False で呼ばれる。"""
        from ETF.scrapers.official_api_scraper import _fetch_ctbc_html

        captured: list[dict] = []

        def fake_get(url: str, **kwargs: object) -> bytes:
            captured.append({"url": url, "verify_ssl": kwargs.get("verify_ssl")})
            return _make_ctbc_html()

        with patch("ETF.scrapers.official_api_scraper._get", side_effect=fake_get):
            _fetch_ctbc_html("00983A")

        self.assertTrue(any(c["verify_ssl"] is False for c in captured))

    def test_etf_code_in_url(self) -> None:
        """ETF_ID が URL に含まれる。"""
        from ETF.scrapers.official_api_scraper import _fetch_ctbc_html

        captured_urls: list[str] = []

        def fake_get(url: str, **kwargs: object) -> bytes:
            captured_urls.append(url)
            return _make_ctbc_html()

        with patch("ETF.scrapers.official_api_scraper._get", side_effect=fake_get):
            _fetch_ctbc_html("00983A")

        self.assertTrue(any("ETF_ID=00983A" in u for u in captured_urls))


# ── dispatch routing tests ─────────────────────────────────────────────────────


class TestDispatchRouting(unittest.TestCase):
    """Tasks 2.2, 3.2, 4.2: Verify _dispatch() routes correctly."""

    def test_dispatch_jpm_calls_fetch_jpm(self) -> None:
        """issuer='jpm' → _fetch_jpm() が呼ばれる。"""
        from ETF.scrapers import official_api_scraper

        with patch.object(official_api_scraper, "_fetch_jpm", return_value=[]) as mock_fn:
            official_api_scraper._dispatch(
                "jpm", "00401A", None,
                {"issuer": "jpm", "xlsx_url": "https://am.jpmorgan.com/fake.xlsx"}
            )
        mock_fn.assert_called_once()

    def test_dispatch_cathay_calls_fetch_cathay(self) -> None:
        """issuer='cathay' → _fetch_cathay() が呼ばれる。"""
        from ETF.scrapers import official_api_scraper

        with patch.object(official_api_scraper, "_fetch_cathay", return_value=[]) as mock_fn:
            official_api_scraper._dispatch("cathay", "EA", None, {"issuer": "cathay", "fund_code": "EA"})
        mock_fn.assert_called_once_with("EA")

    def test_dispatch_ctbc_html_calls_fetch_ctbc_html(self) -> None:
        """issuer='ctbc_html' → _fetch_ctbc_html() が呼ばれる（_fetch_ctbc() ではない）。"""
        from ETF.scrapers import official_api_scraper

        with patch.object(official_api_scraper, "_fetch_ctbc_html", return_value=[]) as mock_fn, \
             patch.object(official_api_scraper, "_fetch_ctbc", return_value=[]) as mock_old:
            official_api_scraper._dispatch(
                "ctbc_html", "00983A", None,
                {"issuer": "ctbc_html", "fund_code": "00983A"}
            )
        mock_fn.assert_called_once_with("00983A")
        mock_old.assert_not_called()

    def test_dispatch_ctbc_unchanged(self) -> None:
        """issuer='ctbc' は引き続き _fetch_ctbc() が呼ばれる（00995A 維持）。"""
        from ETF.scrapers import official_api_scraper

        with patch.object(official_api_scraper, "_fetch_ctbc", return_value=[]) as mock_fn:
            official_api_scraper._dispatch("ctbc", "E0036", None, {})
        mock_fn.assert_called_once()


if __name__ == "__main__":
    unittest.main()
