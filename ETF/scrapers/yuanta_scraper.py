"""
元大 ETF 官網 PCF Scraper — Playwright 版

元大官網 (yuantaetfs.com) 為 Nuxt SSR 應用，完整持股序列化於
window.__NUXT__.data[].pcfData.FundWeights.StockWeights，
DOM 僅顯示前 5 名。使用 Playwright headless Chromium 執行 JS 後取得完整清單。

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

_EXCHANGE_SUFFIX_RE = re.compile(r"\s+(?:TW|US|JP|HK|KP|SG|GB|DE|FR|CA|AU)\s*$", re.IGNORECASE)


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


def fetch_holdings(etf_code: str) -> pd.DataFrame:
    """從元大 ETF 官網抓取 PCF 完整持股。

    Args:
        etf_code: ETF 代號，例如 "00990A"。

    Returns:
        DataFrame，欄位：code(str), name(str), shares(int), weight(float,%)。
        錯誤或空結果均回傳空 DataFrame，不拋例外。
    """
    url = f"https://www.yuantaetfs.com/tradeInfo/pcf/{etf_code}"
    logger.info("[Yuanta] 開始抓取 %s PCF：%s", etf_code, url)

    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                try:
                    page.goto(url, wait_until="networkidle", timeout=60_000)
                except PlaywrightTimeout:
                    logger.warning("[Yuanta] %s 頁面載入逾時（60s），回傳空 DataFrame", etf_code)
                    return pd.DataFrame(columns=["code", "name", "shares", "weight"])

                nuxt_state = page.evaluate("() => window.__NUXT__ ?? null")
            finally:
                browser.close()

    except Exception as e:
        logger.warning("[Yuanta] %s Playwright 執行失敗：%s", etf_code, e)
        return pd.DataFrame(columns=["code", "name", "shares", "weight"])

    if not nuxt_state:
        logger.warning("[Yuanta] %s window.__NUXT__ 為空，回傳空 DataFrame", etf_code)
        return pd.DataFrame(columns=["code", "name", "shares", "weight"])

    stock_weights = _extract_stock_weights(nuxt_state, etf_code)
    if not stock_weights:
        logger.warning("[Yuanta] %s 找不到 pcfData.FundWeights.StockWeights，回傳空 DataFrame", etf_code)
        return pd.DataFrame(columns=["code", "name", "shares", "weight"])

    rows = []
    for s in stock_weights:
        raw_code = str(s.get("code") or "").strip()
        if not raw_code:
            continue
        weight = float(s.get("weights") or 0)
        if weight <= 0:
            continue
        name = str(s.get("name") or s.get("ename") or "").strip()
        rows.append({
            "code": _clean_code(raw_code),
            "name": name,
            "shares": _to_shares(s.get("qty")),
            "weight": weight,
        })

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
