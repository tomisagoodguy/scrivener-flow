"""MoneyDJ 新聞爬蟲。

策略：GET MoneyDJ 個股新聞頁，用 BeautifulSoup 解析 HTML 新聞列表。
選擇器優先嘗試 table.datalist，失敗再嘗試 div.news-list a。
"""

import logging
import time
from datetime import datetime

import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.moneydj.com/",
}
_TIMEOUT = 15
_RATE_LIMIT = 0.3
_BASE_URL = "https://www.moneydj.com"


def fetch_moneydj_news(stock_codes: list[str]) -> list[dict]:
    """從 MoneyDJ 取得各股近期新聞（標題 + URL + 日期）。

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
    """爬取單支股票的 MoneyDJ 新聞，失敗靜默回傳 []。"""
    url = f"{_BASE_URL}/KMDJ/News/NewsViewer.aspx?a={code}"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT, verify=False)
        if resp.status_code >= 400:
            logger.warning(f"MoneyDJ HTTP {resp.status_code} for {code}")
            return []
        html = resp.text
    except Exception as e:
        logger.warning(f"MoneyDJ request failed for {code}: {e}")
        return []

    try:
        return _parse_html(html, code)
    except Exception as e:
        logger.warning(f"MoneyDJ parse error for {code}: {e}")
        return []


def _parse_html(html: str, code: str) -> list[dict]:
    """解析 MoneyDJ 新聞頁 HTML，優先嘗試已知 selector，降級嘗試備援。"""
    soup = BeautifulSoup(html, "html.parser")

    # 策略 A：div.IWlist li a（目前實際結構）
    links = soup.select("div.IWlist li a")
    if links:
        return _parse_iwlist_links(links, code)

    # 策略 B：table.datalist tr
    rows = soup.select("table.datalist tr")
    if rows:
        return _parse_table_rows(rows, code)

    # 策略 C：div.news-list a
    links_c = soup.select("div.news-list a")
    if links_c:
        return _parse_news_links(links_c, code)

    # 找不到任何已知結構
    logger.warning(f"MoneyDJ HTML structure changed for {code}")
    return []


def _parse_iwlist_links(links: list, code: str) -> list[dict]:
    """從 div.IWlist li a 解析新聞連結（MoneyDJ 目前實際結構）。"""
    results: list[dict] = []
    for a_tag in links[:10]:
        try:
            # 優先用 title 屬性（完整標題），fallback 用 text（可能截斷）
            title = (a_tag.get("title") or a_tag.get_text(strip=True)).strip()
            href = a_tag.get("href", "")
            if not title or not href:
                continue
            # 只取新聞 URL（/kmdj/news/ 路徑）
            if "/news/" not in href and "newsviewer" not in href:
                continue
            full_url = href if href.startswith("http") else f"{_BASE_URL}{href}"
            results.append({
                "stock_code": code,
                "title": title,
                "url": full_url,
                "pub_date": "",   # IWlist 結構無日期欄位
                "source": "MoneyDJ",
            })
        except Exception:
            continue
    return results


def _parse_table_rows(rows: list, code: str) -> list[dict]:
    """從 table.datalist tr 解析新聞列表。"""
    results: list[dict] = []
    for row in rows[:11]:  # 含可能的表頭，多取一筆
        try:
            cols = row.find_all("td")
            if len(cols) < 2:
                continue
            # 通常 cols[0]=日期，cols[1]=標題（含 <a>）
            a_tag = row.find("a")
            if not a_tag:
                continue
            title = a_tag.get_text(strip=True)
            href = a_tag.get("href", "")
            if not title or not href:
                continue
            full_url = href if href.startswith("http") else f"{_BASE_URL}{href}"
            # 日期欄（cols[0]）
            date_text = cols[0].get_text(strip=True)
            pub_date = _normalize_date(date_text)
            results.append({
                "stock_code": code,
                "title": title,
                "url": full_url,
                "pub_date": pub_date,
                "source": "MoneyDJ",
            })
            if len(results) >= 10:
                break
        except Exception:
            continue
    return results


def _parse_news_links(links: list, code: str) -> list[dict]:
    """從 div.news-list a 解析新聞連結。"""
    results: list[dict] = []
    for a_tag in links[:10]:
        try:
            title = a_tag.get_text(strip=True)
            href = a_tag.get("href", "")
            if not title or not href:
                continue
            full_url = href if href.startswith("http") else f"{_BASE_URL}{href}"
            results.append({
                "stock_code": code,
                "title": title,
                "url": full_url,
                "pub_date": "",
                "source": "MoneyDJ",
            })
        except Exception:
            continue
    return results


def _normalize_date(text: str) -> str:
    """嘗試將各種日期格式標準化為 YYYY-MM-DD；失敗回傳空字串。"""
    text = text.strip()
    # 嘗試 YYYY/MM/DD 或 YYYY-MM-DD
    for fmt in ("%Y/%m/%d", "%Y-%m-%d", "%m/%d %H:%M", "%Y/%m/%d %H:%M"):
        try:
            if fmt in ("%m/%d %H:%M",):
                # 補上年份
                dt = datetime.strptime(f"{datetime.now().year}/{text}", f"%Y/{fmt}")
            else:
                dt = datetime.strptime(text[:10], fmt[:8] if len(fmt) > 8 else fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            continue
    return text[:10] if len(text) >= 10 else ""
