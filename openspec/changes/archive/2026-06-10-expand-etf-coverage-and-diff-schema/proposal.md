## Why

ETF Pipeline 目前有 7 支 ETF 仍依賴 Pocket.tw 爬蟲（公告日才更新，常數日無資料），且有 3 支 D 結尾 ETF（00984D、00982D、00983D）完全未納入追蹤清單。同時，`etf_diff_logs` 的 `change_type` 使用 IN/OUT/CLOSE/BUY/SELL/TRIM 六值，前端查詢需自行映射，增加維護成本。

## What Changes

- 新增官方 API 爬蟲支援 5 支 ETF，將其從 `pocket` 升級為 `official_api`：
  - 00983A（中信 ARK 創新）— CTBC HTML 解析
  - 00400A（國泰動能高息）— Cathay REST API（GET，stockWeights[]）
  - 00401A（摩根台灣鑫收）— Morgan XLSX 下載解析
  - 00989A（摩根美國科技）— Morgan XLSX 下載解析
- 新增 3 支 D 結尾 ETF 至 registry 並實作對應爬蟲：
  - 00984D（聯博全球非投等投資等級）— AllianceBernstein REST API
  - 00982D（富邦動態入息）— Fubon HTML 解析
  - 00983D（富邦複合收益）— Fubon HTML 解析
- 在 `etf_diff_logs` 資料表新增 `change_category` 欄位，提供四分類語意標籤（`added` / `removed` / `increased` / `decreased`），對映現有 `change_type`
- 同步更新 Python `ETF/config/etf_registry.py` 與 TypeScript `src/lib/investment/etfRegistry.ts` 清單

## Non-Goals

- 不修改現有 `change_type` 欄位（維持向後相容）
- 不追蹤 00998A（復華金融股息）官方 API（fund_code 仍待確認）
- 不對舊歷史資料回填 `change_category`
- 不修改前端顯示邏輯（`change_category` 供前端選用，不強制遷移）

## Capabilities

### New Capabilities

- `ctbc-ark-official-scraper`: 中信 ARK（00983A）從 Pocket.tw 升級到官方 HTML API，fund_code 待確認後啟用
- `cathay-etf-scraper`: 國泰（00400A）官方 REST API 爬蟲（GET stockWeights[]）
- `morgan-xlsx-scraper`: 摩根（00401A、00989A）XLSX 下載解析爬蟲（含 Referer header）
- `alliance-bernstein-scraper`: 聯博（00984D）官方 REST API 爬蟲（domesticHoldings[].holdings[]）
- `fubon-html-scraper`: 富邦（00982D、00983D）官方 HTML 爬蟲（h6 分節 tbody regex）
- `etf-diff-category-field`: `etf_diff_logs` 新增 `change_category` 欄位及 DB migration，`diff_engine` 計算時自動填入

### Modified Capabilities

- `etf-scraper-fallback-chain`: 增加 ctbc-ark、cathay、morgan、alliance-bernstein、fubon 五種 issuer 的 dispatch 路徑

## Impact

- Affected specs: 新增 6 個 capability specs，修改 `etf-scraper-fallback-chain`
- Affected code:
  - Modified:
    - ETF/scrapers/official_api_scraper.py
    - ETF/config/etf_registry.py
    - ETF/processors/diff_engine.py
    - src/lib/investment/etfRegistry.ts
  - New:
    - supabase/migrations/<timestamp>_add_diff_category.sql
