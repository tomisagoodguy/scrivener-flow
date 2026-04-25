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
            data = json.loads(resp.content.decode("utf-8")).get("result", {}).get("data", [])

            for item in data:
                if len(item) < 5:
                    continue
                code = item[2]
                if code not in codes_set:
                    continue
                url = (
                    f"https://mops.twse.com.tw/mops/web/ajax_t05st02"
                    f"?step=1&firstin=1&TYPEK=all&co_id={code}"
                    f"&year={year}&month={month}&day={day}"
                )
                results.append({
                    "stock_code": code,
                    "pub_date": _roc_to_gregorian(item[0]),
                    "pub_time": item[1],
                    "title": item[4].replace("\r\n", " ").replace("\n", " "),
                    "source": "公開資訊觀測站",
                    "url": url,
                })

        except Exception as e:
            logger.warning(f"MOPS query failed for {target}: {e}")

        if offset < days - 1:
            time.sleep(0.3)

    return results
