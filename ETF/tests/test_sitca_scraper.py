"""
測試 ETF/scrapers/sitca_scraper.py。

parse_holdings() 測試讀取離線 fixture HTML（不打網路）。
非最新期 ValueError 測試 mock _get_initial，避免打網路。
"""

from __future__ import annotations

import pathlib
from unittest.mock import patch

import pytest

from ETF.scrapers import sitca_scraper as sc

FIXTURE_DIR = pathlib.Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def monthly_html() -> str:
    return (FIXTURE_DIR / "sitca_in2629_sample.html").read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def quarterly_html() -> str:
    return (FIXTURE_DIR / "sitca_in2630_sample.html").read_text(encoding="utf-8")


class TestParseHoldingsMonthly:
    def test_returns_non_empty(self, monthly_html: str) -> None:
        rows = sc.parse_holdings(monthly_html, has_rank=True)
        assert len(rows) > 0

    def test_fields_are_complete(self, monthly_html: str) -> None:
        rows = sc.parse_holdings(monthly_html, has_rank=True)
        for row in rows[:20]:
            assert row["fund_name_raw"]
            assert row["stock_code"]
            assert row["stock_name"]
            assert isinstance(row["amount"], int)
            assert isinstance(row["pct"], float)
            assert row["target_type"]

    def test_rank_is_positive_int(self, monthly_html: str) -> None:
        rows = sc.parse_holdings(monthly_html, has_rank=True)
        assert all(isinstance(r["rank"], int) and r["rank"] >= 1 for r in rows)

    def test_dtsubtotal_rows_skipped(self, monthly_html: str) -> None:
        # DTsubtotal 出現在原始 HTML 中，但解析結果不應包含合計列
        # （合計列沒有 stock_code，若混入會破壞欄位型別假設）
        assert "DTsubtotal" in monthly_html
        rows = sc.parse_holdings(monthly_html, has_rank=True)
        assert all(r["stock_code"] for r in rows)


class TestParseHoldingsQuarterly:
    def test_returns_non_empty(self, quarterly_html: str) -> None:
        rows = sc.parse_holdings(quarterly_html, has_rank=False)
        assert len(rows) > 0

    def test_rank_is_none(self, quarterly_html: str) -> None:
        rows = sc.parse_holdings(quarterly_html, has_rank=False)
        assert all(r["rank"] is None for r in rows)

    def test_fields_are_complete(self, quarterly_html: str) -> None:
        rows = sc.parse_holdings(quarterly_html, has_rank=False)
        for row in rows[:20]:
            assert row["fund_name_raw"]
            assert row["stock_code"]
            assert row["stock_name"]
            assert isinstance(row["amount"], int)
            assert isinstance(row["pct"], float)
            assert row["target_type"]


class TestNonLatestPeriodRejected:
    _INITIAL_HTML = """
    <html><body><form>
    <input type="hidden" name="__VIEWSTATE" value="vs" />
    <input type="hidden" name="__VIEWSTATEGENERATOR" value="vg" />
    <input type="hidden" name="__EVENTVALIDATION" value="ev" />
    <select name="ctl00$ContentPlaceHolder1$ddlQ_YM">
      <option value="202605">114年05月</option>
      <option value="202604">114年04月</option>
      <option value="202603">114年03月</option>
    </select>
    </form></body></html>
    """

    def test_fetch_monthly_raises_on_stale_period(self) -> None:
        with patch.object(sc, "_get_initial", return_value=self._INITIAL_HTML):
            with pytest.raises(ValueError, match="202604"):
                sc.fetch_monthly("202604", comid="A0009")

    def test_fetch_quarterly_raises_on_stale_period(self) -> None:
        with patch.object(sc, "_get_initial", return_value=self._INITIAL_HTML):
            with pytest.raises(ValueError, match="202603"):
                sc.fetch_quarterly("202603", comid="A0009")

    def test_error_message_includes_latest_period(self) -> None:
        with patch.object(sc, "_get_initial", return_value=self._INITIAL_HTML):
            with pytest.raises(ValueError, match="202605"):
                sc.fetch_monthly("202604", comid="A0009")

    def test_latest_period_does_not_raise_before_post(self) -> None:
        # period == latest 時不應在 _latest_period 檢查階段就出錯；
        # 這裡故意讓後續 _post_query 失敗以驗證檢查點確實通過。
        with patch.object(sc, "_get_initial", return_value=self._INITIAL_HTML):
            with patch.object(sc, "_extract_aspnet_state", return_value={}):
                with patch.object(sc, "_post_query", return_value="<html></html>"):
                    with patch("time.sleep"):
                        rows = sc.fetch_monthly("202605", comid="A0009")
        assert rows == []


def test_latest_period_extracts_max_value() -> None:
    html_snippet = """
    <select name="ctl00$ContentPlaceHolder1$ddlQ_YM">
      <option value="202603">114年03月</option>
      <option value="202605">114年05月</option>
      <option value="202604">114年04月</option>
    </select>
    """
    assert sc._latest_period(html_snippet) == "202605"


def test_latest_period_raises_when_no_options() -> None:
    with pytest.raises(ValueError):
        sc._latest_period("<html><body>no select here</body></html>")
