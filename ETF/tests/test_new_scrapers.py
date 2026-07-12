"""Unit tests for new scrapers: JPM XLSX, Cathay REST API, CTBC HTML.

Tests follow TDD Red-Green-Refactor. All HTTP calls are mocked.
"""

from __future__ import annotations

import io
import json
import unittest
from unittest.mock import MagicMock, patch


# ── Helpers ────────────────────────────────────────────────────────────────────


def _make_jpm_xlsx(total_market_value: float = 1_000_000.0) -> bytes:
    """Build a minimal JPM-style XLSX in memory with two-section structure."""
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active

    # Section 1: Summary header + one "S" row
    ws.append(
        ["Record Type", "Fund Ticker", "Fund Name", "Estimated Total Market Value"]
    )
    ws.append(["S", "00401A TW", "JPM Taiwan ETF", total_market_value])
    ws.append([])  # spacer

    # Section 2: Detail header + "D" rows
    ws.append(
        [
            "Record Type",
            "Constituent Ticker",
            "Constituent Description",
            "Shares or PAR Amount",
            "Market Value Base",
        ]
    )
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


def _make_ctbc_auth_json() -> bytes:
    """Build a CTBC AuthToken JSON response."""
    return json.dumps({"ResultCode": 0, "Data": {"token": "fake-token"}}).encode(
        "utf-8"
    )


def _make_ctbc_rest_json(
    result_code: int = 0,
    with_stock_section: bool = True,
    with_fund_assets: bool = True,
) -> bytes:
    """Build a CTBC ETFHoldingWeight JSON response（結構取自 2026-07-12 實測）。

    ResultCode != 0 時 Data 為 None（空 StartDate 的實測行為）。
    """
    if result_code != 0:
        return json.dumps({"ResultCode": result_code, "Data": None}).encode("utf-8")

    detail: list[dict] = []
    if with_stock_section:
        detail.append(
            {
                "Code": "STOCK",
                "Data": [
                    {
                        "code_": "2330",
                        "name_": "台積電",
                        "weights_": "9.78",
                        "qty_": "1,234,000",
                    },
                    {
                        "code_": "2454",
                        "name_": "聯發科",
                        "weights_": "6.09",
                        "qty_": "567,000",
                    },
                ],
            }
        )
    detail.append(
        {
            "Code": "CASH",
            "Data": [{"code_": "", "name_": "現金", "weights_": "1.00", "qty_": ""}],
        }
    )
    data: dict = {"FundAssetsDetail": detail}
    if with_fund_assets:
        data["FundAssets"] = [
            {
                "基金淨資產": "1,000,000,000",
                "基金每單位淨值": "10.00",
                "基金在外流通單位數": "100,000,000",
                "NAV_DT": "2026-07-09T00:00:00",
            }
        ]
    return json.dumps({"ResultCode": 0, "Data": data}).encode("utf-8")


def _make_cathay_assets_json(success: bool = True) -> bytes:
    """Build a Cathay GetETFAssets JSON response（欄位取自 2026-07-12 實測）。

    fundNav 是基金總淨資產（aum）而非每單位淨值——命名陷阱。
    """
    return json.dumps(
        {
            "success": success,
            "result": {
                "fundNav": "25,748,701,845",
                "fundPerNav": "14.2",
                "fundOutstandingShares": "1,813,288,863",
                "preDate": "2026/07/10",
            },
        }
    ).encode("utf-8")


def _make_ctbc_html(
    holdings: list[tuple[str, str, str, str]] | None = None,
    label_aum01: str = "2026/04/21",
) -> bytes:
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
            holdings, _assets = _fetch_jpm("https://am.jpmorgan.com/fake.xlsx")
            return holdings

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

        with patch(
            "urllib.request.urlopen", side_effect=urllib.error.URLError("timeout")
        ):
            result = _fetch_jpm("https://am.jpmorgan.com/fake.xlsx")
        self.assertEqual(result, ([], None))


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


# ── _fetch_ctbc() REST tests (fix-ctbc-rest-and-cathay-nav 行為 A/B) ──────────


class TestFetchCtbcRest(unittest.TestCase):
    """00995A REST 持股修復（StartDate、STOCK section 解析）＋同回應資產摘要。"""

    def _run(
        self, response: bytes, date_ymd: str | None = None
    ) -> tuple[tuple[list[dict], dict | None], list[dict]]:
        from ETF.scrapers.official_api_scraper import _fetch_ctbc

        captured: list[dict] = []

        def fake_post(url: str, payload: dict, **kwargs: object) -> bytes:
            captured.append({"url": url, "payload": payload})
            if "AuthToken" in url:
                return _make_ctbc_auth_json()
            return response

        with patch(
            "ETF.scrapers.official_api_scraper._post_json", side_effect=fake_post
        ):
            result = _fetch_ctbc("E0036", date_ymd)
        return result, captured

    def _holding_payload(self, captured: list[dict]) -> dict:
        return next(c["payload"] for c in captured if "ETFHoldingWeight" in c["url"])

    def test_token_carried_in_query_string(self) -> None:
        """token 必須同時帶於兩段請求的 URL query string——僅放 body 會被 API
        回 ResultCode 1「Token 無效或過期」（2026-07-12 實測）。"""
        _, captured = self._run(_make_ctbc_rest_json())
        auth_url = next(c["url"] for c in captured if "AuthToken" in c["url"])
        holding_url = next(c["url"] for c in captured if "ETFHoldingWeight" in c["url"])
        self.assertIn("token=", auth_url)
        self.assertIn("token=", holding_url)

    def test_startdate_is_dash_date_when_no_date_given(self) -> None:
        """未指定日期時 StartDate 為最近交易日 dash 格式，永不為空字串。"""
        _, captured = self._run(_make_ctbc_rest_json())
        payload = self._holding_payload(captured)
        self.assertRegex(payload["StartDate"], r"^\d{4}-\d{2}-\d{2}$")

    def test_startdate_uses_caller_date(self) -> None:
        """呼叫端傳 date_ymd 時，StartDate 為該日期的 dash 格式。"""
        _, captured = self._run(_make_ctbc_rest_json(), date_ymd="20260709")
        payload = self._holding_payload(captured)
        self.assertEqual(payload["StartDate"], "2026-07-09")

    def test_parses_stock_section_holdings(self) -> None:
        """Code=='STOCK' section 的 Data 解析：code_/name_/weights_/qty_（去逗號）。"""
        (holdings, _assets), _ = self._run(_make_ctbc_rest_json())
        self.assertEqual(len(holdings), 2)
        r = next(h for h in holdings if h["code"] == "2330")
        self.assertEqual(r["name"], "台積電")
        self.assertEqual(r["shares"], 1_234_000)
        self.assertAlmostEqual(r["weight_pct"], 9.78)

    def test_result_code_1_returns_empty_no_raise(self) -> None:
        """ResultCode 1（空 StartDate 的實測行為）→ 空持股、無摘要、不拋例外。"""
        (holdings, assets), _ = self._run(_make_ctbc_rest_json(result_code=1))
        self.assertEqual(holdings, [])
        self.assertIsNone(assets)

    def test_missing_stock_section_returns_empty_holdings(self) -> None:
        """無 STOCK section 時回空持股，不拋例外。"""
        (holdings, _assets), _ = self._run(
            _make_ctbc_rest_json(with_stock_section=False)
        )
        self.assertEqual(holdings, [])

    def test_fund_assets_parsed_from_same_response(self) -> None:
        """FundAssets[0] 中文 key 對映 aum/nav/units，NAV_DT 截 T 前段。"""
        (_holdings, assets), _ = self._run(_make_ctbc_rest_json())
        assert assets is not None
        self.assertAlmostEqual(assets["aum"], 1_000_000_000.0)
        self.assertAlmostEqual(assets["nav"], 10.0)
        self.assertAlmostEqual(assets["units"], 100_000_000.0)
        self.assertEqual(assets["nav_date"], "2026-07-09")

    def test_missing_fund_assets_does_not_affect_holdings(self) -> None:
        """FundAssets 缺漏 → assets None，持股照常解析。"""
        (holdings, assets), _ = self._run(_make_ctbc_rest_json(with_fund_assets=False))
        self.assertEqual(len(holdings), 2)
        self.assertIsNone(assets)

    def test_fetch_holdings_00995A_attaches_fund_assets(self) -> None:
        """fetch_holdings('00995A') 的 DataFrame attrs['fund_assets'] 有摘要。"""
        from ETF.scrapers.official_api_scraper import fetch_holdings

        def fake_post(url: str, payload: dict, **kwargs: object) -> bytes:
            if "AuthToken" in url:
                return _make_ctbc_auth_json()
            return _make_ctbc_rest_json()

        with patch(
            "ETF.scrapers.official_api_scraper._post_json", side_effect=fake_post
        ):
            df = fetch_holdings("00995A")

        self.assertEqual(len(df), 2)
        assets = df.attrs["fund_assets"]
        self.assertAlmostEqual(assets["nav"], 10.0)
        self.assertEqual(assets["nav_date"], "2026-07-09")


# ── _fetch_cathay_assets() tests (fix-ctbc-rest-and-cathay-nav 行為 C) ────────


class TestFetchCathayAssets(unittest.TestCase):
    """00400A GetETFAssets 資產摘要：fundNav 命名陷阱與失敗隔離。"""

    def _run(self, json_bytes: bytes) -> dict | None:
        from ETF.scrapers.official_api_scraper import _fetch_cathay_assets

        with patch("ETF.scrapers.official_api_scraper._get", return_value=json_bytes):
            return _fetch_cathay_assets("EA")

    def test_fundnav_maps_to_aum_never_reverse(self) -> None:
        """fundNav（總淨資產）→ aum、fundPerNav → nav，方向不可顛倒。"""
        assets = self._run(_make_cathay_assets_json())
        assert assets is not None
        self.assertAlmostEqual(assets["aum"], 25_748_701_845.0)
        self.assertAlmostEqual(assets["nav"], 14.2)

    def test_units_and_nav_date_mapped(self) -> None:
        """fundOutstandingShares → units；preDate YYYY/MM/DD → YYYY-MM-DD。"""
        assets = self._run(_make_cathay_assets_json())
        assert assets is not None
        self.assertAlmostEqual(assets["units"], 1_813_288_863.0)
        self.assertEqual(assets["nav_date"], "2026-07-10")

    def test_success_false_returns_none(self) -> None:
        """success != true → 只 log 回 None。"""
        self.assertIsNone(self._run(_make_cathay_assets_json(success=False)))

    def test_http_error_returns_none(self) -> None:
        """HTTP 錯誤 → 只 log 回 None，不拋例外。"""
        from ETF.scrapers.official_api_scraper import _fetch_cathay_assets

        with patch(
            "ETF.scrapers.official_api_scraper._get", side_effect=OSError("boom")
        ):
            self.assertIsNone(_fetch_cathay_assets("EA"))

    def test_assets_failure_does_not_affect_holdings(self) -> None:
        """GetETFAssets 失敗、GetIndexStockWeights 成功 → 持股照常、無 fund_assets attr。"""
        from ETF.scrapers.official_api_scraper import fetch_holdings

        def fake_get(url: str, **kwargs: object) -> bytes:
            if "GetETFAssets" in url:
                raise OSError("boom")
            return _make_cathay_json()

        with patch("ETF.scrapers.official_api_scraper._get", side_effect=fake_get):
            df = fetch_holdings("00400A")

        self.assertEqual(len(df), 2)
        self.assertNotIn("fund_assets", df.attrs)

    def test_fetch_holdings_00400A_attaches_fund_assets(self) -> None:
        """兩端點都成功 → attrs['fund_assets'] 有值。"""
        from ETF.scrapers.official_api_scraper import fetch_holdings

        def fake_get(url: str, **kwargs: object) -> bytes:
            if "GetETFAssets" in url:
                return _make_cathay_assets_json()
            return _make_cathay_json()

        with patch("ETF.scrapers.official_api_scraper._get", side_effect=fake_get):
            df = fetch_holdings("00400A")

        self.assertEqual(len(df), 2)
        self.assertAlmostEqual(df.attrs["fund_assets"]["nav"], 14.2)


# ── _fetch_ctbc_html() tests ───────────────────────────────────────────────────


class TestFetchCtbcHtml(unittest.TestCase):
    """Tasks 4.1: Unit tests for _fetch_ctbc_html()."""

    def _run(self, html_bytes: bytes, etf_code: str = "00983A") -> list[dict]:
        from ETF.scrapers.official_api_scraper import _fetch_ctbc_html

        with patch("ETF.scrapers.official_api_scraper._get", return_value=html_bytes):
            holdings, _assets = _fetch_ctbc_html(etf_code)
            return holdings

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

        with patch.object(
            official_api_scraper, "_fetch_jpm", return_value=([], None)
        ) as mock_fn:
            official_api_scraper._dispatch(
                "jpm",
                "00401A",
                None,
                {"issuer": "jpm", "xlsx_url": "https://am.jpmorgan.com/fake.xlsx"},
            )
        mock_fn.assert_called_once()

    def test_dispatch_cathay_calls_fetch_cathay(self) -> None:
        """issuer='cathay' → _fetch_cathay() 與 _fetch_cathay_assets() 均被呼叫。"""
        from ETF.scrapers import official_api_scraper

        with (
            patch.object(
                official_api_scraper, "_fetch_cathay", return_value=[]
            ) as mock_fn,
            patch.object(
                official_api_scraper, "_fetch_cathay_assets", return_value=None
            ) as mock_assets,
        ):
            result = official_api_scraper._dispatch(
                "cathay", "EA", None, {"issuer": "cathay", "fund_code": "EA"}
            )
        mock_fn.assert_called_once_with("EA")
        mock_assets.assert_called_once_with("EA")
        self.assertEqual(result, ([], None))

    def test_dispatch_ctbc_html_calls_fetch_ctbc_html(self) -> None:
        """issuer='ctbc_html' → _fetch_ctbc_html() が呼ばれる（_fetch_ctbc() ではない）。"""
        from ETF.scrapers import official_api_scraper

        with (
            patch.object(
                official_api_scraper, "_fetch_ctbc_html", return_value=([], None)
            ) as mock_fn,
            patch.object(
                official_api_scraper, "_fetch_ctbc", return_value=[]
            ) as mock_old,
        ):
            official_api_scraper._dispatch(
                "ctbc_html",
                "00983A",
                None,
                {"issuer": "ctbc_html", "fund_code": "00983A"},
            )
        mock_fn.assert_called_once_with("00983A")
        mock_old.assert_not_called()

    def test_dispatch_ctbc_passes_date_ymd(self) -> None:
        """issuer='ctbc' → _fetch_ctbc(fid, date_ymd)，回傳 (holdings, fund_assets)。"""
        from ETF.scrapers import official_api_scraper

        with patch.object(
            official_api_scraper, "_fetch_ctbc", return_value=([], None)
        ) as mock_fn:
            result = official_api_scraper._dispatch("ctbc", "E0036", "20260709", {})
        mock_fn.assert_called_once_with("E0036", "20260709")
        self.assertEqual(result, ([], None))


if __name__ == "__main__":
    unittest.main()
