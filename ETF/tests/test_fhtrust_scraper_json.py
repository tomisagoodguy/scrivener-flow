"""
測試 FhTrustScraper._try_json_scrape() 的單元測試。

使用 unittest.mock.patch mock requests.Session.get，
涵蓋以下情境：
  - 成功萃取：回傳非空 DataFrame
  - 屬性缺失：回傳 (None, None)
  - HTTP 非 2xx：回傳 (None, None)
  - JSON 路徑失敗後 Excel fallback 被呼叫
"""

import html
import json
import pathlib
import unittest
from unittest.mock import MagicMock, patch

import pandas as pd

from ETF.scrapers.fhtrust_scraper import FhTrustScraper, INFO_URL


# ---------------------------------------------------------------------------
# 輔助函式：建構假的 HTML 頁面
# ---------------------------------------------------------------------------

def _make_html(holdings: list[dict] | None, extra_items: list[dict] | None = None) -> str:
    """
    建構含 div#DataAsset data-content 屬性的假 HTML。
    holdings 為 None 時，data-content 屬性不存在（模擬屬性缺失）。
    """
    if holdings is None:
        return "<html><body><div id='DataAsset'></div></body></html>"

    items = [
        {
            "AssetCode": "ST",
            "Details": [
                {
                    "DetailCode": d["code"],
                    "DetailName": d["name"],
                    "Share": float(d["shares"]),
                    "NavRate": float(d["weight"]),
                    "TranDate": d.get("tran_date", "2026-05-08T00:00:00"),
                }
                for d in holdings
            ],
        }
    ]
    if extra_items:
        items.extend(extra_items)

    json_str = json.dumps(items, ensure_ascii=False)
    escaped = html.escape(json_str, quote=True)
    return f'<html><body><div id="DataAsset" data-content="{escaped}"></div></body></html>'


def _make_mock_response(status_code: int, text: str) -> MagicMock:
    """建構 requests.Response mock。"""
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.ok = (200 <= status_code < 300)
    mock_resp.text = text
    return mock_resp


SAMPLE_HOLDINGS = [
    {"code": "2330", "name": "台積電", "shares": 11359000, "weight": 9.78},
    {"code": "2454", "name": "聯發科", "shares": 4463000, "weight": 6.09},
]


class TestFhTrustScraperJsonScrape(unittest.TestCase):
    """_try_json_scrape() 的單元測試。"""

    def setUp(self) -> None:
        self.scraper = FhTrustScraper(output_dir=pathlib.Path("/tmp"))

    # ------------------------------------------------------------------
    # 情境一：成功萃取（HTML 含有效 data-content）
    # ------------------------------------------------------------------

    @patch("ETF.scrapers.fhtrust_scraper.requests.Session")
    def test_successful_extraction(self, mock_session_cls: MagicMock) -> None:
        """成功萃取：HTML 含 div#DataAsset data-content → 回傳非空 DataFrame。"""
        html_body = _make_html(SAMPLE_HOLDINGS)
        mock_session = MagicMock()
        mock_session_cls.return_value = mock_session
        mock_session.get.return_value = _make_mock_response(200, html_body)

        df, date_str = self.scraper._try_json_scrape()

        self.assertIsNotNone(df)
        self.assertIsNotNone(date_str)
        self.assertIsInstance(df, pd.DataFrame)
        self.assertGreater(len(df), 0)
        # 欄位確認
        for col in ("stock_code", "stock_name", "shares", "weight"):
            self.assertIn(col, df.columns)
        # 資料日期格式確認
        self.assertEqual(date_str, "2026-05-08")
        # 第一筆資料確認
        self.assertEqual(df.iloc[0]["stock_code"], "2330")
        self.assertEqual(df.iloc[0]["stock_name"], "台積電")
        self.assertEqual(df.iloc[0]["shares"], 11359000)
        self.assertAlmostEqual(df.iloc[0]["weight"], 9.78)

    # ------------------------------------------------------------------
    # 情境二：屬性缺失（HTML 無 data-content 屬性）
    # ------------------------------------------------------------------

    @patch("ETF.scrapers.fhtrust_scraper.requests.Session")
    def test_missing_data_content_attribute(self, mock_session_cls: MagicMock) -> None:
        """屬性缺失：HTML 無 div#DataAsset data-content → 回傳 (None, None)，不 raise。"""
        html_body = "<html><body><div id='DataAsset'></div></body></html>"
        mock_session = MagicMock()
        mock_session_cls.return_value = mock_session
        mock_session.get.return_value = _make_mock_response(200, html_body)

        df, date_str = self.scraper._try_json_scrape()

        self.assertIsNone(df)
        self.assertIsNone(date_str)

    # ------------------------------------------------------------------
    # 情境三：HTTP 非 2xx（503）
    # ------------------------------------------------------------------

    @patch("ETF.scrapers.fhtrust_scraper.requests.Session")
    def test_non_200_http_response(self, mock_session_cls: MagicMock) -> None:
        """HTTP 非 2xx：mock 回 503 → 回傳 (None, None)，不 raise。"""
        mock_session = MagicMock()
        mock_session_cls.return_value = mock_session
        mock_session.get.return_value = _make_mock_response(503, "Service Unavailable")

        df, date_str = self.scraper._try_json_scrape()

        self.assertIsNone(df)
        self.assertIsNone(date_str)

    # ------------------------------------------------------------------
    # 情境三-b：HTTP 請求例外（連線失敗）
    # ------------------------------------------------------------------

    @patch("ETF.scrapers.fhtrust_scraper.requests.Session")
    def test_request_exception(self, mock_session_cls: MagicMock) -> None:
        """HTTP 請求例外 → 回傳 (None, None)，不 raise。"""
        import requests as req
        mock_session = MagicMock()
        mock_session_cls.return_value = mock_session
        mock_session.get.side_effect = req.exceptions.ConnectionError("timeout")

        df, date_str = self.scraper._try_json_scrape()

        self.assertIsNone(df)
        self.assertIsNone(date_str)

    # ------------------------------------------------------------------
    # 情境四：JSON parse 失敗
    # ------------------------------------------------------------------

    @patch("ETF.scrapers.fhtrust_scraper.requests.Session")
    def test_json_parse_failure(self, mock_session_cls: MagicMock) -> None:
        """data-content 內容非有效 JSON → 回傳 (None, None)，不 raise。"""
        html_body = '<html><body><div id="DataAsset" data-content="not-valid-json"></div></body></html>'
        mock_session = MagicMock()
        mock_session_cls.return_value = mock_session
        mock_session.get.return_value = _make_mock_response(200, html_body)

        df, date_str = self.scraper._try_json_scrape()

        self.assertIsNone(df)
        self.assertIsNone(date_str)

    # ------------------------------------------------------------------
    # 情境五：no-Playwright 確認（_try_json_scrape 不 import playwright）
    # ------------------------------------------------------------------

    def test_no_playwright_import(self) -> None:
        """_try_json_scrape 的源碼不得含 import playwright 或 sync_playwright 語句。"""
        import inspect
        source = inspect.getsource(FhTrustScraper._try_json_scrape)
        self.assertNotIn("import playwright", source.lower())
        self.assertNotIn("sync_playwright", source.lower())
        self.assertNotIn("from playwright", source.lower())


class TestFhTrustScraperFallback(unittest.TestCase):
    """run() 備援鏈整合測試：JSON 失敗後 Excel fallback 被呼叫。"""

    def setUp(self) -> None:
        self.scraper = FhTrustScraper(output_dir=pathlib.Path("/tmp"))

    @patch("ETF.scrapers.fhtrust_scraper.parse_holdings_xlsx")
    @patch("ETF.scrapers.fhtrust_scraper.download_file")
    @patch("ETF.scrapers.fhtrust_scraper.requests.Session")
    def test_json_fails_excel_fallback_called(
        self,
        mock_session_cls: MagicMock,
        mock_download_file: MagicMock,
        mock_parse_xlsx: MagicMock,
    ) -> None:
        """JSON 路徑失敗後，download_file（Excel fallback）被呼叫一次。"""
        # JSON 路徑：HTTP 503 → 失敗
        mock_session = MagicMock()
        mock_session_cls.return_value = mock_session
        mock_session.get.return_value = _make_mock_response(503, "")

        # Excel fallback：模擬成功
        mock_download_file.return_value = True
        sample_df = pd.DataFrame(
            {"stock_code": ["2330"], "stock_name": ["台積電"], "shares": [1000000], "weight": [10.0]}
        )
        mock_parse_xlsx.return_value = (sample_df, "2026-05-08")

        # mock 檔案操作（避免實際 rename 不存在的暫存檔）
        with patch("pathlib.Path.rename"), patch("pathlib.Path.exists", return_value=False):
            df, date_str = self.scraper.run()

        # Excel fallback 被呼叫一次
        mock_download_file.assert_called_once()
        self.assertIsNotNone(df)
        self.assertEqual(date_str, "2026-05-08")

    @patch("ETF.scrapers.fhtrust_scraper.download_file")
    @patch("ETF.scrapers.fhtrust_scraper.requests.Session")
    def test_both_paths_fail_returns_none(
        self,
        mock_session_cls: MagicMock,
        mock_download_file: MagicMock,
    ) -> None:
        """JSON 與 Excel 均失敗 → 回傳 (None, None)，不 raise。"""
        mock_session = MagicMock()
        mock_session_cls.return_value = mock_session
        mock_session.get.return_value = _make_mock_response(503, "")

        mock_download_file.return_value = False

        df, date_str = self.scraper.run()

        self.assertIsNone(df)
        self.assertIsNone(date_str)


class TestRegexBoundary(unittest.TestCase):
    """spec 中 Regex boundary cases 的 Example 表格驗證。"""

    def _match(self, fragment: str) -> str | None:
        """對單一 HTML 片段套用 _DATA_CONTENT_RE，回傳 capture group 或 None。"""
        from ETF.scrapers.fhtrust_scraper import _DATA_CONTENT_RE
        match = _DATA_CONTENT_RE.search(fragment)
        return match.group(1) if match else None

    def test_valid_data_content(self) -> None:
        """含 id=DataAsset 且有 data-content → 擷取屬性值。"""
        fragment = '<div id="DataAsset" data-content="[{&quot;code&quot;:&quot;2330&quot;}]">'
        result = self._match(fragment)
        self.assertEqual(result, "[{&quot;code&quot;:&quot;2330&quot;}]")

    def test_missing_data_content(self) -> None:
        """無 data-content 屬性 → 回傳 None。"""
        fragment = '<div id="DataAsset">'
        result = self._match(fragment)
        self.assertIsNone(result)

    def test_wrong_id(self) -> None:
        """錯誤 id (OtherAsset) → 不匹配，回傳 None。"""
        fragment = '<div id="OtherAsset" data-content="...">'
        result = self._match(fragment)
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
