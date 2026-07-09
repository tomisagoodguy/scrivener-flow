"""
投信投顧公會（SITCA）基金持股爬蟲

資料來源：
  月報 Top 10  —— https://www.sitca.org.tw/ROC/Industry/IN2629.aspx
  季報 ≥1% 持股 —— https://www.sitca.org.tw/ROC/Industry/IN2630.aspx

用途：「經理人雙軌訊號」功能的資料來源（比對同經理人主動 ETF 與傳統基金持股）。
本模組只負責抓取與解析，不寫 DB、不做基金名稱正規化。

已知限制：
  SITCA 歷史期別的 server-side filter 已知會失效（無論傳哪個 __VIEWSTATE 都回最新一期資料），
  因此本模組**只允許查詢最新一期**；收到非最新期參數時直接 raise ValueError，
  寧可報錯也不要靜默回傳錯誤期別的資料。

參考實作：tw-active/tools/managerwatch.py（request 組法與 table parser 已驗證可用）。
"""

from __future__ import annotations

import html as html_mod
import logging
import re
import time
from typing import Any

import requests
import urllib3

# SITCA 憑證問題（見 _request_with_retry 註解）需關閉 SSL 驗證，連帶關閉對應警告雜訊
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

SITCA_BASE = "https://www.sitca.org.tw/ROC/Industry"
UA = "Mozilla/5.0 (etf-pipeline-sitca-scraper; +scrivener-flow)"

_MAX_RETRIES = 2
_RETRY_BASE_DELAY = 2.0  # 秒，每次重試遞增（2s, 4s）
_POLITE_SLEEP_RANGE = (1.0, 2.0)  # 請求間禮貌性 sleep（秒）

# ── HTML parsing regex ────────────────────────────────────────────────────

_HIDDEN_NAME_RE = re.compile(r'name="([^"]+)"', re.I)
_HIDDEN_VALUE_RE = re.compile(r'value="([^"]*)"', re.I)
_HIDDEN_INPUT_RE = re.compile(r"<input[^>]+type=\"hidden\"[^>]*>", re.I)
_ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S | re.I)
_CELL_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.S | re.I)
_ROWSPAN_RE = re.compile(r"rowspan=['\"]?(\d+)", re.I)
_TAG_RE = re.compile(r"<[^>]+>")
_OPTION_RE = re.compile(r'<option[^>]*value="([^"]*)"[^>]*>([^<]*)</option>', re.I)


def _strip(s: str) -> str:
    """去除 HTML tag、<br> 轉空白、unescape entities。"""
    s = re.sub(r"<br\s*/?>", " ", s, flags=re.I)
    s = _TAG_RE.sub("", s)
    return html_mod.unescape(s).strip()


def _extract_aspnet_state(page_html: str) -> dict[str, str]:
    """抽取 ASP.NET __VIEWSTATE / __EVENTVALIDATION / __VIEWSTATEGENERATOR 等 hidden field。"""
    out: dict[str, str] = {}
    for m in _HIDDEN_INPUT_RE.finditer(page_html):
        tag = m.group(0)
        nm = _HIDDEN_NAME_RE.search(tag)
        vm = _HIDDEN_VALUE_RE.search(tag)
        if nm:
            out[nm.group(1)] = html_mod.unescape(vm.group(1)) if vm else ""
    return out


def _extract_select_options(page_html: str, field_name: str) -> list[tuple[str, str]]:
    """回傳指定 <select name="...field_name..."> 下所有 (value, text)。"""
    m = re.search(
        rf'<select[^>]*name="[^"]*{re.escape(field_name)}[^"]*"[^>]*>(.*?)</select>',
        page_html,
        re.S | re.I,
    )
    if not m:
        return []
    return [(v.strip(), t.strip()) for v, t in _OPTION_RE.findall(m.group(1))]


def _latest_period(page_html: str) -> str:
    """從 ddlQ_YM 下拉選項判定最新期別（值為 YYYYMM 字串，字典序即可比大小）。"""
    options = _extract_select_options(page_html, "ddlQ_YM")
    values = [v for v, _ in options if v.strip()]
    if not values:
        raise ValueError("無法從 SITCA 頁面判定最新期別（ddlQ_YM 下拉選單為空）")
    return max(values)


# ── HTTP helpers（含重試） ────────────────────────────────────────────────


def _request_with_retry(
    method: str,
    session: requests.Session,
    url: str,
    **kwargs: Any,
) -> requests.Response:
    """
    HTTP 請求，失敗（連線錯誤或非 2xx）重試 2 次，間隔遞增（2s, 4s）。
    仍失敗則 raise（由呼叫端 log）。
    """
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            # SITCA 伺服器憑證鏈缺 Subject Key Identifier，requests/OpenSSL 3.x 驗證會失敗；
            # 與 fhtrust_scraper.py／official_api_scraper.py 對台灣官方老舊網站的處理一致，關閉驗證。
            resp = session.request(method, url, timeout=30, verify=False, **kwargs)
            resp.raise_for_status()
            return resp
        except (requests.RequestException,) as exc:
            last_exc = exc
            if attempt < _MAX_RETRIES:
                delay = _RETRY_BASE_DELAY * (attempt + 1)
                logger.warning(
                    "SITCA %s %s 失敗（第 %d 次）：%s，%.0fs 後重試",
                    method,
                    url,
                    attempt + 1,
                    exc,
                    delay,
                )
                time.sleep(delay)
            else:
                logger.error(
                    "SITCA %s %s 重試 %d 次後仍失敗：%s", method, url, _MAX_RETRIES, exc
                )
    assert last_exc is not None
    raise last_exc


def _get_initial(session: requests.Session, aspx: str) -> str:
    """第一次 GET 拿 hidden tokens + cookie（cookie 由 session 自動保存）。"""
    url = f"{SITCA_BASE}/{aspx}"
    resp = _request_with_retry("GET", session, url, headers={"User-Agent": UA})
    return resp.text


def _post_query(
    session: requests.Session,
    aspx: str,
    ym: str,
    comid: str,
    state: dict[str, str],
) -> str:
    """POST 查詢表單（rbComid 模式，依投信代碼查詢）。"""
    url = f"{SITCA_BASE}/{aspx}"
    payload = {
        "__VIEWSTATE": state.get("__VIEWSTATE", ""),
        "__VIEWSTATEGENERATOR": state.get("__VIEWSTATEGENERATOR", ""),
        "__EVENTVALIDATION": state.get("__EVENTVALIDATION", ""),
        "__EVENTTARGET": "",
        "__EVENTARGUMENT": "",
        "ctl00$ContentPlaceHolder1$rdo1": "rbComid",
        "ctl00$ContentPlaceHolder1$ddlQ_YM": ym,
        "ctl00$ContentPlaceHolder1$ddlQ_Comid": comid,
        "ctl00$ContentPlaceHolder1$ddlQ_Class": "AA1",
        "ctl00$ContentPlaceHolder1$BtnQuery": "查詢",
    }
    resp = _request_with_retry(
        "POST",
        session,
        url,
        data=payload,
        headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded"},
    )
    return resp.text


# ── Table parser ──────────────────────────────────────────────────────────


def parse_holdings(page_html: str, has_rank: bool) -> list[dict[str, Any]]:
    """
    解析 SITCA 持股表格。

    表格結構：
      IN2629（月報 Top10）：欄位 = [基金名稱, 名次, 標的種類, 標的代號, 標的名稱, 金額,
                                     擔保機構, 次順位, 受益權單位數, 比例%]
      IN2630（季報 ≥1%）：同上但無「名次」欄
      每檔基金第一列有 rowspan=N 的基金名稱欄，後續 N-1 列省略該欄。
      DTHeader（表頭）與 DTsubtotal（合計）列需跳過。

    Args:
        page_html: POST 查詢後回傳的 HTML。
        has_rank: True 為月報（IN2629，有名次欄），False 為季報（IN2630，無名次欄）。

    Returns:
        list of dict，鍵：fund_name_raw, rank(int|None), stock_code, stock_name,
        amount(int), pct(float), target_type。
    """
    rows: list[dict[str, Any]] = []
    current_fund: str | None = None
    remaining_rows = 0
    data_col_count = 9 if has_rank else 8

    for rm in _ROW_RE.finditer(page_html):
        tr_html = rm.group(1)
        if "DTHeader" in tr_html or "DTsubtotal" in tr_html:
            continue

        cells_raw = _CELL_RE.findall(tr_html)
        if not cells_raw:
            continue

        rs_match = _ROWSPAN_RE.search(tr_html)
        if (
            rs_match
            and ("DTeven" in tr_html or "DTodd" in tr_html)
            and len(cells_raw) >= data_col_count + 1
        ):
            remaining_rows = int(rs_match.group(1))
            current_fund = _strip(cells_raw[0])
            data_cells = cells_raw[1 : 1 + data_col_count]
        elif remaining_rows > 0 and len(cells_raw) >= data_col_count:
            data_cells = cells_raw[:data_col_count]
        else:
            continue

        try:
            if has_rank:
                rank_s = _strip(data_cells[0])
                rest = data_cells[1:]
            else:
                rank_s = ""
                rest = data_cells
            target_type = _strip(rest[0])
            stock_code = _strip(rest[1])
            stock_name = _strip(rest[2])
            amount_s = _strip(rest[3]).replace(",", "")
            pct_s = _strip(rest[7])
        except IndexError:
            logger.warning("SITCA parse_holdings：欄位數不足，跳過此列")
            remaining_rows = max(0, remaining_rows - 1)
            continue

        rows.append(
            {
                "fund_name_raw": current_fund,
                "rank": int(rank_s) if rank_s.isdigit() else None,
                "stock_code": stock_code,
                "stock_name": stock_name,
                "amount": int(amount_s) if amount_s.isdigit() else 0,
                "pct": float(pct_s) if re.match(r"^-?\d+(?:\.\d+)?$", pct_s) else 0.0,
                "target_type": target_type,
            }
        )
        remaining_rows -= 1

    return rows


# ── Public interface ──────────────────────────────────────────────────────


def _fetch(aspx: str, has_rank: bool, period: str, comid: str) -> list[dict[str, Any]]:
    """共用抓取流程：GET 取 token + 判定最新期 → 檢查期別 → POST 查詢 → parse。"""
    session = requests.Session()
    page_html = _get_initial(session, aspx)

    latest = _latest_period(page_html)
    if period != latest:
        raise ValueError(
            f"SITCA 僅支援查詢最新一期，收到期別={period!r}，"
            f"目前最新期別={latest!r}（歷史期別 server-side filter 已知失效）"
        )

    state = _extract_aspnet_state(page_html)
    time.sleep(_POLITE_SLEEP_RANGE[0])  # 禮貌性 sleep

    result_html = _post_query(session, aspx, period, comid, state)
    time.sleep(_POLITE_SLEEP_RANGE[1])  # 禮貌性 sleep

    return parse_holdings(result_html, has_rank=has_rank)


def get_latest_monthly_period() -> str:
    """回傳 SITCA 月報（IN2629）目前最新期別（YYYYMM，從 ddlQ_YM 下拉選單判定）。"""
    session = requests.Session()
    return _latest_period(_get_initial(session, "IN2629.aspx"))


def get_latest_quarterly_period() -> str:
    """回傳 SITCA 季報（IN2630）目前最新期別（YYYYMM 季末月，從 ddlQ_YM 下拉選單判定）。"""
    session = requests.Session()
    return _latest_period(_get_initial(session, "IN2630.aspx"))


def fetch_monthly(ym: str, comid: str) -> list[dict[str, Any]]:
    """
    抓取 SITCA 月報 Top 10 持股（IN2629.aspx）。

    Args:
        ym: 期別，格式 YYYYMM（例如 "202606"）。必須等於目前最新期別，否則 raise ValueError。
        comid: SITCA 投信代碼（例如 "A0009" 統一投信）。

    Returns:
        list of dict，鍵：fund_name_raw, rank(int), stock_code, stock_name, amount(int), pct(float), target_type。

    Raises:
        ValueError: 期別非最新一期。
        requests.RequestException: HTTP 請求重試 2 次後仍失敗。
    """
    return _fetch("IN2629.aspx", has_rank=True, period=ym, comid=comid)


def fetch_quarterly(yq: str, comid: str) -> list[dict[str, Any]]:
    """
    抓取 SITCA 季報 ≥1% 持股（IN2630.aspx）。

    Args:
        yq: 期別，格式 YYYYMM（季末月，例如 "202603"）。必須等於目前最新期別，否則 raise ValueError。
        comid: SITCA 投信代碼（例如 "A0009" 統一投信）。

    Returns:
        list of dict，鍵：fund_name_raw, rank(None), stock_code, stock_name, amount(int), pct(float), target_type。

    Raises:
        ValueError: 期別非最新一期。
        requests.RequestException: HTTP 請求重試 2 次後仍失敗。
    """
    return _fetch("IN2630.aspx", has_rank=False, period=yq, comid=comid)
