"""
復華投信 00981A 持股爬蟲

備援鏈：
  主路徑（JSON scrape）：GET ezmoney Info 頁面 → regex 萃取 data-content → HTML unescape → JSON parse
  fallback（Excel XLSX）：download_file（requests）→ xlsx_parser.parse_holdings_xlsx

主路徑不依賴 Playwright；僅 Excel fallback 路徑透過 unified_scraper.download_file 間接使用 Playwright。
"""

import html
import json
import logging
import os
import pathlib
import re
from datetime import datetime

import pandas as pd
import requests

from ETF.scrapers.unified_scraper import download_file
from ETF.parsers.xlsx_parser import parse_holdings_xlsx

logger = logging.getLogger(__name__)

# Constants
FUND_CODE = "49YTW"
BASE_URL = "https://www.ezmoney.com.tw"
INFO_URL = f"{BASE_URL}/ETF/Fund/Info?FundCode={FUND_CODE}"
EXPORT_URL = f"{BASE_URL}/ETF/Fund/AssetExcelNPOI?fundCode={FUND_CODE}"

# regex：從 raw HTML 擷取 id="DataAsset" 元素的 data-content 屬性值
_DATA_CONTENT_RE = re.compile(r'id="DataAsset"[^>]+data-content="([^"]+)"')

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


class FhTrustScraper:
    def __init__(self, output_dir: pathlib.Path) -> None:
        self.output_dir = output_dir

    # ------------------------------------------------------------------
    # 主路徑：JSON scrape（不依賴 Playwright）
    # ------------------------------------------------------------------

    def _try_json_scrape(self) -> tuple[pd.DataFrame | None, str | None]:
        """
        此路徑不依賴 Playwright。
        從 ezmoney Info 頁面的 div#DataAsset data-content 屬性直接解析持股 JSON。

        Returns:
            (df, date_str) 成功時；(None, None) 任何失敗時（已記錄 warning，不 raise）
        """
        try:
            session = requests.Session()
            session.headers.update({"User-Agent": _USER_AGENT})
            resp = session.get(INFO_URL, timeout=30, verify=False)
        except Exception as exc:
            logger.warning("JSON scrape：HTTP 請求失敗：%s", exc)
            return None, None

        if not resp.ok:
            logger.warning(
                "JSON scrape：HTTP 非 2xx（%s）URL=%s", resp.status_code, INFO_URL
            )
            return None, None

        match = _DATA_CONTENT_RE.search(resp.text)
        if not match or not match.group(1):
            logger.warning("JSON scrape：未找到 div#DataAsset data-content 屬性（URL=%s）", INFO_URL)
            return None, None

        raw_attr = match.group(1)
        if not raw_attr.strip():
            logger.warning("JSON scrape：data-content 屬性為空")
            return None, None

        try:
            unescaped = html.unescape(raw_attr)
            data: list[dict] = json.loads(unescaped)
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning("JSON scrape：JSON parse 失敗：%s", exc)
            return None, None

        # 找 AssetCode="ST"（股票持股）的 Details 陣列
        st_item = next((item for item in data if item.get("AssetCode") == "ST"), None)
        if st_item is None or not isinstance(st_item.get("Details"), list):
            logger.warning("JSON scrape：找不到 AssetCode=ST 的持股資料")
            return None, None

        details: list[dict] = st_item["Details"]
        if not details:
            logger.warning("JSON scrape：持股 Details 陣列為空")
            return None, None

        try:
            df = pd.DataFrame(
                {
                    "stock_code": str(d["DetailCode"]),
                    "stock_name": str(d["DetailName"]),
                    "shares": int(d["Share"]),
                    "weight": float(d["NavRate"]),
                }
                for d in details
            )
        except (KeyError, TypeError, ValueError) as exc:
            logger.warning("JSON scrape：DataFrame 轉換失敗：%s", exc)
            return None, None

        # 解析資料日期（TranDate: "2026-05-08T00:00:00"）
        raw_date: str = details[0].get("TranDate", "")
        try:
            date_str = datetime.fromisoformat(raw_date).strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            logger.warning("JSON scrape：無法解析 TranDate=%r，使用今日日期", raw_date)
            date_str = datetime.now().strftime("%Y-%m-%d")

        logger.info(
            "JSON scrape 成功：%d 筆持股，資料日期 %s", len(df), date_str
        )
        return df, date_str

    # ------------------------------------------------------------------
    # 備援路徑：Excel XLSX（原有邏輯，保留向後相容）
    # ------------------------------------------------------------------

    def _try_excel_scrape(self) -> tuple[pd.DataFrame | None, str | None]:
        """
        原有 Excel 下載路徑（fallback）。
        透過 unified_scraper.download_file 下載 XLSX，再交給 xlsx_parser 解析。
        """
        timestamp = int(datetime.now().timestamp())
        tmp_xlsx = self.output_dir / f"raw_00981A_{timestamp}.xlsx"

        if not download_file(EXPORT_URL, tmp_xlsx):
            logger.error("Excel fallback：下載失敗。")
            return None, None

        df, data_date = parse_holdings_xlsx(tmp_xlsx)

        if df.empty or not data_date:
            logger.error("Excel fallback：解析失敗或資料為空。檔案保留於：%s", tmp_xlsx)
            return None, None

        # 將暫存檔重新命名為標準化名稱
        final_xlsx = self.output_dir / f"00981A_raw_{data_date}.xlsx"
        if final_xlsx.exists():
            logger.info("Raw file %s 已存在，覆寫。", final_xlsx)
            os.remove(final_xlsx)
        tmp_xlsx.rename(final_xlsx)
        logger.info("Raw file 儲存至：%s", final_xlsx)

        return df, data_date

    # ------------------------------------------------------------------
    # 公開介面
    # ------------------------------------------------------------------

    def run(self) -> tuple[pd.DataFrame | None, str | None]:
        """
        下載並解析 00981A 持股資料。

        備援鏈：
          1. JSON scrape（主路徑，不依賴 Playwright）
          2. Excel XLSX fallback

        Returns:
            (DataFrame, date_str) 成功時；(None, None) 兩路均失敗時
        """
        logger.info("Starting Scraper for 00981A (%s)...", FUND_CODE)

        # 主路徑：JSON scrape
        df, date_str = self._try_json_scrape()
        if df is not None and date_str is not None:
            return df, date_str

        logger.info("JSON scrape 失敗，切換至 Excel fallback...")

        # fallback：Excel XLSX
        df, date_str = self._try_excel_scrape()
        if df is not None and date_str is not None:
            return df, date_str

        logger.error("JSON scrape 與 Excel fallback 均失敗，回傳 (None, None)。")
        return None, None
