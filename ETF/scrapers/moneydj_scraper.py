"""MoneyDJ Basic0007B ETF 持股爬蟲（curl + regex）

作為 Pocket.tw 失敗時的 fallback 來源。
使用 subprocess curl 確保 TLS 連線穩定性（requests 偶有 SSL verify 問題）。

HTML 解析策略：
  - sdate3 pattern           → 資料日期 (YYYY-MM-DD)
  - <title>                  → 基金名稱
  - CSS class col05/col06/col07 → 持股行（名稱+代號/權重/股數）

欄位對應（Basic0007B 頁面實際結構）：
  col05: 名稱含交易所後綴，如 "台積電(2330.TW)" → ticker="2330", name="台積電"
  col06: 持有比重% (weight)
  col07: 持有股數 (shares, 含逗號)

回傳 DataFrame 欄位與其他 scraper 一致：code, name, weight, shares
data_date 附加於 df.attrs["data_date"]。
"""
import html as html_lib
import logging
import re
import shutil
import subprocess
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

_MONEYDJ_URL = (
    "https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid={etfid}.TW"
)
_CHROME_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_DATE_RE = re.compile(r"sdate3.*?(\d{4}/\d{2}/\d{2})", re.DOTALL)
_TITLE_RE = re.compile(r"<title>([^<]+)</title>", re.IGNORECASE)
_ROW_RE = re.compile(
    r'class="col05"[^>]*>(.*?)</td>.*?'
    r'class="col06"[^>]*>(.*?)</td>.*?'
    r'class="col07"[^>]*>(.*?)</td>',
    re.DOTALL,
)
_TICKER_SUFFIX_RE = re.compile(r"\((\d{4,6})\.\w{2}\)")
_STRIP_PAREN_TAIL_RE = re.compile(r"\s*\([^)]+\)\s*$")
_STRIP_TAGS_RE = re.compile(r"<[^>]+>")


def fetch_html(etfid: str) -> str:
    """以 subprocess curl 抓取 MoneyDJ Basic0007B 頁面 HTML。

    Args:
        etfid: ETF 代號，例如 "00998A"

    Returns:
        原始 HTML 字串

    Raises:
        RuntimeError: curl 不在 PATH，或 curl 回傳非零 exit code
    """
    if shutil.which("curl") is None:
        raise RuntimeError("curl not found on PATH")

    url = _MONEYDJ_URL.format(etfid=etfid)
    result = subprocess.run(
        ["curl", "-s", "-A", _CHROME_UA, "--location", url],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"curl failed for {etfid}: exit code {result.returncode}"
        )
    return result.stdout


def parse_html(html_text: str, etfid: str) -> dict:
    """解析 MoneyDJ Basic0007B HTML，回傳持股資料。

    Args:
        html_text: fetch_html 回傳的 HTML 字串
        etfid:     ETF 代號，用於錯誤訊息

    Returns:
        dict with keys: etfid, fund_name, data_date (YYYY-MM-DD), holdings (dict)
        holdings 以 ticker 為 key，value: {name, weight(float), shares(int)}

    Raises:
        RuntimeError: 找不到 sdate3 日期，或解析後持股為空
    """
    date_m = _DATE_RE.search(html_text)
    if not date_m:
        raise RuntimeError(
            f"Cannot find data date (sdate3 pattern) for {etfid}"
        )
    data_date = date_m.group(1).replace("/", "-")

    fund_name = etfid
    title_m = _TITLE_RE.search(html_text)
    if title_m:
        raw = title_m.group(1).strip()
        fund_name = re.sub(
            rf"\s*[-–]\s*{re.escape(etfid)}\.TW.*$",
            "",
            raw,
            flags=re.IGNORECASE,
        ).strip() or raw

    holdings: dict = {}
    for m in _ROW_RE.finditer(html_text):
        col5 = html_lib.unescape(
            _STRIP_TAGS_RE.sub("", m.group(1)).strip()
        )
        col6 = _STRIP_TAGS_RE.sub("", m.group(2)).strip()
        col7 = _STRIP_TAGS_RE.sub("", m.group(3)).strip()

        # col05 = "台積電(2330.TW)" → extract ticker from parenthetical suffix
        ticker_m = _TICKER_SUFFIX_RE.search(col5)
        if ticker_m:
            ticker = ticker_m.group(1)
            name = _STRIP_PAREN_TAIL_RE.sub("", col5).strip()
        elif re.match(r"^\d{4,6}$", col5.strip()):
            ticker = col5.strip()
            name = ticker
        else:
            continue

        if not ticker:
            continue

        try:
            weight = float(col6.replace(",", "").replace("%", "").strip()) if col6 else 0.0
        except ValueError:
            weight = 0.0

        try:
            shares = int(col7.replace(",", "").strip()) if col7 else 0
        except ValueError:
            shares = 0

        holdings[ticker] = {"name": name, "weight": weight, "shares": shares}

    if not holdings:
        raise RuntimeError(f"No holdings found in MoneyDJ page for {etfid}")

    return {
        "etfid": etfid,
        "fund_name": fund_name,
        "data_date": data_date,
        "holdings": holdings,
    }


def scrape_moneydj(etfid: str) -> Optional[pd.DataFrame]:
    """抓取並解析 MoneyDJ 持股頁面，回傳標準化 DataFrame。

    Args:
        etfid: ETF 代號，例如 "00998A"

    Returns:
        DataFrame，欄位：code(str), name(str), weight(float), shares(int)
        df.attrs["data_date"] 存放資料日期 (YYYY-MM-DD)。
        任何例外一律 log error 後回傳 None，不 re-raise。
    """
    try:
        html_text = fetch_html(etfid)
        parsed = parse_html(html_text, etfid)

        rows = [
            {
                "code": code,
                "name": info["name"],
                "weight": info["weight"],
                "shares": info["shares"],
            }
            for code, info in parsed["holdings"].items()
        ]
        df = pd.DataFrame(rows, columns=["code", "name", "weight", "shares"])
        df.attrs["data_date"] = parsed["data_date"]
        return df
    except Exception as e:
        logger.error(f"[MoneyDJ] scrape failed for {etfid}: {e}")
        return None
