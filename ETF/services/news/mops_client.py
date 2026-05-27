"""MOPS 公開資訊觀測站客戶端 — 直接呼叫 HTTP API，不透過 D1。

邏輯來源：stock-data-main/Web_Crawler/mops_scraper.py
"""

import json
import logging
import re
import time
from datetime import date, timedelta

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

_API_URL = "https://mops.twse.com.tw/mops/api/t05st02"
_DETAIL_URL = "https://mops.twse.com.tw/mops/api/t05st02_detail"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Referer": "https://mops.twse.com.tw/mops/",
}


def _roc_to_gregorian(roc_date: str) -> str:
    """民國日期 (115/01/28) → YYYY-MM-DD"""
    m = re.match(r"(\d+)/(\d+)/(\d+)", roc_date)
    if not m:
        return roc_date
    y = int(m.group(1)) + 1911
    return f"{y}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"


def fetch_mops_detail(
    enter_date: str,
    serial_number: int | str,
    company_id: str,
    market_kind: str,
) -> dict:
    """呼叫 MOPS detail API，取得單筆公告的完整內文、發言人與事件日期。

    Args:
        enter_date: 公告日期（民國格式，如 "1150527"）
        serial_number: 公告序號
        company_id: 股票代碼
        market_kind: 市場別（如 "sii"、"otc"）

    Returns:
        {"content": str|None, "speaker": str|None, "event_date": str|None}
        失敗時靜默回傳空 dict（所有值為 None）
    """
    try:
        resp = requests.post(
            _DETAIL_URL,
            headers=_HEADERS,
            json={
                "enterDate": enter_date,
                "serialNumber": serial_number,
                "companyId": company_id,
                "marketKind": market_kind,
            },
            timeout=20,
            verify=False,
        )
        resp.raise_for_status()
        payload = json.loads(resp.content.decode("utf-8"))

        # code 在頂層；不存在時視為成功
        api_code = payload.get("code")
        if api_code is not None and api_code != 200:
            return {}

        rows = payload.get("result", {}).get("data", [])
        serial_str = str(serial_number)
        for row in rows:
            if len(row) < 10:
                continue
            # row[0] 是序號欄位，用字串比對確保型別一致
            if str(row[0]) != serial_str:
                continue
            event_date_raw = row[8] if len(row) > 8 else None
            event_date = _roc_to_gregorian(event_date_raw) if event_date_raw else None
            return {
                "content": row[9] if len(row) > 9 else None,
                "speaker": row[3] if len(row) > 3 else None,
                "event_date": event_date,
            }
    except Exception as e:
        logger.debug(f"fetch_mops_detail 靜默降級: enter_date={enter_date}, serial={serial_number}: {e}")
    return {}


def fetch_mops_announcements(
    stock_codes: list[str],
    days: int = 7,
) -> list[dict]:
    """查詢近 N 日 MOPS 重大訊息，僅回傳指定股票的公告。

    Args:
        stock_codes: 股票代碼列表（最多 20 個）
        days: 回溯天數

    Returns:
        [{stock_code, pub_date, pub_time, title, source}, ...]
    """
    if not stock_codes:
        return []

    codes_set = set(stock_codes[:20])
    today = date.today()
    results: list[dict] = []

    for offset in range(days):
        target = today - timedelta(days=offset)
        year = str(target.year - 1911)
        month = f"{target.month:02d}"
        day = f"{target.day:02d}"

        try:
            resp = requests.post(
                _API_URL,
                headers=_HEADERS,
                json={"year": year, "month": month, "day": day, "TYPEK": "all"},
                timeout=20,
                verify=False,  # MOPS 憑證缺少 Subject Key Identifier，跳過 SSL 驗證
            )
            resp.raise_for_status()
            payload = json.loads(resp.content.decode("utf-8"))

            # 早期返回：API 頂層 code 明確非 200（不存在時視為成功）
            api_code = payload.get("code")
            if api_code is not None and api_code != 200:
                logger.debug(f"MOPS API non-200 for {target}: code={api_code}")
                continue

            data = payload.get("result", {}).get("data", [])

            for item in data:
                if len(item) < 5:
                    continue
                code = item[2]
                if code not in codes_set:
                    continue

                # 擷取公司名稱（item[3]）
                company_name: str | None = item[3] if len(item) > 3 else None

                url = (
                    f"https://mops.twse.com.tw/mops/web/ajax_t05st02"
                    f"?step=1&firstin=1&TYPEK=all&co_id={code}"
                    f"&year={year}&month={month}&day={day}"
                )

                # 嘗試從 item[5].parameters 解析 detail 所需參數
                meta = item[5] if len(item) > 5 else None
                detail_params: dict = (
                    meta.get("parameters", {})
                    if isinstance(meta, dict)
                    else {}
                )
                enter_date = detail_params.get("enterDate")
                serial_number = detail_params.get("serialNumber")
                market_kind = detail_params.get("marketKind")

                detail: dict = {}
                if enter_date and serial_number is not None and market_kind:
                    detail = fetch_mops_detail(
                        enter_date=str(enter_date),
                        serial_number=serial_number,
                        company_id=code,
                        market_kind=market_kind,
                    )
                    time.sleep(0.2)

                results.append({
                    "stock_code": code,
                    "pub_date": _roc_to_gregorian(item[0]),
                    "pub_time": item[1],
                    "title": item[4].replace("\r\n", " ").replace("\n", " "),
                    "source": "公開資訊觀測站",
                    "url": url,
                    "company_name": company_name,
                    "content": detail.get("content"),
                    "speaker": detail.get("speaker"),
                    "event_date": detail.get("event_date"),
                })

        except Exception as e:
            logger.warning(f"MOPS query failed for {target}: {e}")

        if offset < days - 1:
            time.sleep(0.5)

    return results
