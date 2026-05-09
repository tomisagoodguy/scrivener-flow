## Why

`FhTrustScraper` 目前需要透過 `unified_scraper.py` 下載 Excel 檔再交給 `xlsx_parser.py` 解析，流程包含兩段 302 redirect bot 保護、openpyxl 解析、暫存檔管理等多個脆弱環節，是 Pipeline 最常失敗的入口之一。ezmoney.com.tw 的同一頁面（`/ETF/Fund/Info?FundCode=49YTW`）已在 HTML `<div id="DataAsset" data-content="...">` 屬性中內嵌完整的 JSON 持股資料，直接解析即可省去 Excel 下載環節。

## What Changes

- `FhTrustScraper` 新增 `_try_json_scrape()` 方法：以 `requests.Session` 抓取 HTML 頁面，regex 萃取 `data-content` 屬性，HTML unescape 後 JSON parse，直接回傳結構化持股 DataFrame 與資料日期
- 原 Excel 下載路徑（`download_file` → `xlsx_parser`）降為 fallback，保留向後相容性
- 備援鏈變為：JSON scrape → Excel XLSX fallback（`unified_scraper` + `xlsx_parser`）
- 移除對 `playwright` fallback 的依賴（JSON 路徑不需要）

## Capabilities

### New Capabilities

- `981a-json-scrape`: 從 ezmoney HTML `data-content` 屬性萃取 00981A 持股 JSON，替代 Excel 下載作為主要取資料方式

### Modified Capabilities

（無需修改現有 spec）

## Impact

- Affected specs: `981a-json-scrape`（新建）
- Affected code:
  - Modified: `ETF/scrapers/fhtrust_scraper.py`
  - Modified: `ETF/scrapers/unified_scraper.py`（移除或標記 Playwright 依賴為非必要）
  - Unchanged: `ETF/pipeline/steps/scrape_step.py`（備援鏈介面不變，`_try_fhtrust_scraper` 呼叫方式不變）
