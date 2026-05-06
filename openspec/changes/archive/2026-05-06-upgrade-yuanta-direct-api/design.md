## Context

目前 `ETF/config/etf_registry.py` 中 00990A（主動元大 AI 新經濟）的 `source` 為 `"pocket"`，透過 Pocket.tw 二手爬蟲取得資料。`multi_etf_step.py` 依 `source` 欄位派送爬蟲：`official_api` → `official_api_scraper.fetch_holdings()`；`pocket` → `pocket_scraper.scrape_holdings()`。

元大投信官網 `https://www.yuantaetfs.com/tradeInfo/pcf/00990A` 是 Nuxt SSR 應用，完整持股（53 筆）序列化於 `window.__NUXT__.data[].pcfData.FundWeights.StockWeights`，DOM 只顯示前 5 名。etf_scratch 已驗證可透過 Playwright 執行 JavaScript 後取得完整清單。

## Goals / Non-Goals

**Goals:**
- 新增 `ETF/scrapers/yuanta_scraper.py`，以 Playwright 抓取元大官網 PCF 頁面的完整持股
- 在 `official_api_scraper.py` 的 `CATALOG` 加入 00990A，dispatch 到 `yuanta_scraper`
- 將 `ETF/config/etf_registry.py` 及 `src/lib/investment/etfRegistry.ts` 的 00990A 改為 `official_api`

**Non-Goals:**
- 不修改其他 ETF 的爬蟲
- 不改動前端元件或資料庫 schema
- 不嘗試以 `requests` 靜態解析 HTML（Nuxt SSR state 需 JS 執行才完全填充）

## Decisions

### 使用 Playwright 而非 requests + HTML 解析

`window.__NUXT__` 的資料由 Nuxt client hydration 填充，靜態 HTML 中的 `<script>` 標籤版本可能只含部分資料或格式不穩定。etf_scratch 以 Puppeteer `page.evaluate(() => window.__NUXT__)` 驗證可取得 53 筆完整持股。Python 端 `unified_scraper.py` 已有 Playwright 依賴（`playwright.sync_api`），複用現有機制可降低風險。

替代方案考慮：`requests` + regex 解析 `__NUXT__` script tag — 若 Nuxt 版本升級或資料結構改變時較脆弱，且未經驗證。

### 獨立模組 `yuanta_scraper.py`（非直接嵌入 official_api_scraper）

`official_api_scraper.py` 目前全部使用純 HTTP（`urllib`），不引入 Playwright。Yuanta 需要瀏覽器環境，混入同一模組會污染職責。新增獨立 `yuanta_scraper.py`，在 `official_api_scraper.fetch_holdings()` 中以 `issuer == "yuanta"` 分支 lazy import 並呼叫。

### NUXT state 解析路徑

`window.__NUXT__.data` 是陣列，需遍歷找含 `pcfData` 的項目，再取 `pcfData.FundWeights.StockWeights`。欄位映射（參考 etf_scratch `scraper.js`）：
- `s.code` → `stock_code`（需去除交易所後綴，如 `"2330 TW"` → `"2330"`）
- `s.name` / `s.ename` → `stock_name`
- `s.qty` → `shares`（字串，需去逗號轉 int）
- `s.weights` → `weight`（float，百分比）

## Risks / Trade-offs

- **元大官網改版** → `__NUXT__` 路徑或欄位命名變更時 scraper 失效。緩解：在 Playwright evaluate 加 null-check，回傳空 list 而非拋例外，multi_etf_step 的 fallback 機制（`official_api` 空資料 → pocket fallback）自動接手。
- **Playwright 執行時間** → 比純 HTTP 慢約 5–15 秒。元大只有 1 支 ETF，整體 pipeline 影響可接受。
- **CI 環境** → GitHub Actions runner 需安裝 Chromium。已存在 `playwright install chromium` 步驟（`unified_scraper.py` 已用 Playwright），無需額外設定。
