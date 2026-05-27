"""
元大 ETF 官網 PCF Scraper — Playwright 版（MoneyDJ HTML fallback）

元大官網 (yuantaetfs.com) 為 Nuxt SSR 應用，完整持股序列化於
window.__NUXT__.data[].pcfData.FundWeights.StockWeights，
DOM 僅顯示前 5 名。使用 Playwright headless Chromium 執行 JS 後取得完整清單。

MoneyDJ fallback 在以下任一條件觸發：
  1. Playwright 拋出任何例外
  2. window.__NUXT__ 為 None / 空
  3. _extract_stock_weights() 回傳 None 或 len < 3

Public interface:
  fetch_holdings(etf_code: str) -> pd.DataFrame
    columns: code(str), name(str), shares(int), weight(float,%)
    任何錯誤均回傳空 DataFrame，不拋例外。
"""

from __future__ import annotations

import logging
import re

import pandas as pd

logger = logging.getLogger(__name__)

_EXCHANGE_SUFFIX_RE = re.compile(
    r"\s+(?:TW|US|JP|HK|KP|SG|GB|DE|FR|CA|AU)\s*$", re.IGNORECASE
)
_CODE_RE = re.compile(r"^\d{4,6}$")


def _clean_code(raw: str) -> str:
    """去除交易所後綴，例如 '2330 TW' → '2330'，'LITE US' → 'LITE'。"""
    return _EXCHANGE_SUFFIX_RE.sub("", raw).strip()


def _to_shares(raw: object) -> int:
    """字串（含千分位逗號）或數字 → int；解析失敗回傳 0。"""
    if raw is None:
        return 0
    try:
        return int(str(raw).replace(",", "").strip())
    except ValueError:
        return 0


_MONEYDJ_CODE_RE = re.compile(
    r"\((\d{4,6})(?:\.\w+)?\)"
)  # parse "名稱(2330.TW)" → "2330"


def _fetch_moneydj_fallback(etf_code: str) -> pd.DataFrame:
    """MoneyDJ HTML fallback for 00990A when Playwright fails or __NUXT__ is insufficient.

    Fetches from https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid={etf_code}.TW
    with SSL verification disabled (MoneyDJ uses a non-standard cert).

    MoneyDJ table layout (col 0): "股票名稱(CODE.EXCHANGE)" — code parsed via regex.
    shares=0 is used as fallback when column 2 is unavailable.

    Returns:
        DataFrame with columns: code, name, shares, weight.
        Returns empty DataFrame on any error — never raises.
    """
    import requests
    import warnings

    try:
        url = (
            f"https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid={etf_code}.TW"
        )
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            resp = requests.get(url, headers=headers, verify=False, timeout=30)
        resp.raise_for_status()

        from bs4 import BeautifulSoup

        soup = BeautifulSoup(resp.text, "lxml")
        table = soup.find("table", class_="datalist")
        if table is None:
            logger.warning("[Yuanta] MoneyDJ %s 找不到 table.datalist", etf_code)
            return pd.DataFrame(columns=["code", "name", "shares", "weight"])

        rows = []
        for tr in table.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) < 2:
                continue
            # Column 0: "名稱(CODE.TW)" — extract 4-6 digit code from parentheses
            col0 = tds[0].get_text(strip=True)
            m = _MONEYDJ_CODE_RE.search(col0)
            if not m:
                continue
            code = m.group(1)
            # Strip code/exchange from name
            name = col0[: col0.rfind("(")].strip()
            # Column 1: weight %
            weight_raw = (
                tds[1].get_text(strip=True).replace("%", "").strip()
                if len(tds) > 1
                else ""
            )
            try:
                weight = float(weight_raw)
            except ValueError:
                continue
            # Column 2: shares (optional; 0 if missing/unparseable)
            shares = 0
            if len(tds) > 2:
                shares_raw = tds[2].get_text(strip=True).replace(",", "")
                try:
                    shares = int(shares_raw)
                except ValueError:
                    shares = 0
            rows.append(
                {"code": code, "name": name, "shares": shares, "weight": weight}
            )

        df = pd.DataFrame(rows, columns=["code", "name", "shares", "weight"])
        logger.info("[Yuanta] MoneyDJ fallback %s 取得 %d 筆持股", etf_code, len(df))
        return df

    except Exception as exc:
        logger.error("[Yuanta] MoneyDJ fallback %s 失敗：%s", etf_code, exc)
        return pd.DataFrame(columns=["code", "name", "shares", "weight"])


def fetch_holdings(etf_code: str) -> pd.DataFrame:
    """從元大 ETF 官網抓取 PCF 完整持股。若 Playwright 失敗則 fallback 到 MoneyDJ。

    Args:
        etf_code: ETF 代號，例如 "00990A"。

    Returns:
        DataFrame，欄位：code(str), name(str), shares(int), weight(float,%)。
        錯誤或空結果均回傳空 DataFrame，不拋例外。
    """
    url = f"https://www.yuantaetfs.com/tradeInfo/pcf/{etf_code}"
    logger.info("[Yuanta] 開始抓取 %s PCF：%s", etf_code, url)

    try:
        from playwright.sync_api import (
            sync_playwright,
            TimeoutError as PlaywrightTimeout,
        )

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                try:
                    page.goto(url, wait_until="networkidle", timeout=60_000)
                except PlaywrightTimeout:
                    logger.warning(
                        "[Yuanta] %s 頁面載入逾時（60s），fallback 到 MoneyDJ", etf_code
                    )
                    return _fetch_moneydj_fallback(etf_code)

                nuxt_state = page.evaluate("() => window.__NUXT__ ?? null")
            finally:
                browser.close()

    except Exception as e:
        logger.warning(
            "[Yuanta] %s Playwright 執行失敗，fallback 到 MoneyDJ：%s", etf_code, e
        )
        return _fetch_moneydj_fallback(etf_code)

    if not nuxt_state:
        logger.warning(
            "[Yuanta] %s window.__NUXT__ 為空，fallback 到 MoneyDJ", etf_code
        )
        return _fetch_moneydj_fallback(etf_code)

    stock_weights = _extract_stock_weights(nuxt_state, etf_code)
    if not stock_weights or len(stock_weights) < 3:
        count = len(stock_weights) if stock_weights else 0
        logger.warning(
            "[Yuanta] %s StockWeights 數量不足（%d 筆），fallback 到 MoneyDJ",
            etf_code,
            count,
        )
        return _fetch_moneydj_fallback(etf_code)

    rows = []
    for s in stock_weights:
        raw_code = str(s.get("code") or "").strip()
        if not raw_code:
            continue
        weight = float(s.get("weights") or 0)
        if weight <= 0:
            continue
        name = str(s.get("name") or s.get("ename") or "").strip()
        rows.append(
            {
                "code": _clean_code(raw_code),
                "name": name,
                "shares": _to_shares(s.get("qty")),
                "weight": weight,
            }
        )

    df = pd.DataFrame(rows, columns=["code", "name", "shares", "weight"])
    logger.info("[Yuanta] %s 取得 %d 筆持股", etf_code, len(df))
    return df


def _extract_stock_weights(nuxt_state: dict, etf_code: str) -> list[dict] | None:
    """從 window.__NUXT__ 遍歷 .data[] 找含 pcfData 的項目。"""
    data = nuxt_state.get("data")
    if not isinstance(data, list):
        return None

    for item in data:
        if not isinstance(item, dict):
            continue
        pcf_data = item.get("pcfData")
        if pcf_data is None:
            continue
        try:
            stock_weights = pcf_data["FundWeights"]["StockWeights"]
            if isinstance(stock_weights, list):
                return stock_weights
        except (KeyError, TypeError):
            continue

    return None
