"""鉅亨網（CNYES）新聞爬蟲。

策略：直接 requests.get() CNYES 個股新聞頁（Next.js SSR），
用 re.search 提取 __NEXT_DATA__ JSON，從 props.pageProps.symbolNews.data 取標題與 URL。
不使用 Playwright，無需瀏覽器環境。
"""

import json
import logging
import time
from datetime import datetime

import requests

logger = logging.getLogger(__name__)

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
_HEADERS = {
    "User-Agent": _USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9",
}
_NEXT_DATA_PREFIX = "__NEXT_DATA__ = {"
_TIMEOUT = 15
_RATE_LIMIT = 0.3


def _unix_to_date(ts: int | float | str | None) -> str:
    """Unix timestamp（秒）→ YYYY-MM-DD；失敗回傳空字串。"""
    try:
        return datetime.fromtimestamp(int(ts)).strftime("%Y-%m-%d")
    except Exception:
        return ""


def fetch_cnyes_news(stock_codes: list[str]) -> list[dict]:
    """從鉅亨網取得各股近期新聞（標題 + URL + 日期）。

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
    """爬取單支股票的 CNYES 新聞，失敗靜默回傳 []。"""
    url = f"https://www.cnyes.com/twstock/{code}/news"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        if resp.status_code >= 400:
            logger.warning(f"CNYES HTTP {resp.status_code} for {code}")
            return []
        html = resp.text
    except Exception as e:
        logger.warning(f"CNYES request failed for {code}: {e}")
        return []

    # 提取 __NEXT_DATA__ JSON（格式：__NEXT_DATA__ = {...}，非 id 屬性）
    json_start = html.find(_NEXT_DATA_PREFIX)
    if json_start == -1:
        logger.warning(f"CNYES no __NEXT_DATA__ for {code}")
        return []

    # 使用 raw_decode 精確提取 JSON 物件，不依賴後綴符號
    json_offset = json_start + len(_NEXT_DATA_PREFIX) - 1  # 指向 `{`
    try:
        decoder = json.JSONDecoder()
        data, _ = decoder.raw_decode(html, json_offset)
    except Exception as e:
        logger.warning(f"CNYES JSON parse failed for {code}: {e}")
        return []

    # 路徑：props.pageProps.symbolNews.data
    try:
        items_raw = (
            data.get("props", {})
            .get("pageProps", {})
            .get("symbolNews", {})
            .get("data", [])
        )
    except Exception:
        items_raw = []

    if not items_raw:
        logger.warning(f"CNYES no data for {code}")
        return []

    results: list[dict] = []
    for item in items_raw[:10]:
        try:
            news_id = item.get("newsId") or item.get("id")
            title = item.get("title", "").strip()
            pub_ts = item.get("publishAt") or item.get("publishDate")
            if not title or not news_id:
                continue
            results.append({
                "stock_code": code,
                "title": title,
                "url": f"https://news.cnyes.com/news/id/{news_id}",
                "pub_date": _unix_to_date(pub_ts),
                "source": "鉅亨網",
            })
        except Exception:
            continue

    return results
