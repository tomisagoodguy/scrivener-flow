"""Tests for ETF.scrapers.twse_chips_scraper（TDD，先寫測試）。

所有測試以 monkeypatch 攔截 `_get_json`，不打真網路。
Fixtures：ETF/tests/fixtures/twse_margin_sample.json、twse_t86_sample.json、
tpex_institutional_sample.json（均為 2026-07-09 實抓資料裁剪，結構未經竄改）。
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from ETF.scrapers import twse_chips_scraper as scraper

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> dict[str, Any]:
    with open(FIXTURES / name, encoding="utf-8") as f:
        return json.load(f)


# ── fetch_margin ──────────────────────────────────────────────────────────────


def test_fetch_margin_parses_balance_and_change(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = _load("twse_margin_sample.json")
    monkeypatch.setattr(scraper, "_get_json", lambda url: payload)

    result = scraper.fetch_margin("2026-07-09")

    assert result is not None
    assert result["data_date"] == "2026-07-09"
    # 融資金額(仟元)：前日餘額 613,815,722 → 今日餘額 619,648,244
    assert result["margin_balance"] == pytest.approx(619648244)
    assert result["margin_change"] == pytest.approx(619648244 - 613815722)
    # 融券(交易單位)：前日餘額 205,830 → 今日餘額 203,714
    assert result["short_balance"] == pytest.approx(203714)
    assert result["short_change"] == pytest.approx(203714 - 205830)


def test_fetch_margin_cleans_thousands_separator(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = _load("twse_margin_sample.json")
    monkeypatch.setattr(scraper, "_get_json", lambda url: payload)

    result = scraper.fetch_margin("2026-07-09")

    assert result is not None
    # 若逗號清洗失敗，float() 會 raise 或回傳 None，此處確認為正確數值型別
    assert isinstance(result["margin_balance"], float)
    assert isinstance(result["short_balance"], float)


def test_fetch_margin_returns_none_when_stat_not_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(scraper, "_get_json", lambda url: {"stat": "!非交易日", "date": ""})

    result = scraper.fetch_margin("2026-01-01")

    assert result is None


def test_fetch_margin_returns_none_when_http_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(scraper, "_get_json", lambda url: None)

    result = scraper.fetch_margin("2026-07-09")

    assert result is None


def test_fetch_margin_returns_none_when_rows_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "stat": "OK",
        "date": "20260709",
        "tables": [{"fields": ["項目", "買進", "賣出", "現金(券)償還", "前日餘額", "今日餘額"], "data": []}],
    }
    monkeypatch.setattr(scraper, "_get_json", lambda url: payload)

    result = scraper.fetch_margin("2026-07-09")

    assert result is None


# ── fetch_institutional：T86（上市）──────────────────────────────────────────


def test_fetch_institutional_parses_t86_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    t86_payload = _load("twse_t86_sample.json")

    def fake_get_json(url: str) -> dict[str, Any] | None:
        if "T86" in url:
            return t86_payload
        return {"tables": []}

    monkeypatch.setattr(scraper, "_get_json", fake_get_json)

    result = scraper.fetch_institutional("2026-07-09")

    by_code = {r["stock_code"]: r for r in result}
    assert "2330" in by_code
    row_2330 = by_code["2330"]
    assert row_2330["foreign_net"] == -12748541
    assert row_2330["trust_net"] == 43225
    assert row_2330["dealer_net"] == 89863

    # 非 4 碼代號（00403A ETF, 00664R 反向 ETF, 00685L 正2 ETF）必須被過濾
    assert "00403A" not in by_code
    assert "00664R" not in by_code
    assert "00685L" not in by_code


# ── fetch_institutional：TPEx（上櫃）──────────────────────────────────────────


def test_fetch_institutional_parses_tpex_fields_and_roc_date(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tpex_payload = _load("tpex_institutional_sample.json")
    requested_urls: list[str] = []

    def fake_get_json(url: str) -> dict[str, Any] | None:
        requested_urls.append(url)
        if "dailyTrade" in url:
            return tpex_payload
        return {"data": []}

    monkeypatch.setattr(scraper, "_get_json", fake_get_json)

    result = scraper.fetch_institutional("2026-07-09")

    # ROC 日期轉換：2026-07-09 → 115/07/09（URL encoded）
    tpex_urls = [u for u in requested_urls if "dailyTrade" in u]
    assert len(tpex_urls) == 1
    assert "115%2F07%2F09" in tpex_urls[0] or "115/07/09" in tpex_urls[0]

    by_code = {r["stock_code"]: r for r in result}
    # 1264 德麥：[10]=-7,009 [13]=0 [22]=-9,000
    assert "1264" in by_code
    assert by_code["1264"]["foreign_net"] == -7009
    assert by_code["1264"]["trust_net"] == 0
    assert by_code["1264"]["dealer_net"] == -9000

    # 006201（6 碼 ETF）與 00679B（債券 ETF）必須被過濾
    assert "006201" not in by_code
    assert "00679B" not in by_code


def test_fetch_institutional_single_source_failure_returns_other(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    t86_payload = _load("twse_t86_sample.json")

    def fake_get_json(url: str) -> dict[str, Any] | None:
        if "T86" in url:
            return t86_payload
        raise RuntimeError("TPEx 網路逾時")

    monkeypatch.setattr(scraper, "_get_json", fake_get_json)

    result = scraper.fetch_institutional("2026-07-09")

    by_code = {r["stock_code"]: r for r in result}
    assert "2330" in by_code  # 上市資料仍在
    # 沒有任何上櫃資料被誤混入（無法簡單斷言，但至少不應拋例外且有上市資料）


def test_fetch_institutional_both_sources_fail_returns_empty_list(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(scraper, "_get_json", lambda url: None)

    result = scraper.fetch_institutional("2026-07-09")

    assert result == []
