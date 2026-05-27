"""經濟日報（UDN）新聞爬蟲。

策略：直接呼叫 UDN 公開搜尋 API，以股票代碼為關鍵字搜尋，
回傳 JSON 含標題、URL、時間，無需繞過 bot 偵測。
"""

import logging
import time

import requests

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://udn.com/",
}
_TIMEOUT = 15
_RATE_LIMIT = 0.3


def fetch_udn_news(stock_codes: list[str]) -> list[dict]:
    """從經濟日報取得各股近期新聞（標題 + URL + 日期）。

    Args:
        stock_codes: 股票代碼列表（如 ["2330", "2454"]）

    Returns:
        list of {stock_code, title, url, pub_date, source}
        任何例外靜默回傳 []
    """
    results: list[dict] = []

    for i, code in enumerate(stock_codes):
        if i > 0:
            time.sleep(_RATE_LIMIT)

        items = _fetch_single(code)
        results.extend(items)

    return results


def _fetch_single(code: str) -> list[dict]:
    """呼叫 UDN 搜尋 API 取單支股票新聞，失敗靜默回傳 []。"""
    url = f"https://udn.com/api/more?page=1&id=search&type=news&kw={code}"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        if resp.status_code >= 400:
            logger.warning(f"UDN HTTP {resp.status_code} for {code}")
            return []
    except Exception as e:
        logger.warning(f"UDN request failed for {code}: {e}")
        return []

    try:
        payload = resp.json()
    except Exception as e:
        logger.warning(f"UDN JSON parse failed for {code}: {e}")
        return []

    # 驗證 JSON 結構：需有 result.items
    result_obj = payload.get("result")
    if not isinstance(result_obj, dict):
        logger.warning(f"UDN unexpected JSON structure for {code}: missing 'result'")
        return []

    items_raw = result_obj.get("items")
    if not isinstance(items_raw, list):
        logger.warning(f"UDN unexpected JSON structure for {code}: missing 'items'")
        return []

    results: list[dict] = []
    for item in items_raw[:10]:
        try:
            title = (item.get("title") or "").strip()
            item_url = item.get("url") or ""
            pub_date = (item.get("time") or "")[:10]  # 取前 10 字元 YYYY-MM-DD
            if not title:
                continue
            results.append({
                "stock_code": code,
                "title": title,
                "url": item_url,
                "pub_date": pub_date,
                "source": "經濟日報",
            })
        except Exception:
            continue

    return results
