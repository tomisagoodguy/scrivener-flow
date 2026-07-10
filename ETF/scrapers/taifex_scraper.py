"""TAIFEX 期貨籌碼爬蟲 — 三大法人未平倉部位 + 全市場未沖銷契約量。

供每日 pipeline 寫入 futures_institutional_daily 表：
  - fetch_futures_positions：三契約（TX 大台 / MXF 小台 / TMF 微台）×
    三法人（dealer / trust / foreign）未平倉多空口數
  - fetch_market_oi：MXF / TMF 全市場 OI（推導散戶多空比用）

資料來源：
  - https://www.taifex.com.tw/cht/3/futContractsDate（三大法人區分各商品，HTML）
  - https://www.taifex.com.tw/cht/3/futDataDown（期貨每日交易行情下載，big5 CSV）

commodityId 實測（2026-07-08）：大台送 ``TXF`` 有效（``TX`` 查無表格）、
小台 ``MXF``、微台 ``TMF``；輸出時大台正規化為 ``TX``。

解析 regex 模式來自 TW_Active_Tracker（已驗證）。
任何錯誤（非交易日、HTML 無法 match、網路失敗）皆回傳空結果，不 raise。
"""

from __future__ import annotations

import csv
import io
import logging
import re

import requests

logger = logging.getLogger(__name__)

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
TIMEOUT = 30

_FUT_CONTRACTS_URL = "https://www.taifex.com.tw/cht/3/futContractsDate"
_FUT_DATA_DOWN_URL = "https://www.taifex.com.tw/cht/3/futDataDown"
_MARKET_VIEW_REFERER = "https://www.taifex.com.tw/cht/3/futDailyMarketView"

# 輸出 contract → futContractsDate 的 commodityId（大台實測需送 TXF）
_POSITION_COMMODITY_IDS: dict[str, str] = {"TX": "TXF", "MXF": "MXF", "TMF": "TMF"}

# 輸出 contract → futDataDown 的行情代碼（TW_Active_Tracker 映射）
_MARKET_OI_COMMODITY_IDS: dict[str, str] = {"MXF": "MTX", "TMF": "TMF"}

# 三大法人身份別 → 標準代碼
_INSTITUTION_MAP: dict[str, str] = {
    "自營商": "dealer",
    "投信": "trust",
    "外資": "foreign",
    "外資及陸資": "foreign",
}

# futDataDown CSV 未沖銷契約量欄名（實測 2026-07-08 header 為「未沖銷契約數」）
_OI_COLUMN = "未沖銷契約數"

# 三法人列區塊（TW_Active_Tracker 已驗證模式）：
# match[1]=序號、match[2]=契約名稱、match[3]/[4]/[5]=自營商/投信/外資列 HTML
_ROW_BLOCK_RE = re.compile(
    r'<td class="sheet-sticky serial-1" rowspan="3"[\s\S]*?<div[^>]*>\s*(\d+)\s*'
    r'</div></td>\s*<td class="sheet-sticky serial-2" rowspan="3"[\s\S]*?'
    r"<div[^>]*>\s*([^<]+?)\s*</div></td>([\s\S]*?)</TR>\s*"
    r'<TR class="12bk">([\s\S]*?)</TR>\s*<TR class="12bk">([\s\S]*?)</TR>',
    re.IGNORECASE,
)
_CELL_RE = re.compile(r"<TD[^>]*>([\s\S]*?)</TD>", re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]+>")


def _clean_cell(raw: str) -> str:
    """去 HTML tag、&nbsp; 與多餘空白。"""
    text = _TAG_RE.sub(" ", raw).replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", text).strip()


def _to_int(value: str) -> int | None:
    """去千分位逗號後轉 int；空值或 '-' 回傳 None。"""
    cleaned = value.replace(",", "").strip()
    if not cleaned or cleaned == "-":
        return None
    try:
        return int(cleaned)
    except ValueError:
        return None


def _to_slash_date(date_str: str) -> str:
    """YYYY-MM-DD → YYYY/MM/DD（已是斜線格式則原樣回傳）。"""
    return date_str.replace("-", "/")


def _parse_positions_html(html: str, contract: str) -> list[dict[str, str | int]]:
    """解析 futContractsDate HTML，回傳單一契約的三法人未平倉部位。

    Args:
        html: futContractsDate 回應 HTML。
        contract: 正規化契約代碼（"TX" / "MXF" / "TMF"）。

    Returns:
        每法人一筆 {contract, institution, long_oi, short_oi, net_oi}；
        HTML 無法 match（查無資料）回傳 []。
    """
    match = _ROW_BLOCK_RE.search(html)
    if not match:
        return []

    rows: list[dict[str, str | int]] = []
    for row_html in (match.group(3), match.group(4), match.group(5)):
        cells = [_clean_cell(c) for c in _CELL_RE.findall(row_html)]
        if len(cells) < 13:
            logger.warning("[TAIFEX] %s 法人列欄位不足（%d）", contract, len(cells))
            continue
        institution = _INSTITUTION_MAP.get(cells[0])
        if institution is None:
            logger.warning("[TAIFEX] %s 未知身份別：%s", contract, cells[0])
            continue
        long_oi = _to_int(cells[7])
        short_oi = _to_int(cells[9])
        net_oi = _to_int(cells[11])
        if long_oi is None or short_oi is None or net_oi is None:
            logger.warning("[TAIFEX] %s %s 未平倉口數解析失敗", contract, cells[0])
            continue
        rows.append(
            {
                "contract": contract,
                "institution": institution,
                "long_oi": long_oi,
                "short_oi": short_oi,
                "net_oi": net_oi,
            }
        )
    return rows


def fetch_futures_positions(date_str: str) -> list[dict[str, str | int]]:
    """抓取三契約 × 三法人期貨未平倉部位。

    Args:
        date_str: 查詢日期，格式 YYYY-MM-DD。

    Returns:
        最多 9 筆 dict：{"contract": "TX"|"MXF"|"TMF", "institution":
        "dealer"|"trust"|"foreign", "long_oi": int, "short_oi": int,
        "net_oi": int}（未平倉口數）。單一契約失敗回傳其餘已成功的部分；
        全部失敗（非交易日、網路錯誤）回傳 []，不 raise。
    """
    query_date = _to_slash_date(date_str)
    headers = {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": _FUT_CONTRACTS_URL,
    }
    results: list[dict[str, str | int]] = []
    for contract, commodity_id in _POSITION_COMMODITY_IDS.items():
        body = {
            "queryType": "1",
            "goDay": "",
            "doQuery": "1",
            "dateaddcnt": "",
            "queryDate": query_date,
            "commodityId": commodity_id,
        }
        try:
            resp = requests.post(
                _FUT_CONTRACTS_URL, headers=headers, data=body, timeout=TIMEOUT
            )
            resp.raise_for_status()
            rows = _parse_positions_html(resp.text, contract)
            if not rows:
                logger.warning(
                    "[TAIFEX] %s %s 無當日法人資料（非交易日或未發布）",
                    query_date,
                    contract,
                )
            results.extend(rows)
        except Exception as exc:
            logger.error("[TAIFEX] %s %s 抓取失敗：%s", query_date, contract, exc)
    logger.info("[TAIFEX] %s 法人未平倉共 %d 筆", query_date, len(results))
    return results


def fetch_market_oi(date_str: str) -> dict[str, int]:
    """抓取 MXF / TMF 全市場未沖銷契約量（散戶多空比分母）。

    來源為 futDataDown 的 big5 編碼 CSV；過濾「交易時段 == 一般」且
    「交易日期 == 查詢日」的列，將所有到期月份（週別）的「未沖銷契約數」
    欄（實測 2026-07-08 header 欄名）加總 = 該契約全市場 OI。
    價差組合列該欄為 '-'，自然排除。

    Args:
        date_str: 查詢日期，格式 YYYY-MM-DD。

    Returns:
        {"MXF": int, "TMF": int}；無當日資料的契約不含該鍵，
        全部失敗回傳空 dict，不 raise。
    """
    query_date = _to_slash_date(date_str)
    headers = {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": _MARKET_VIEW_REFERER,
    }
    result: dict[str, int] = {}
    for contract, commodity_id in _MARKET_OI_COMMODITY_IDS.items():
        body = {
            "down_type": "1",
            "queryStartDate": query_date,
            "queryEndDate": query_date,
            "commodity_id": commodity_id,
            "commodity_id2": "",
        }
        try:
            resp = requests.post(
                _FUT_DATA_DOWN_URL, headers=headers, data=body, timeout=TIMEOUT
            )
            resp.raise_for_status()
            text = resp.content.decode("big5", errors="replace")
            total = _sum_general_session_oi(text, query_date)
            if total is None:
                logger.warning(
                    "[TAIFEX] %s %s 無當日行情資料（非交易日或未發布）",
                    query_date,
                    contract,
                )
                continue
            result[contract] = total
        except Exception as exc:
            logger.error(
                "[TAIFEX] %s %s 全市場 OI 抓取失敗：%s", query_date, contract, exc
            )
    logger.info("[TAIFEX] %s 全市場 OI：%s", query_date, result)
    return result


def _sum_general_session_oi(csv_text: str, query_date: str) -> int | None:
    """加總 CSV 中查詢日一般時段所有月份的未沖銷契約量。

    Args:
        csv_text: futDataDown 解碼後 CSV 文字。
        query_date: 查詢日期，格式 YYYY/MM/DD。

    Returns:
        OI 加總；CSV 無 header 或無任何匹配列回傳 None。
    """
    rows = list(csv.reader(io.StringIO(csv_text)))
    if not rows:
        return None
    header = [h.strip() for h in rows[0]]
    try:
        date_idx = header.index("交易日期")
        session_idx = header.index("交易時段")
        oi_idx = header.index(_OI_COLUMN)
    except ValueError:
        logger.warning("[TAIFEX] CSV header 缺必要欄位：%s", header)
        return None

    total = 0
    matched = False
    for row in rows[1:]:
        if len(row) <= max(date_idx, session_idx, oi_idx):
            continue
        if row[date_idx].strip() != query_date:
            continue
        if row[session_idx].strip() != "一般":
            continue
        oi = _to_int(row[oi_idx])
        if oi is None:
            continue
        total += oi
        matched = True
    return total if matched else None
