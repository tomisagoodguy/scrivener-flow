"""
Pocket.tw ETF 持股爬蟲

通用爬蟲，支援全部主動式 ETF（00980A/00982A/00984A/00985A/00987A/
00991A/00992A/00993A/00994A/00995A 等）。

使用 Selenium headless Chrome 渲染 JS 後解析表格，
輸出統一格式 DataFrame（欄位：code, name, weight, shares）。
"""

import logging
import re
from datetime import date
from io import StringIO
from typing import Optional

import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

logger = logging.getLogger(__name__)

BASE_URL = "https://www.pocket.tw/etf/tw/{etf_code}/fundholding"
PAGE_WAIT_TIMEOUT = 35  # seconds


def _build_driver() -> webdriver.Chrome:
    """建立 headless Chrome WebDriver"""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    return webdriver.Chrome(service=Service(), options=options)


def scrape_holdings(etf_code: str) -> tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    從 Pocket.tw 爬取指定 ETF 的持股資料。

    Args:
        etf_code: ETF 代號，可含或不含 A 後綴（如 "00982A" 或 "00982"）

    Returns:
        (DataFrame | None, data_date | None)
        DataFrame 欄位：code（str）、name（str）、weight（float）、shares（int，單位：股）
        data_date 格式：YYYY/MM/DD；失敗時回傳 (None, None)
    """
    # 自動補 A 後綴
    formatted_code = etf_code if etf_code.endswith("A") else f"{etf_code}A"
    url = BASE_URL.format(etf_code=formatted_code)

    driver = None
    try:
        driver = _build_driver()
        driver.get(url)

        wait = WebDriverWait(driver, PAGE_WAIT_TIMEOUT)
        try:
            wait.until(EC.presence_of_element_located((By.XPATH, "//table//tr[td or th]")))
        except Exception:
            logger.warning(f"[{formatted_code}] 頁面表格未出現，可能無資料")
            return None, None

        # 擷取資料日期
        data_date: Optional[str] = None
        try:
            date_elem = driver.find_element(By.XPATH, "//*[contains(text(), '資料日期')]")
            raw = date_elem.text.replace("資料日期：", "").strip()
            data_date = raw if raw else None
        except Exception:
            pass

        if data_date is None:
            data_date = date.today().strftime("%Y/%m/%d")

        # 解析頁面所有表格，找含「名稱」和「權重」的那張
        tables = pd.read_html(StringIO(driver.page_source))
        target_df: Optional[pd.DataFrame] = None
        for table in tables:
            cols = [str(c) for c in table.columns]
            if any("名稱" in c for c in cols) and any("權重" in c or "比例" in c for c in cols):
                target_df = table
                break

        if target_df is None:
            logger.warning(f"[{formatted_code}] 找不到持股表格")
            return None, data_date

        # 自動辨識欄位索引
        col_map: dict[str, int] = {}
        for i, col_name in enumerate(target_df.columns):
            c = str(col_name)
            if ("代號" in c or "代碼" in c) and "代號" not in col_map:
                col_map["代號"] = i
            elif "名稱" in c and "名稱" not in col_map:
                col_map["名稱"] = i
            elif ("權重" in c or "比例" in c) and "權重" not in col_map:
                col_map["權重"] = i
            elif ("持有" in c or "股數" in c) and "持有數" not in col_map:
                col_map["持有數"] = i

        if "代號" not in col_map or "名稱" not in col_map or "權重" not in col_map:
            logger.warning(f"[{formatted_code}] 表格欄位辨識失敗: {list(target_df.columns)}")
            return None, data_date

        raw_cols = list(col_map.values())
        result = target_df.iloc[:, raw_cols].copy()
        result.columns = list(col_map.keys())

        # 僅保留 4 位數數字股票代號
        result["代號"] = result["代號"].astype(str).str.strip()
        result = result[result["代號"].str.match(r"^\d{4}$")].copy()

        if result.empty:
            logger.warning(f"[{formatted_code}] 過濾 4 位數代號後無資料")
            return None, data_date

        # 數值轉換
        result["權重"] = pd.to_numeric(
            result["權重"].astype(str).str.replace("%", "", regex=False),
            errors="coerce",
        )

        if "持有數" in result.columns:
            result["持有數"] = (
                pd.to_numeric(
                    result["持有數"].astype(str).str.replace(",", "", regex=False),
                    errors="coerce",
                )
                .fillna(0)
                .astype(int)
            )
        else:
            result["持有數"] = 0

        # 輸出統一欄位：code, name, weight, shares
        final = pd.DataFrame(
            {
                "code": result["代號"].values,
                "name": result["名稱"].values,
                "weight": result["權重"].values,
                "shares": result["持有數"].values,
            }
        )

        logger.info(f"[{formatted_code}] 爬取成功，{len(final)} 筆，資料日期 {data_date}")
        return final, data_date

    except Exception as e:
        logger.error(f"[{formatted_code}] 爬取錯誤: {e}")
        return None, None
    finally:
        if driver:
            driver.quit()
