## Why

00990A（主動元大 AI 新經濟）目前透過 Pocket.tw 二手爬蟲取得持股資料，更新頻率不穩定且只有精簡欄位。元大投信官網（yuantaetfs.com）提供完整 PCF 持股清單（53 筆），資料透過 Nuxt SSR 的 `window.__NUXT__` state 注入，可直接在 Python 端解析，不需額外授權。

## What Changes

- 新增 Python scraper：從 `https://www.yuantaetfs.com/tradeInfo/pcf/00990A` 以 Playwright 取得頁面後解析 `__NUXT__` state，提取 `pcfData.FundWeights.StockWeights`
- `ETF_REGISTRY`（`src/lib/investment/etfRegistry.ts`）中 00990A 的 `dataSource` 從 `'pocket'` 改為 `'official_api'`
- Python ETF pipeline 的 `unified_scraper.py` 或對應模組新增元大投信策略

## Non-Goals

- 不修改 00990A 以外的 ETF 爬蟲
- 不改變前端元件或 UI 顯示邏輯
- 不升級其他元大投信 ETF（目前 registry 中僅 00990A 為元大）

## Capabilities

### New Capabilities

- `yuanta-pcf-scraper`: 元大投信官網 PCF 頁面的 Playwright 爬蟲，解析 `__NUXT__` state 取得完整持股

### Modified Capabilities

（無 spec 層級的行為變更）

## Impact

- Affected specs:
  - New: `yuanta-pcf-scraper`
- Affected code:
  - Modified: `ETF/scrapers/unified_scraper.py`（新增元大投信分支）
  - Modified: `src/lib/investment/etfRegistry.ts`（00990A dataSource 改為 official_api）
  - New: `ETF/scrapers/yuanta_scraper.py`（獨立元大投信 scraper 模組）
