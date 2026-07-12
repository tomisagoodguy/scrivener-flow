## Why

00995A（中信台灣卓越）的 REST 爬蟲 `_fetch_ctbc()` 存在兩個已實證的缺陷，導致其每日靜默 fallback 到 Pocket.tw（公告日才更新、且無 NAV）；00400A（國泰動能高息）的持股正常但 NAV/AUM 一直缺漏，前端折溢價（premium_pct）無法計算。2026-07-12 已對兩家官方 API 完成實測，確認修復路徑與欄位（不臆測 key），應趁驗證結果新鮮時整合。

## What Changes

- **修復 `_fetch_ctbc()`（00995A 持股）**：
  - `StartDate` 傳空字串會使 API 回 `ResultCode: 1` 與空資料（實測確認），改為帶入查詢日期（外部指定日期或台北時區最近交易日）。
  - 回應解析 key 與實際回應結構不符：實際結構是 `FundAssetsDetail` 為 section 陣列（`Code == "STOCK"` 者內含 `Data` 清單），每筆持股欄位為 `code_`、`name_`、`weights_`、`qty_`（`qty_` 含千分位逗號需清洗）；現行程式碼誤用 `assetCode`/`stockCode`/`stockName`/`shares`/`weight`，導致永遠解析出 0 筆。
- **`_fetch_ctbc()` 新增資產摘要抽取（00995A NAV/AUM）**：同一份回應的 `FundAssets[0]` 含中文 key `基金淨資產`（aum）、`基金每單位淨值`（nav）、`基金在外流通單位數`（units）與 `NAV_DT`（nav_date，ISO 格式含 `T` 需截斷），經 `_fund_assets_or_none()` 與 `_check_aum_nav_units_consistency()` 回傳，dispatch 分組從「僅持股」移至「帶基金資產摘要」。
- **`_fetch_cathay()` 補上 `GetETFAssets` 資產摘要（00400A NAV/AUM）**：`GET cwapi.cathaysite.com.tw/api/ETF/GetETFAssets?fundCode=EA` 已實測回傳 `fundNav`（實為基金總淨資產＝aum，命名陷阱）、`fundPerNav`（每單位淨值＝nav）、`fundOutstandingShares`（units）、`preDate`（nav_date，`YYYY/MM/DD` 需轉 dash 格式）。此為既有 `cathay-etf-scraper` spec 已載明但實作未跟上的 drift 收斂。
- **放寬 `etf-fund-asset-sync` 的「不得發額外 HTTP 請求」條款**：國泰持股端點（`GetIndexStockWeights`）不含資產摘要，必須允許對「持股回應不含摘要的來源」發出一次輕量補充請求；摘要請求失敗不得影響持股解析。
- **文件更新**：ETF/CLAUDE.md 的「NAV 覆蓋現況」表——ctbc（REST）與 cathay 自「NAV 未接清單」移入已接清單；修正「cathay REST 無 NAV」的過時敘述（`GetETFAssets` 存在且可用）。

## Capabilities

### New Capabilities

- `ctbc-rest-etf-scraper`: 00995A 經中信兩段式 auth-token REST API 取得持股與基金資產摘要的正確行為（查詢日期、回應解析結構、資產摘要欄位對映、失敗 fallback）。現行主 specs 無涵蓋 00995A REST 行為的 capability（僅 `ctbc-html-etf-scraper` 對 00983A 的 HTML 路徑有規範）。

### Modified Capabilities

- `cathay-etf-scraper`: 既有 requirement 已要求呼叫 `GetETFAssets` 但欄位對映未定義且實作缺席；本次以實測欄位（`fundNav`=aum、`fundPerNav`=nav、`fundOutstandingShares`=units、`preDate`=nav_date）精確化該 requirement。
- `etf-fund-asset-sync`: 「資產摘要 SHALL 從持股同一份回應抽取、不得發額外 HTTP 請求」放寬為：持股回應含摘要者維持原規則；持股回應不含摘要的來源允許一次補充請求，且補充請求失敗不影響持股解析。

## Impact

- Affected specs: `ctbc-rest-etf-scraper`（新增）、`cathay-etf-scraper`（修改）、`etf-fund-asset-sync`（修改）
- Affected code:
  - Modified: ETF/scrapers/official_api_scraper.py（`_fetch_ctbc`、`_fetch_cathay`、`_dispatch` 分組）
  - Modified: ETF/CLAUDE.md（NAV 覆蓋現況表）
  - Modified: ETF/tests/test_new_scrapers.py（新增 ctbc REST 解析與 cathay 資產摘要的單元測試，mock 回應 fixture）
- 不動 ETF/config/etf_registry.py 與 src/lib/investment/etfRegistry.ts（00995A/00400A 的 source 已是 official_api）
- 下游 `AumSyncStep`/`etf_aum_series` 無 schema 變更，僅新增兩支 ETF 的資料覆蓋
