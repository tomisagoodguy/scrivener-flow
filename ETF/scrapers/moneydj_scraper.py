"""
MoneyDJ ETF 持股爬蟲

適用於 00980A (野村智慧優選) 和 00991A (復華未來50)。
MoneyDJ 提供統一的 HTML 持股表格，格式為：
  https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid={code}.TW
"""

import logging
import time
import re
from datetime import date, timedelta
from typing import Optional, Tuple

import requests
import pandas as pd
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
BASE_URL = "https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm"
AUM_URL = "https://www.moneydj.com/ETF/X/Basic/Basic0001.xdjhtm"
SECTOR_URL = "https://www.moneydj.com/ETF/X/Basic/Basic0006.xdjhtm"

MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds


def _get_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT})
    return s


def _fetch_page(url: str, params: dict) -> Optional[BeautifulSoup]:
    """帶重試機制的頁面抓取"""
    session = _get_session()
    for attempt in range(MAX_RETRIES):
        try:
            resp = session.get(url, params=params, timeout=30, verify=False)
            resp.raise_for_status()
            resp.encoding = "utf-8"
            return BeautifulSoup(resp.text, "lxml")
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
    return None


def _extract_date_from_soup(soup: BeautifulSoup) -> Optional[str]:
    """從頁面中提取資料日期（格式 YYYY-MM-DD）"""
    # MoneyDJ 通常在頁面某處顯示「資料日期：YYYY/MM/DD」
    text_content = soup.get_text()
    patterns = [
        r"資料日期[：:]\s*(\d{4})[/-](\d{2})[/-](\d{2})",
        r"基準日[：:]\s*(\d{4})[/-](\d{2})[/-](\d{2})",
        r"(\d{4})/(\d{2})/(\d{2})",  # fallback: first date-like string
    ]
    for pat in patterns:
        m = re.search(pat, text_content)
        if m:
            y, mo, d_val = m.group(1), m.group(2), m.group(3)
            # 簡單驗證
            if 2020 <= int(y) <= 2030 and 1 <= int(mo) <= 12 and 1 <= int(d_val) <= 31:
                return f"{y}-{mo}-{d_val}"
    # 最後 fallback：前一個交易日（週末時回推到週五）
    today = date.today()
    offset = 1
    if today.weekday() == 0:  # Monday
        offset = 3
    elif today.weekday() == 6:  # Sunday
        offset = 2
    fallback = today - timedelta(days=offset)
    logger.warning(f"Could not extract date from page, using fallback: {fallback}")
    return fallback.strftime("%Y-%m-%d")


def scrape_holdings(etf_code: str) -> Tuple[pd.DataFrame, Optional[str]]:
    """
    從 MoneyDJ 爬取 ETF 前10大持股。

    Args:
        etf_code: 如 "00980A" 或 "00991A"

    Returns:
        (DataFrame with columns [code, name, weight], data_date_str)
    """
    params = {"etfid": f"{etf_code}.TW"}
    logger.info(f"Fetching holdings for {etf_code} from MoneyDJ...")
    soup = _fetch_page(BASE_URL, params)
    if soup is None:
        logger.error(f"Failed to fetch holdings page for {etf_code}")
        return pd.DataFrame(), None

    data_date = _extract_date_from_soup(soup)

    # 找持股表格：MoneyDJ 前10大持股表格 class 含 "et-tbody"
    # 或直接找包含 "股票代號" 的 table
    rows = []
    tables = soup.find_all("table")
    for table in tables:
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        header_text = " ".join(headers)
        if "代號" in header_text or "股票" in header_text or "名稱" in header_text:
            for tr in table.find_all("tr")[1:]:  # skip header row
                tds = tr.find_all("td")
                if len(tds) < 3:
                    continue
                # 嘗試從不同欄位位置抽取代號、名稱、比重
                # MoneyDJ 格式通常是：排名 | 股票代號 | 股票名稱 | 持股比例
                code_text = ""
                name_text = ""
                weight_text = ""

                for i, td in enumerate(tds):
                    t = td.get_text(strip=True)
                    # 找股票代號：4-5位數字
                    if re.match(r"^\d{4,6}$", t):
                        code_text = t
                    # 找比重：含 % 或小數點的數字
                    elif re.match(r"^\d{1,3}\.\d+%?$", t) and not weight_text:
                        weight_text = t.replace("%", "")
                    # 找名稱：中文字元 + 可能有英文
                    elif re.search(r"[\u4e00-\u9fff]", t) and not name_text and len(t) >= 2:
                        name_text = t

                if code_text and name_text:
                    try:
                        w = float(weight_text) if weight_text else 0.0
                        rows.append({
                            "code": code_text,
                            "name": name_text,
                            "weight": w,
                            "shares": 0,  # MoneyDJ 不提供股數，設為 0
                        })
                    except ValueError:
                        continue
            if rows:
                break

    if not rows:
        logger.error(f"Could not parse holdings table for {etf_code}")
        return pd.DataFrame(), data_date

    df = pd.DataFrame(rows).drop_duplicates(subset=["code"])
    logger.info(f"Parsed {len(df)} holdings for {etf_code} on {data_date}")
    return df, data_date


def scrape_aum(etf_code: str) -> Optional[float]:
    """
    從 MoneyDJ 爬取 ETF AUM（億元台幣）。

    Returns:
        AUM in 億元，或 None
    """
    params = {"etfid": f"{etf_code}.TW"}
    logger.info(f"Fetching AUM for {etf_code}...")
    soup = _fetch_page(AUM_URL, params)
    if soup is None:
        return None

    text_content = soup.get_text()
    # 找「基金規模」或「淨資產」後面的數字（億元）
    patterns = [
        r"基金規模[^0-9]*?([\d,]+(?:\.\d+)?)\s*億",
        r"淨資產[^0-9]*?([\d,]+(?:\.\d+)?)\s*億",
        r"資產規模[^0-9]*?([\d,]+(?:\.\d+)?)\s*億",
        # 備用：找「XXX 百萬」並轉換
        r"基金規模[^0-9]*?([\d,]+(?:\.\d+)?)\s*百萬",
    ]
    for i, pat in enumerate(patterns):
        m = re.search(pat, text_content)
        if m:
            val_str = m.group(1).replace(",", "")
            val = float(val_str)
            if i == 3:  # 百萬 → 億
                val = val / 100
            return round(val, 2)

    logger.warning(f"Could not extract AUM for {etf_code}")
    return None


def scrape_sectors(etf_code: str) -> list:
    """
    從 MoneyDJ 爬取 ETF 產業分布。

    Returns:
        list of {"sector_name": str, "weight": float}
    """
    params = {"etfid": f"{etf_code}.TW"}
    logger.info(f"Fetching sectors for {etf_code}...")
    soup = _fetch_page(SECTOR_URL, params)
    if soup is None:
        return []

    rows = []
    tables = soup.find_all("table")
    for table in tables:
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        header_text = " ".join(headers)
        if "產業" in header_text or "類股" in header_text or "類別" in header_text:
            for tr in table.find_all("tr")[1:]:
                tds = tr.find_all("td")
                if len(tds) < 2:
                    continue
                sector_name = tds[0].get_text(strip=True)
                weight_text = ""
                for td in tds[1:]:
                    t = td.get_text(strip=True).replace("%", "")
                    try:
                        float(t)
                        weight_text = t
                        break
                    except ValueError:
                        continue
                if sector_name and weight_text:
                    try:
                        rows.append({
                            "sector_name": sector_name,
                            "weight": float(weight_text),
                        })
                    except ValueError:
                        continue
            if rows:
                break

    logger.info(f"Parsed {len(rows)} sectors for {etf_code}")
    return rows
