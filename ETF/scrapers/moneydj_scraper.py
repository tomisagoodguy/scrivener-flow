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
BASE_URL = "https://www.moneydj.com/ETF/X/Basic/Basic0007b.xdjhtm"
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
            # MoneyDJ 頁面實際為 UTF-8，但 HTTP header 未宣告，需明確指定
            # 用 from_encoding 避免 lxml 自行偵測覆蓋
            return BeautifulSoup(resp.content, "lxml", from_encoding="utf-8")
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
    return None


def _extract_date_from_soup(soup: BeautifulSoup) -> Optional[str]:
    """從頁面中提取資料日期（格式 YYYY-MM-DD），取頁面所有日期中的最大值"""
    text_content = soup.get_text()

    # 取頁面所有合法日期，返回最大值（= 最新資料日期）
    # 不用 labeled pattern，因為 Big5/UTF-8 編碼問題導致關鍵字可能亂碼
    all_dates = re.findall(r"(\d{4})[/-](\d{2})[/-](\d{2})", text_content)
    valid = [
        f"{y}-{mo}-{d_val}"
        for y, mo, d_val in all_dates
        if 2020 <= int(y) <= 2030 and 1 <= int(mo) <= 12 and 1 <= int(d_val) <= 31
    ]
    if valid:
        return max(valid)

    # 最後 fallback：前一個交易日
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
    從 MoneyDJ 爬取 ETF 完整持股（最多 50 檔）。

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

    # MoneyDJ 完整持股表格格式（Basic0007b，最多 50 檔）：
    #   欄位：股東名稱(含代號，格式「股名(1234.TW)」) | 持股比例(%) | 持股張數
    # 由於頁面 Big5 編碼導致部分中文亂碼，直接以 (XXXX.TW) pattern 定位持股 table
    rows = []
    tables = soup.find_all("table")
    for table in tables:
        table_text = table.get_text()
        if not re.search(r"\(\d{4,6}\.TW\)", table_text):
            continue

        for tr in table.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) < 2:
                continue

            # 第一欄：「股名(代號.TW)」格式，如「台積電(2330.TW)」
            first_col = tds[0].get_text(strip=True)
            code_match = re.search(r"\((\d{4,6})\.TW\)", first_col)
            if not code_match:
                continue
            code_text = code_match.group(1)
            # 名稱 = 括號前的文字，去掉亂碼後只保留可辨識部分
            raw_name = first_col[:first_col.rfind("(")].strip()
            # 過濾掉替換字元 \ufffd，保留正常字元
            name_text = "".join(c for c in raw_name if c != "\ufffd").strip() or code_text

            # 第二欄：比重 %
            weight_text = ""
            for td in tds[1:]:
                t = td.get_text(strip=True).replace("%", "").replace(",", "")
                try:
                    float(t)
                    weight_text = t
                    break
                except ValueError:
                    continue

            # 第三欄（若有）：持股張數
            shares = 0
            if len(tds) >= 3:
                shares_text = tds[2].get_text(strip=True).replace(",", "")
                try:
                    shares = int(float(shares_text))
                except ValueError:
                    shares = 0

            if code_text:
                try:
                    w = float(weight_text) if weight_text else 0.0
                    rows.append({
                        "code": code_text,
                        "name": name_text,
                        "weight": w,
                        "shares": shares,
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

    MoneyDJ 格式為「359.48M(台幣)」或「3.59B(台幣)」，
    M = 百萬元，B = 十億元，都需轉換為億元。

    Returns:
        AUM in 億元，或 None
    """
    params = {"etfid": f"{etf_code}.TW"}
    logger.info(f"Fetching AUM for {etf_code}...")
    soup = _fetch_page(AUM_URL, params)
    if soup is None:
        return None

    text_content = soup.get_text()

    # MoneyDJ 格式：「359.48M(台幣)」或「3.59B(台幣)」
    m = re.search(r"([\d,]+(?:\.\d+)?)\s*([MBmb])\s*\(", text_content)
    if m:
        val = float(m.group(1).replace(",", ""))
        unit = m.group(2).upper()
        if unit == "M":
            return round(val / 100, 2)   # 百萬 → 億
        elif unit == "B":
            return round(val * 10, 2)    # 十億 → 億

    # 備用：找「XXX 億」
    patterns = [
        r"基金規模[^0-9]*?([\d,]+(?:\.\d+)?)\s*億",
        r"淨資產[^0-9]*?([\d,]+(?:\.\d+)?)\s*億",
        r"資產規模[^0-9]*?([\d,]+(?:\.\d+)?)\s*億",
    ]
    for pat in patterns:
        m2 = re.search(pat, text_content)
        if m2:
            return round(float(m2.group(1).replace(",", "")), 2)

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
