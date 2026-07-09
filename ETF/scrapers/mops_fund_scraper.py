"""
公開資訊觀測站（MOPS）國內成分主動式 ETF 每月持股前五大爬蟲

資料來源：https://mopsov.twse.com.tw/mops/web/t78sb39_q3（每月持股前五大個股）

用途：回補 SITCA 月報歷史期查詢的缺口。SITCA（`sitca_scraper.py`）已知
非最新期的 server-side filter 失效，只能查最新一期；MOPS 這支端點無此限制，
可查任意歷史月份，但只揭露 Top 5（SITCA 月報是 Top 10），資料較淺但能補歷史。

本模組只負責抓取與解析，不寫 DB。

參考實作：tw-active/tools/mopsetf.py（two-step handshake 與 table parser 已驗證可用）。
"""

from __future__ import annotations

import html as html_mod
import logging
import re
import time
from typing import Any

import requests
import urllib3

# MOPS 伺服器與 SITCA 同樣有憑證鏈缺 Subject Key Identifier 的問題，關閉驗證並靜音警告。
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

MOPS_BASE = "https://mopsov.twse.com.tw/mops/web"
UA = "Mozilla/5.0 (etf-pipeline-mops-fund-scraper; +scrivener-flow)"

_MAX_RETRIES = 2
_RETRY_BASE_DELAY = 2.0  # 秒，每次重試遞增（2s, 4s）
_INTER_REQUEST_SLEEP = 1.0  # 兩步協定之間的禮貌性 sleep（秒）

_YM_RE = re.compile(r"^20\d{4}$")

# ── HTML parsing regex（沿用 tw-active/tools/mopsetf.py 已驗證的寫法） ──────

_COMPANY_HEADER_RE = re.compile(
    r"民國\s*(\d+)\s*年\s*(\d+)\s*月.*?公司代號：(\S+?)&nbsp;.*?公司名稱：\s*([^<]+)",
    re.S,
)
_FUND_TABLE_RE = re.compile(r"<table\s+class='hasBorder'[^>]*>(.*?)</table>", re.S | re.I)
_ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S | re.I)
_CELL_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.S | re.I)
_ROWSPAN_RE = re.compile(r"rowspan=['\"]?(\d+)", re.I)
_TAG_RE = re.compile(r"<[^>]+>")


def _strip(s: str) -> str:
    """去除 HTML tag、<br> 轉空白、unescape entities。"""
    s = re.sub(r"<br\s*/?>", " ", s, flags=re.I)
    s = _TAG_RE.sub("", s)
    return html_mod.unescape(s).strip()


def _ym_to_roc(ym: str) -> tuple[str, str]:
    """把西元年月（YYYYMM）轉為民國年 + 月份字串。

    Args:
        ym: 西元年月，格式 YYYYMM（例如 "202604"）。

    Returns:
        tuple[str, str]: (民國年字串, 月字串)，例如 ("115", "04")。

    Raises:
        ValueError: `ym` 不符合 `20\\d{4}` 格式。
    """
    if not _YM_RE.fullmatch(ym):
        raise ValueError(f"ym 格式必須是 YYYYMM，收到 {ym!r}")
    year = int(ym[:4]) - 1911
    month = ym[4:]
    return str(year), month


def _request_with_retry(
    session: requests.Session,
    url: str,
    data: dict[str, str],
) -> str:
    """POST 請求，失敗（連線錯誤或非 2xx）重試 2 次，間隔遞增（2s, 4s）。

    Args:
        session: 共用的 requests session（沿用 cookie）。
        url: 請求目標 URL。
        data: POST body（form-urlencoded）。

    Returns:
        str: 回應內文（UTF-8 解碼，MOPS 回應已明確宣告 `charset=UTF-8`）。

    Raises:
        requests.RequestException: 重試 2 次後仍失敗。
    """
    headers = {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": f"{MOPS_BASE}/t78sb39_new",
    }
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            resp = session.post(url, data=data, headers=headers, timeout=30, verify=False)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as exc:
            last_exc = exc
            if attempt < _MAX_RETRIES:
                delay = _RETRY_BASE_DELAY * (attempt + 1)
                logger.warning(
                    "MOPS POST %s 失敗（第 %d 次）：%s，%.0fs 後重試",
                    url,
                    attempt + 1,
                    exc,
                    delay,
                )
                time.sleep(delay)
            else:
                logger.error("MOPS POST %s 重試 %d 次後仍失敗：%s", url, _MAX_RETRIES, exc)
    assert last_exc is not None
    raise last_exc


def _fetch_raw_html(ym: str) -> str:
    """執行 MOPS t78sb39_q3 兩步協定，回傳原始 HTML。

    Two-step protocol：
      1) POST `ajax_t78sb39_new`（type=03）handshake。
      2) POST `ajax_t78sb39_q3` 帶民國年 + 月份，取得實際資料。

    Args:
        ym: 西元年月，格式 YYYYMM。

    Returns:
        str: `ajax_t78sb39_q3` 的回應 HTML。

    Raises:
        ValueError: `ym` 格式錯誤。
        requests.RequestException: HTTP 請求重試 2 次後仍失敗。
    """
    year, month = _ym_to_roc(ym)
    session = requests.Session()

    _request_with_retry(
        session,
        f"{MOPS_BASE}/ajax_t78sb39_new",
        {"step": "1", "firstin": "1", "off": "1", "type": "03"},
    )
    time.sleep(_INTER_REQUEST_SLEEP)

    return _request_with_retry(
        session,
        f"{MOPS_BASE}/ajax_t78sb39_q3",
        {
            "firstin": "true",
            "run": "",
            "off": "1",
            "step": "1",
            "fund_no": "0",
            "TYPEK": "all",
            "year": year,
            "month": month,
        },
    )


def parse_monthly_html(html: str) -> list[dict[str, Any]]:
    """解析 MOPS t78sb39_q3 回應 HTML。

    結構：每檔基金一個 `<table class='hasBorder'>`，前面緊接一個
    `<table class='noBorder'>` header 帶「民國 YYY 年 MM 月 公司代號：XXXX 公司名稱：…」。
    表格首列（`rowspan` 屬性）5 欄 `[基金全名, 名次, 股票代號, 股票名稱, 比例%]`，
    後續列只有 4 欄（省略基金全名）。「合計」列跳過。

    Args:
        html: `ajax_t78sb39_q3` 的回應 HTML。

    Returns:
        list[dict[str, Any]]: 每筆 `{fund_name_raw, comid, company_name, top5}`，
            `top5` 為 `[{rank, stock_code, stock_name, pct}]`（最多 5 筆）。
    """
    results: list[dict[str, Any]] = []

    header_iter = list(_COMPANY_HEADER_RE.finditer(html))
    table_iter = list(_FUND_TABLE_RE.finditer(html))

    for tbl_m in table_iter:
        tbl_start = tbl_m.start()
        matched_header = None
        for h in header_iter:
            if h.end() <= tbl_start:
                matched_header = h
            else:
                break
        if not matched_header:
            continue

        comid = matched_header.group(3).strip()
        company_name = _strip(matched_header.group(4))

        fund_name_raw: str | None = None
        top5: list[dict[str, Any]] = []
        for rm in _ROW_RE.finditer(tbl_m.group(1)):
            tr_html = rm.group(1)
            if "tblHead" in tr_html or "合計" in tr_html:
                continue

            cells_raw = _CELL_RE.findall(tr_html)
            if not cells_raw:
                continue

            rs_match = _ROWSPAN_RE.search(tr_html)
            if rs_match and len(cells_raw) == 5:
                fund_name_raw = _strip(cells_raw[0])
                rank_s, code_s, name_s, pct_s = cells_raw[1:5]
            elif len(cells_raw) == 4:
                rank_s, code_s, name_s, pct_s = cells_raw
            else:
                continue

            try:
                top5.append(
                    {
                        "rank": int(_strip(rank_s)),
                        "stock_code": _strip(code_s),
                        "stock_name": _strip(name_s),
                        "pct": float(_strip(pct_s)),
                    }
                )
            except ValueError:
                logger.warning("MOPS parse_monthly_html：無法解析持股列，跳過")
                continue

        if fund_name_raw and top5:
            results.append(
                {
                    "fund_name_raw": fund_name_raw,
                    "comid": comid,
                    "company_name": company_name,
                    "top5": top5[:5],
                }
            )

    return results


def fetch_monthly(ym: str, mapping: dict[str, list[str]] | None = None) -> dict[str, Any]:
    """抓取並解析 MOPS 指定月份「國內成分主動式 ETF 每月持股前五大」。

    Args:
        ym: 西元年月，格式 YYYYMM（例如 "202604"）。
        mapping: `fund_short` → 已知全名變體清單的對照表，傳給
            `fund_name_normalizer.normalize_to_fund_short()`。若為 `None`，
            fallback 使用 `fund_manager_map.get_seed_mapping()`。

    Returns:
        dict[str, Any]: `{"ym": ym, "funds": [...], "unmatched": [...]}`。
            `funds` 每筆 `{fund_short, fund_name_raw, comid, company_name, top5}`；
            對不上白名單的基金整檔收進 `unmatched`（`{fund_name_raw, comid}`），
            不會被丟棄或報錯。

    Raises:
        ValueError: `ym` 格式錯誤。
        requests.RequestException: HTTP 請求重試 2 次後仍失敗。
    """
    if not _YM_RE.fullmatch(ym):
        raise ValueError(f"ym 格式必須是 YYYYMM，收到 {ym!r}")

    if mapping is None:
        from ETF.config.fund_manager_map import get_seed_mapping

        mapping = get_seed_mapping()

    from ETF.utils.fund_name_normalizer import normalize_to_fund_short

    raw_html = _fetch_raw_html(ym)
    parsed = parse_monthly_html(raw_html)

    funds: list[dict[str, Any]] = []
    unmatched: list[dict[str, Any]] = []

    for entry in parsed:
        fund_short = normalize_to_fund_short(entry["fund_name_raw"], mapping)
        if fund_short is None:
            unmatched.append(
                {"fund_name_raw": entry["fund_name_raw"], "comid": entry["comid"]}
            )
            continue
        funds.append(
            {
                "fund_short": fund_short,
                "fund_name_raw": entry["fund_name_raw"],
                "comid": entry["comid"],
                "company_name": entry["company_name"],
                "top5": entry["top5"],
            }
        )

    return {"ym": ym, "funds": funds, "unmatched": unmatched}
