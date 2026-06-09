"""經濟日報（UDN）新聞爬蟲。

策略：抓取 UDN 搜尋頁 HTML（舊 /api/more 端點已於 2026-06 下線），
以 BeautifulSoup 解析 <h2 data-story_list> 標題與 <time class="story-list__time"> 時間。
"""

import logging
import time

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*",
    "Accept-Language": "zh-TW,zh;q=0.9",
    "Referer": "https://udn.com/",
}
_TIMEOUT = 15
_RATE_LIMIT = 0.5


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
    """抓取 UDN 搜尋頁 HTML，解析搜尋結果，失敗靜默回傳 []。"""
    url = f"https://udn.com/search/word/2/{code}"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        if resp.status_code >= 400:
            logger.warning(f"UDN HTTP {resp.status_code} for {code}")
            return []
    except Exception as e:
        logger.warning(f"UDN request failed for {code}: {e}")
        return []

    try:
        return _parse_html(resp.text, code)
    except Exception as e:
        logger.warning(f"UDN HTML parse failed for {code}: {e}")
        return []


def _parse_html(html: str, code: str) -> list[dict]:
    """解析 UDN 搜尋結果頁 HTML，抽取標題、URL、日期。

    HTML 結構：
      <h2><a href="..." title="{title}" data-story_list="list_{code}">...</a></h2>
      ...（多篇）
      <time class="story-list__time" datetime="YYYY-MM-DD HH:MM">...</time>
      ...（依序對應）
    """
    soup = BeautifulSoup(html, "lxml")

    # 取搜尋結果 h2（data-story_list 含 code 的 a 元素）
    selector = f'h2 a[data-story_list="list_{code}"]'
    anchors = soup.select(selector)

    # 取所有 story-list__time（依順序對應 anchors）
    times = soup.select("time.story-list__time")

    results: list[dict] = []
    for i, anchor in enumerate(anchors[:10]):
        title = (anchor.get("title") or anchor.get_text(strip=True)).strip()
        story_url = anchor.get("href", "")
        if not title or not story_url:
            continue

        # 從對應的 time 元素取日期
        pub_date = ""
        if i < len(times):
            t = times[i]
            dt_str = t.get("datetime") or t.get_text(strip=True)
            pub_date = dt_str[:10] if dt_str else ""

        if not pub_date:
            continue

        results.append({
            "stock_code": code,
            "title": title,
            "url": story_url,
            "pub_date": pub_date,
            "source": "經濟日報",
        })

    return results
