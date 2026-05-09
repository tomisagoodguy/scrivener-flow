## 1. 分析與準備

- [x] 1.1 閱讀 `ETF/scrapers/fhtrust_scraper.py`，確認現有 Excel 下載路徑的輸入輸出合約（回傳 `(DataFrame, date_str)` 格式）
- [x] 1.2 手動對 `https://www.ezmoney.com.tw/ETF/Fund/Info?FundCode=49YTW` 發送 GET 請求，檢查 `div#DataAsset` 的 `data-content` 屬性實際格式（JSON 結構、日期欄位名稱、持股欄位名稱）

## 2. 實作 JSON 萃取路徑

- [x] 2.1 [P] 在 `ETF/scrapers/fhtrust_scraper.py` 新增常數：`INFO_URL = "https://www.ezmoney.com.tw/ETF/Fund/Info?FundCode=49YTW"`
- [x] 2.2 實作 `FhTrustScraper._try_json_scrape(self) -> tuple[pd.DataFrame | None, str | None]`：使用 `requests.Session` 取得 HTML 頁面（HTML page JSON extraction）；以 regex 萃取 `div#DataAsset` 的 `data-content` 屬性（regex-based attribute extraction）；HTML unescape 後 JSON parse；轉換為 DataFrame（含 `stock_code`、`stock_name`、`shares`、`weight` 欄位）並回傳 `(df, date_str)`
- [x] 2.3 在 `_try_json_scrape()` 加入防禦：當 `div#DataAsset` 不存在、`data-content` 為空、HTTP 非 2xx、JSON parse 失敗任一情境時，記錄 `logger.warning` 並回傳 `(None, None)`，不得 raise（missing or empty data-content attribute / non-200 HTTP response）

## 3. 整合備援鏈

- [x] 3.1 修改 `FhTrustScraper.run()` 方法：先呼叫 `_try_json_scrape()`；若回傳 `(None, None)` 則 fallback 至原有的 Excel 下載路徑（Excel XLSX as fallback）；兩者均失敗時回傳 `(None, None)` 不 raise（both paths fail）
- [x] 3.2 確認 `ETF/pipeline/steps/scrape_step.py` 的 `_try_fhtrust_scraper()` 呼叫介面不變，無需修改 `ScrapeStep`

## 4. 驗證 no-Playwright 要求

- [x] 4.1 [P] 確認 `FhTrustScraper._try_json_scrape()` 不 import 也不呼叫任何 Playwright 相關模組（no Playwright dependency for JSON path）；在函式頂部加入 comment 說明此路徑不依賴 Playwright

## 5. 測試

- [x] 5.1 [P] 在 `ETF/tests/` 新增 `test_fhtrust_scraper_json.py`，使用 `unittest.mock.patch` mock `requests.Session.get`，涵蓋以下情境：
  - 成功萃取：HTML 含 `div#DataAsset data-content="..."` → 回傳非空 DataFrame（HTML page JSON extraction）
  - 屬性缺失：HTML 無 `div#DataAsset` → 回傳 `(None, None)`（missing or empty data-content attribute）
  - HTTP 非 2xx：mock 回 status 503 → 回傳 `(None, None)`（non-200 HTTP response）
  - JSON 路徑失敗後 Excel fallback 被呼叫：patch `download_file` 確認其被呼叫一次（Excel XLSX as fallback）
- [x] 5.2 執行 `uv run pytest ETF/tests/test_fhtrust_scraper_json.py -v`，確認全部測試通過

## 6. 收尾

- [x] 6.1 [P] 在 `ETF/scrapers/fhtrust_scraper.py` 的 module docstring 中更新備援鏈說明：主路徑 = JSON scrape，fallback = Excel XLSX
- [x] 6.2 [P] 在 `ETF/scrapers/unified_scraper.py` 的 `download_file_playwright` docstring 加註：此函式為 Excel fallback 專用，JSON scrape 路徑不依賴此函式
