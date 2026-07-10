"""TWSE / TPEx 籌碼面爬蟲 — 市場融資融券合計與三大法人買賣超。

供 market-chips-dashboard change 使用，寫入 `market_margin_daily` 與
`institutional_stock_daily` 兩張表。

Public interface:
    fetch_margin(date_str) -> dict | None
        市場融資融券合計（MI_MARGN, selectType=MS）。
    fetch_institutional(date_str) -> list[dict]
        上市（T86）+ 上櫃（TPEx dailyTrade）個股三大法人買賣超合併清單。

兩者皆不拋例外（非交易日 / API 失敗一律回傳 None 或 []），呼叫方無需 try/except。
"""

from __future__ import annotations

import json
import logging
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

UA = "Mozilla/5.0 (etf-pipeline-twse-chips; +scrivener-flow)"

# Windows 部分環境的系統憑證庫缺少 TWSE/TPEx 憑證鏈所需的 Subject Key Identifier，
# 導致 ssl.create_default_context() 驗證失敗（[SSL: CERTIFICATE_VERIFY_FAILED]）。
# 改用 certifi 的憑證包可正常驗證通過（已於本機實測確認），非停用驗證。
try:
    import certifi

    _SSL_CONTEXT: ssl.SSLContext | None = ssl.create_default_context(cafile=certifi.where())
except ImportError:  # pragma: no cover - certifi 為既有相依套件，理論上必然存在
    _SSL_CONTEXT = None

_STOCK_CODE_RE = re.compile(r"^\d{4}$")

# TWSE MI_MARGN（selectType=MS，市場信用交易統計合計表）
# 實測 payload 結構（2026-07-09 驗證）：
#   {"stat": "OK", "date": "YYYYMMDD",
#    "tables": [{"fields": [項目, 買進, 賣出, 現金(券)償還, 前日餘額, 今日餘額],
#                "data": [[...], ...]}]}
# data 列（依序）：
#   0: "融資(交易單位)"     — 融資張數統計（本 scraper 不使用）
#   1: "融券(交易單位)"     — 融券張數 → short_balance / short_change
#   2: "融資金額(仟元)"     — 融資金額 → margin_balance / margin_change
_MARGIN_ITEM_LABEL = "融資金額"
_SHORT_ITEM_LABEL = "融券(交易單位)"


def _to_ymd(date_str: str) -> str:
    """YYYY-MM-DD → YYYYMMDD。"""
    return date_str.replace("-", "")


def _clean_num(v: Any) -> float | None:
    """清洗千分位逗號並轉為 float；無法解析回傳 None。"""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace(",", "").strip()
    if not s or s in ("--", "-"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _clean_int(v: Any) -> int | None:
    n = _clean_num(v)
    return int(n) if n is not None else None


def _get_json(url: str) -> dict[str, Any] | None:
    """GET 並解析 JSON；任何錯誤回傳 None（log error）。"""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30, context=_SSL_CONTEXT) as resp:
            raw = resp.read()
        return dict(json.loads(raw.decode("utf-8")))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        logger.error("[TWSE_CHIPS] GET %s 失敗：%s", url, exc)
        return None


def _ymd_to_roc(ymd: str) -> str:
    """YYYYMMDD → 民國日期 "ROC/MM/DD"（如 "20260709" → "115/07/09"）。"""
    year = int(ymd[:4]) - 1911
    return f"{year}/{ymd[4:6]}/{ymd[6:8]}"


def fetch_margin(date_str: str) -> dict[str, Any] | None:
    """取得市場融資融券合計（TWSE MI_MARGN, selectType=MS）。

    Args:
        date_str: 資料日期，格式 "YYYY-MM-DD"。

    Returns:
        {"data_date": date_str, "margin_balance": float, "margin_change": float,
         "short_balance": float, "short_change": float}；
        非交易日 / API 回傳非 OK / 找不到對應列時回傳 None（不拋例外）。
    """
    ymd = _to_ymd(date_str)
    url = (
        "https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN"
        f"?date={ymd}&selectType=MS&response=json"
    )
    payload = _get_json(url)
    if payload is None:
        return None
    if payload.get("stat") != "OK":
        logger.warning("[TWSE_CHIPS] MI_MARGN %s stat != OK：%s", date_str, payload.get("stat"))
        return None

    tables = payload.get("tables") or []
    table = next((t for t in tables if t.get("data")), None)
    if table is None:
        logger.warning("[TWSE_CHIPS] MI_MARGN %s 無資料表", date_str)
        return None

    rows = table.get("data") or []
    margin_row = next((r for r in rows if r and _MARGIN_ITEM_LABEL in str(r[0])), None)
    short_row = next((r for r in rows if r and _SHORT_ITEM_LABEL in str(r[0])), None)
    if margin_row is None or short_row is None:
        logger.warning("[TWSE_CHIPS] MI_MARGN %s 找不到融資金額/融券列", date_str)
        return None

    # row 結構：[項目, 買進, 賣出, 現金(券)償還, 前日餘額, 今日餘額]
    def balance_and_change(row: list[Any]) -> tuple[float, float] | None:
        if len(row) < 6:
            return None
        prev = _clean_num(row[4])
        today = _clean_num(row[5])
        if prev is None or today is None:
            return None
        return today, today - prev

    margin = balance_and_change(margin_row)
    short = balance_and_change(short_row)
    if margin is None or short is None:
        logger.warning("[TWSE_CHIPS] MI_MARGN %s 餘額欄位解析失敗", date_str)
        return None

    margin_balance, margin_change = margin
    short_balance, short_change = short
    return {
        "data_date": date_str,
        "margin_balance": margin_balance,
        "margin_change": margin_change,
        "short_balance": short_balance,
        "short_change": short_change,
    }


def _fetch_twse_t86(ymd: str) -> list[dict[str, Any]]:
    """上市個股三大法人買賣超（TWSE T86）。

    欄位索引（fields 陣列已驗證，2026-07-09）：
        [0]=證券代號 [1]=證券名稱
        [4]=外陸資買賣超股數(不含外資自營商) → foreign_net
        [10]=投信買賣超股數 → trust_net
        [11]=自營商買賣超股數(合計) → dealer_net
        [18]=三大法人買賣超股數(合計)
    """
    url = (
        "https://www.twse.com.tw/rwd/zh/fund/T86"
        f"?date={ymd}&selectType=ALLBUT0999&response=json"
    )
    payload = _get_json(url)
    if payload is None:
        return []
    if payload.get("stat") != "OK":
        logger.warning("[TWSE_CHIPS] T86 stat != OK：%s", payload.get("stat"))
        return []
    data = payload.get("data")
    if not isinstance(data, list):
        logger.warning("[TWSE_CHIPS] T86 data 非陣列")
        return []

    results: list[dict[str, Any]] = []
    for row in data:
        if not isinstance(row, list) or len(row) < 19:
            continue
        code = str(row[0]).strip()
        if not _STOCK_CODE_RE.match(code):
            continue
        foreign_net = _clean_int(row[4])
        trust_net = _clean_int(row[10])
        dealer_net = _clean_int(row[11])
        if foreign_net is None or trust_net is None or dealer_net is None:
            continue
        results.append(
            {
                "stock_code": code,
                "foreign_net": foreign_net,
                "trust_net": trust_net,
                "dealer_net": dealer_net,
            }
        )
    return results


def _fetch_tpex_institutional(ymd: str) -> list[dict[str, Any]]:
    """上櫃個股三大法人買賣超（TPEx dailyTrade）。

    欄位索引（fields 陣列已驗證，2026-07-09，ROC 日期 115/07/09）：
        [0]=代號 [1]=名稱
        [10]=外資買賣超股數(合計) → foreign_net
        [13]=投信買賣超股數 → trust_net
        [22]=自營商買賣超股數(合計) → dealer_net
        [23]=三大法人買賣超股數合計
    """
    roc_date = _ymd_to_roc(ymd)
    url = (
        "https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade"
        f"?date={urllib.parse.quote(roc_date)}&type=Daily&response=json"
    )
    payload = _get_json(url)
    if payload is None:
        return []
    tables = payload.get("tables") or []
    table = next((t for t in tables if isinstance(t.get("data"), list)), None)
    if table is None:
        logger.warning("[TWSE_CHIPS] TPEx %s 找不到含 data 的 table", roc_date)
        return []

    results: list[dict[str, Any]] = []
    for row in table.get("data") or []:
        if not isinstance(row, list) or len(row) < 24:
            continue
        code = str(row[0]).strip()
        if not _STOCK_CODE_RE.match(code):
            continue
        foreign_net = _clean_int(row[10])
        trust_net = _clean_int(row[13])
        dealer_net = _clean_int(row[22])
        if foreign_net is None or trust_net is None or dealer_net is None:
            continue
        results.append(
            {
                "stock_code": code,
                "foreign_net": foreign_net,
                "trust_net": trust_net,
                "dealer_net": dealer_net,
            }
        )
    return results


def fetch_institutional(date_str: str) -> list[dict[str, Any]]:
    """取得上市（T86）+ 上櫃（TPEx）個股三大法人買賣超合併清單。

    Args:
        date_str: 資料日期，格式 "YYYY-MM-DD"。

    Returns:
        [{"stock_code": str, "foreign_net": int, "trust_net": int, "dealer_net": int}, ...]，
        單位：股。單一來源失敗只 log 不 raise，回傳另一來源資料；兩者皆無資料回傳 []。
    """
    ymd = _to_ymd(date_str)

    try:
        listed = _fetch_twse_t86(ymd)
    except Exception as exc:  # noqa: BLE001 - 單一來源失敗不可中斷另一來源
        logger.error("[TWSE_CHIPS] TWSE T86 %s 抓取失敗：%s", date_str, exc)
        listed = []

    try:
        otc = _fetch_tpex_institutional(ymd)
    except Exception as exc:  # noqa: BLE001
        logger.error("[TWSE_CHIPS] TPEx %s 抓取失敗：%s", date_str, exc)
        otc = []

    combined = listed + otc
    logger.info(
        "[TWSE_CHIPS] %s 合併三大法人買賣超：上市 %d 筆 + 上櫃 %d 筆 = %d 筆",
        date_str,
        len(listed),
        len(otc),
        len(combined),
    )
    return combined
