"""mops_fund_scraper 的離線 parser 測試（讀 fixture，不打網路）。"""

from pathlib import Path
from unittest.mock import patch

import pytest

from ETF.config.fund_manager_map import get_seed_mapping
from ETF.scrapers.mops_fund_scraper import (
    _ym_to_roc,
    fetch_monthly,
    parse_monthly_html,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parent / "fixtures" / "mops_t78sb39_q3_sample.html"
)


@pytest.fixture
def sample_html() -> str:
    """讀取實際爬取存下的 202604 MOPS 回應 fixture。"""
    return FIXTURE_PATH.read_text(encoding="utf-8")


@pytest.fixture
def mapping() -> dict[str, list[str]]:
    """回傳 seed mapping fixture。"""
    return get_seed_mapping()


def test_parse_monthly_html_returns_nonempty(sample_html: str) -> None:
    """解析 fixture 應回傳非空的基金清單。"""
    parsed = parse_monthly_html(sample_html)
    assert len(parsed) > 0


def test_parse_monthly_html_top5_fields_complete(sample_html: str) -> None:
    """每檔基金 top5 至多 5 筆，且每筆欄位齊全。"""
    parsed = parse_monthly_html(sample_html)
    for entry in parsed:
        assert len(entry["top5"]) <= 5
        assert len(entry["top5"]) > 0
        for holding in entry["top5"]:
            assert isinstance(holding["rank"], int)
            assert holding["stock_code"]
            assert holding["stock_name"]
            assert isinstance(holding["pct"], float)


def test_parse_monthly_html_skips_total_row(sample_html: str) -> None:
    """「合計」列應被跳過，不會出現在 top5 中。"""
    parsed = parse_monthly_html(sample_html)
    for entry in parsed:
        for holding in entry["top5"]:
            assert holding["stock_name"] != "合計"
            assert holding["stock_code"] != "合計"


def test_fetch_monthly_normalizes_known_fund(
    sample_html: str, mapping: dict[str, list[str]]
) -> None:
    """已知基金（統一台股增長）應正規化成功並歸入 funds。"""
    with patch(
        "ETF.scrapers.mops_fund_scraper._fetch_raw_html", return_value=sample_html
    ):
        result = fetch_monthly("202604", mapping=mapping)

    assert result["ym"] == "202604"
    fund_shorts = {f["fund_short"] for f in result["funds"]}
    assert "統一台股增長" in fund_shorts


def test_fetch_monthly_unmatched_funds_not_dropped(
    sample_html: str, mapping: dict[str, list[str]]
) -> None:
    """whitelist 外的基金（如第一金台股趨勢優選）應收進 unmatched，不丟棄不報錯。"""
    with patch(
        "ETF.scrapers.mops_fund_scraper._fetch_raw_html", return_value=sample_html
    ):
        result = fetch_monthly("202604", mapping=mapping)

    assert len(result["unmatched"]) > 0
    unmatched_names = {u["fund_name_raw"] for u in result["unmatched"]}
    assert any("第一金" in name for name in unmatched_names)
    for u in result["unmatched"]:
        assert u["comid"]


def test_fetch_monthly_invalid_ym_raises_value_error() -> None:
    """ym 格式錯誤（非 YYYYMM）應 raise ValueError。"""
    with pytest.raises(ValueError):
        fetch_monthly("2026-04")


def test_ym_to_roc_converts_correctly() -> None:
    """西元年月轉民國年月轉換正確。"""
    assert _ym_to_roc("202604") == ("115", "04")
