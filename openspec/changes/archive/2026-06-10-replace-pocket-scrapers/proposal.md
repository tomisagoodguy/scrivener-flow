## Why

目前 5 支 ETF（00400A、00401A、00983A、00989A 及部分的 00996A）仍依賴 Pocket.tw 爬蟲，而 Pocket.tw 僅於官方公告日更新，導致資料停滯數天、持股 diff 無法每日產生。TW_Active_Tracker 參考專案已驗證這 5 支 ETF 均有可用的官方 API 或 HTML 頁面，可直接替換。

## What Changes

- 新增 `_fetch_jpm()` 爬蟲：下載摩根投信 XLSX（00401A、00989A），使用 openpyxl 解析，不依賴 Pocket
- 新增 `_fetch_cathay()` 爬蟲：呼叫國泰 REST API（00400A），`fundCode=EA`，純 GET 無需 auth
- 新增 `_fetch_ctbc_html()` 爬蟲：解析中信 ASP.NET HTML 持股頁（00983A），與已有的 `_fetch_ctbc()` auth API（00995A）並存
- 修正 `CATALOG["00996A"]["fund_id"]`：補上兆豐的 `fund_id=23`，讓現有 `_fetch_mega()` 能正常運作
- 更新 `ETF/config/etf_registry.py` 與 `src/lib/investment/etfRegistry.ts`：將上述 4 支從 `pocket` 改為 `official_api`
- `00998A`（復華金融股息）暫維持 `pocket`，fund_code 未確認，排除本次範疇

## Non-Goals

- 不新增 B 類（擴展 ETF 清單）或 C 類（diff schema 重構）
- 不修改 `multi_etf_step.py` 的呼叫邏輯（`fetch_holdings()` 介面不變）
- 不處理 00998A（復華第二檔）的 fhtrust fund_code 研究

## Capabilities

### New Capabilities

- `jpm-etf-scraper`: 摩根投信 XLSX 持股爬蟲，支援 00401A（台灣鑫收）與 00989A（美國科技）
- `cathay-etf-scraper`: 國泰投信 REST API 持股爬蟲，支援 00400A（動能高息）
- `ctbc-html-etf-scraper`: 中信投信 ASP.NET HTML 持股爬蟲，支援 00983A（ARK創新）

### Modified Capabilities

- `etf-scraper-fallback-chain`: 00400A、00401A、00983A、00989A 改走 official_api 路徑；00996A 的 `fund_id` 補齊後不再 fallback pocket

## Impact

- Affected specs: 新增 3 個 capability specs；`etf-scraper-fallback-chain` 需 delta spec
- Affected code:
  - Modified: `ETF/scrapers/official_api_scraper.py`, `ETF/config/etf_registry.py`, `src/lib/investment/etfRegistry.ts`
  - New: (none，所有新爬蟲函式加入現有 `official_api_scraper.py`)
  - Removed: (none，pocket_scraper.py 保留供 00998A 使用)
