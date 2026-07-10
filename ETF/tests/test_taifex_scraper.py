"""taifex_scraper 單元測試。

fixture 驅動、monkeypatch 攔截 HTTP，不打真網路。

fixtures：
  - taifex_fut_contracts_sample.html：2026-07-08 臺股期貨（TXF）實抓 HTML 關鍵區段
  - taifex_daily_mtx_sample.csv：2026-07-08 MTX 每日行情實抓 CSV（已轉 UTF-8 存檔，
    測試時 encode 回 big5 模擬真實回應 bytes）
"""

import pathlib
from typing import Any

import pytest

from ETF.scrapers import taifex_scraper

FIXTURES_DIR = pathlib.Path(__file__).parent / "fixtures"

FUT_CONTRACTS_HTML = (FIXTURES_DIR / "taifex_fut_contracts_sample.html").read_text(
    encoding="utf-8"
)
DAILY_MTX_CSV = (FIXTURES_DIR / "taifex_daily_mtx_sample.csv").read_text(
    encoding="utf-8"
)

NO_DATA_HTML = "<html><body><div>查無資料</div></body></html>"


class FakeResponse:
    """最小 requests.Response 替身。"""

    def __init__(self, text: str = "", content: bytes = b"", status_code: int = 200):
        self.text = text
        self.content = content
        self.status_code = status_code
        self.ok = 200 <= status_code < 300

    def raise_for_status(self) -> None:
        if not self.ok:
            raise RuntimeError(f"HTTP {self.status_code}")


def _patch_post(monkeypatch: pytest.MonkeyPatch, handler: Any) -> list[dict[str, Any]]:
    """攔截 taifex_scraper.requests.post，回傳 handler 產生的 FakeResponse。

    回傳 calls 清單（每次呼叫的 url + data），供測試檢查 request body。
    """
    calls: list[dict[str, Any]] = []

    def fake_post(url: str, **kwargs: Any) -> FakeResponse:
        calls.append({"url": url, "data": kwargs.get("data") or {}})
        return handler(url, kwargs.get("data") or {})

    monkeypatch.setattr(taifex_scraper.requests, "post", fake_post)
    return calls


# ── fetch_futures_positions ──────────────────────────────────────────────────


def test_positions_parses_three_institutions(monkeypatch: pytest.MonkeyPatch) -> None:
    """HTML 解析出 3 法人列，數值正確（含千分位逗號與負值清洗）。"""
    _patch_post(monkeypatch, lambda url, data: FakeResponse(text=FUT_CONTRACTS_HTML))

    rows = taifex_scraper.fetch_futures_positions("2026-07-08")

    assert len(rows) == 9  # 3 契約 × 3 法人
    tx = {r["institution"]: r for r in rows if r["contract"] == "TX"}
    assert set(tx) == {"dealer", "trust", "foreign"}
    # 2026-07-08 臺股期貨實際數值（未平倉多方/空方/淨口數 = cells 7/9/11）
    assert tx["dealer"] == {
        "contract": "TX",
        "institution": "dealer",
        "long_oi": 8047,
        "short_oi": 4736,
        "net_oi": 3311,
    }
    assert tx["trust"]["long_oi"] == 76013
    assert tx["trust"]["net_oi"] == 69987
    assert tx["foreign"]["short_oi"] == 86900
    assert tx["foreign"]["net_oi"] == -81268  # 負值清洗


def test_positions_contract_normalization_and_body(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST body：queryDate 轉 YYYY/MM/DD；大台送 TXF、輸出正規化為 TX。"""
    calls = _patch_post(
        monkeypatch, lambda url, data: FakeResponse(text=FUT_CONTRACTS_HTML)
    )

    rows = taifex_scraper.fetch_futures_positions("2026-07-08")

    sent_ids = [c["data"]["commodityId"] for c in calls]
    assert sent_ids == ["TXF", "MXF", "TMF"]
    for c in calls:
        assert c["data"]["queryDate"] == "2026/07/08"
        assert c["data"]["queryType"] == "1"
        assert c["data"]["doQuery"] == "1"
    assert {r["contract"] for r in rows} == {"TX", "MXF", "TMF"}


def test_positions_no_data_returns_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """來源無當日資料（HTML 無法 match）→ 回傳 []，不 raise。"""
    _patch_post(monkeypatch, lambda url, data: FakeResponse(text=NO_DATA_HTML))

    assert taifex_scraper.fetch_futures_positions("2026-07-06") == []


def test_positions_partial_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """單一契約失敗 → 回傳其餘已成功的部分。"""

    def handler(url: str, data: dict[str, Any]) -> FakeResponse:
        if data["commodityId"] == "TXF":
            return FakeResponse(text=FUT_CONTRACTS_HTML)
        return FakeResponse(text=NO_DATA_HTML)

    _patch_post(monkeypatch, handler)

    rows = taifex_scraper.fetch_futures_positions("2026-07-08")

    assert len(rows) == 3
    assert {r["contract"] for r in rows} == {"TX"}


def test_positions_request_exception_returns_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """HTTP 例外 → 回傳 []，不 raise。"""

    def fake_post(url: str, **kwargs: Any) -> FakeResponse:
        raise ConnectionError("boom")

    monkeypatch.setattr(taifex_scraper.requests, "post", fake_post)

    assert taifex_scraper.fetch_futures_positions("2026-07-08") == []


# ── fetch_market_oi ──────────────────────────────────────────────────────────


def test_market_oi_sums_all_expiry_months(monkeypatch: pytest.MonkeyPatch) -> None:
    """CSV 加總正確：當日所有到期月份（週別）一般時段 OI 加總。"""
    _patch_post(
        monkeypatch,
        lambda url, data: FakeResponse(content=DAILY_MTX_CSV.encode("big5")),
    )

    result = taifex_scraper.fetch_market_oi("2026-07-08")

    # 2026-07-08 MTX 一般時段各月份 OI：
    # 144 + 32419 + 1 + 5896 + 2734 + 790 + 413 + 88 = 42485
    assert result["MXF"] == 42485
    assert set(result) == {"MXF", "TMF"}


def test_market_oi_request_body(monkeypatch: pytest.MonkeyPatch) -> None:
    """POST body：MXF 映射為行情代碼 MTX、TMF 維持 TMF，日期轉 YYYY/MM/DD。"""
    calls = _patch_post(
        monkeypatch,
        lambda url, data: FakeResponse(content=DAILY_MTX_CSV.encode("big5")),
    )

    taifex_scraper.fetch_market_oi("2026-07-08")

    sent = [c["data"]["commodity_id"] for c in calls]
    assert sent == ["MTX", "TMF"]
    for c in calls:
        assert c["data"]["queryStartDate"] == "2026/07/08"
        assert c["data"]["queryEndDate"] == "2026/07/08"
        assert c["data"]["down_type"] == "1"


def test_market_oi_general_session_only(monkeypatch: pytest.MonkeyPatch) -> None:
    """只取「一般」時段、只取查詢日的列。"""
    csv_text = (
        "交易日期,契約,到期月份(週別),開盤價,最高價,最低價,收盤價,漲跌價,漲跌%,"
        "成交量,結算價,未沖銷契約數,最後最佳買價,最後最佳賣價,歷史最高價,歷史最低價,"
        "是否因訊息面暫停交易,交易時段,價差對單式委託成交量\n"
        "2026/07/08,MTX,202607,45600,45962,45239,45546,-149,-0.33%,100,45563,1000,"
        "45549,45563,49239,36980,,一般,,\n"
        "2026/07/08,MTX,202607,45988,46000,44896,45217,-478,-1.05%,100,-,500,"
        "45218,45229,49239,36980,,盤後,,\n"
        "2026/07/07,MTX,202607,45600,45962,45239,45546,-149,-0.33%,100,45563,700,"
        "45549,45563,49239,36980,,一般,,\n"
    )
    _patch_post(
        monkeypatch, lambda url, data: FakeResponse(content=csv_text.encode("big5"))
    )

    result = taifex_scraper.fetch_market_oi("2026-07-08")

    # 只計 2026/07/08 的一般時段（1000）；盤後 500 與 07/07 的 700 排除
    assert result["MXF"] == 1000
    assert result["TMF"] == 1000


def test_market_oi_no_data_returns_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """無當日資料（CSV 空或無匹配列）→ 回傳空 dict，不 raise。"""
    _patch_post(monkeypatch, lambda url, data: FakeResponse(content=b""))

    assert taifex_scraper.fetch_market_oi("2026-07-06") == {}


def test_market_oi_exception_returns_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """HTTP 例外 → 回傳空 dict，不 raise。"""

    def fake_post(url: str, **kwargs: Any) -> FakeResponse:
        raise ConnectionError("boom")

    monkeypatch.setattr(taifex_scraper.requests, "post", fake_post)

    assert taifex_scraper.fetch_market_oi("2026-07-08") == {}
