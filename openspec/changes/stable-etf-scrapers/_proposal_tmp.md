## Why

目前 4 支主動 ETF（00986A 兆豐、00987A 台新、00994A 第一金、00995A 中信）仰賴 Selenium headless Chrome 爬 Pocket.tw，速度慢且容易被反爬阻斷；元大 00990A 則依賴 `window.__NUXT__` 結構，Nuxt 版本升級即失效。各投信官網已有直接 API 可用，應優先接入以提升穩定性。

## What Changes

- **新增** 4 支投信直接 API fetcher：`_fetch_taishin`（00987A）、`_fetch_first_financial`（00994A）、`_fetch_ctbc`（00995A）、`_fetch_mega`（00986A）整合至 `ETF/scrapers/official_api_scraper.py`
- **更新** `ETF/config/etf_registry.py` 中 4 支 ETF 的 `source` 從 `pocket` 改為 `official_api`
- **更新** `src/lib/investment/etfRegistry.ts` 中對應 `dataSource` 欄位（同步）
- **新增** 元大 (00990A) Playwright 失敗後的 MoneyDJ HTML fallback，整合至 `ETF/scrapers/yuanta_scraper.py`
- Pocket.tw Selenium 爬蟲保留作備援（各投信 API 失敗時自動 fallback）

## Non-Goals

- 統一 ezmoney XLSX 來源（00981A/00988A/00403A）的替換留待下一期
- 安聯 antiforgery token 機制的重構不在本期範圍
- 不新增 MoneyDJ 作為通用第三層 fallback（僅元大專用）

## Capabilities

### New Capabilities

- `taishin-direct-api`: 台新投信 00987A 持股抓取，透過 tsit.com.tw HTML GET 取代 Selenium
- `first-financial-direct-api`: 第一金投信 00994A 持股抓取，透過 fsitc.com.tw REST API POST
- `ctbc-direct-api`: 中信投信 00995A 持股抓取，透過 ctbcinvestments.com.tw REST API POST（需 auth token）
- `mega-direct-api`: 兆豐投信 00986A 持股抓取，透過 megafunds.com.tw HTML GET 取代 Selenium
- `yuanta-moneydj-fallback`: 元大 00990A Playwright 失敗時改由 MoneyDJ HTML 補抓完整持股

### Modified Capabilities

- `yuanta-pcf-scraper`: 新增 MoneyDJ fallback 路徑，當 `window.__NUXT__` 解析失敗或持股數 < 3 時自動切換

## Impact

- Affected specs: taishin-direct-api, first-financial-direct-api, ctbc-direct-api, mega-direct-api, yuanta-moneydj-fallback, yuanta-pcf-scraper（delta）
- Affected code:
  - Modified: `ETF/scrapers/official_api_scraper.py`
  - Modified: `ETF/scrapers/yuanta_scraper.py`
  - Modified: `ETF/config/etf_registry.py`
  - Modified: `src/lib/investment/etfRegistry.ts`
