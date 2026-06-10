## 1. DB Migration — etf_diff_logs change_category 欄位

- [x] 1.1 新增 `supabase/migrations/<timestamp>_add_diff_category.sql`，執行 `ALTER TABLE etf_diff_logs ADD COLUMN IF NOT EXISTS change_category VARCHAR(20)`，驗證 migration 是 idempotent（etf_diff_logs table has change_category column）

## 2. diff_engine — 計算 change_category

- [x] 2.1 在 `ETF/processors/diff_engine.py` 的 `compute_diff()` 每個 log dict 中新增 `change_category` 鍵，依映射表填入值：IN→added、OUT/CLOSE→removed、BUY→increased、SELL/TRIM→decreased（diff_engine computes change_category for every log entry）
- [x] 2.2 確認 `compute_diff()` 回傳的所有六種 `change_type` 皆有正確的 `change_category` 對應值（mapping table 驗證）

## 3. sql_storage — 持久化 change_category

- [x] 3.1 在 `ETF/database/sql_storage.py` 的 `save_diff_logs()` UPSERT 欄位清單加入 `change_category`，確保新寫入的列有該欄位（sql_storage persists change_category to etf_diff_logs）

## 4. [P] 新增 Cathay 官方 REST API 爬蟲（00400A）

- [x] 4.1 在 `ETF/scrapers/official_api_scraper.py` 新增 `_fetch_cathay(fund_code)` 函式：GET Cathay REST 端點，解析 `stockWeights[]` 回傳 `[{code, name, shares, weight_pct}]`（Cathay ETF holdings fetched via official REST API）
- [x] 4.2 在 CATALOG 新增 `"00400A": {"issuer": "cathay", ...}` 條目（含確認後的端點參數）
- [x] 4.3 在 `_dispatch()` 加入 `cathay` 分支，呼叫 `_fetch_cathay()`
- [x] 4.4 更新 `ETF/config/etf_registry.py` 將 00400A 的 `source` 改為 `"official_api"`
- [x] 4.5 更新 `src/lib/investment/etfRegistry.ts` 將 00400A 的 `dataSource` 改為 `"official_api"`

## 5. [P] 新增 Morgan XLSX 爬蟲（00401A、00989A）

- [x] 5.1 在 `ETF/scrapers/official_api_scraper.py` 新增 `_fetch_morgan(fund_code)` 函式：帶 `Referer` header GET 下載 XLSX，以 openpyxl 解析，過濾 `Record Type = "D"` 列，回傳持股清單（Morgan ETF holdings fetched via XLSX download）
- [x] 5.2 在 CATALOG 新增 `"00401A"` 和 `"00989A"` 條目，`issuer: "morgan"`，含各自的 XLSX URL 參數
- [x] 5.3 在 `_dispatch()` 加入 `morgan` 分支
- [x] 5.4 更新 `ETF/config/etf_registry.py` 將 00401A、00989A 的 `source` 改為 `"official_api"`
- [x] 5.5 更新 `src/lib/investment/etfRegistry.ts` 同步更新 00401A、00989A 的 `dataSource`

## 6. [P] 新增 CTBC ARK API 設定（00983A）

- [x] 6.1 確認 00983A 的 CTBC FID（瀏覽 `https://www.ctbcinvestments.com.tw/` Network tab，確認 ETFHoldingWeight 請求的 FID 值）（CTBC ARK ETF holdings fetched via official API）
- [x] 6.2 若 FID 確認：在 CATALOG 新增 `"00983A": {"issuer": "ctbc", "fund_code": "<FID>"}` 條目（`_fetch_ctbc()` 已存在，無需新函式）
- [x] 6.3 若 FID 確認：更新 `ETF/config/etf_registry.py` 和 `src/lib/investment/etfRegistry.ts` 將 00983A 的 source 改為 `"official_api"`

## 7. [P] 新增 AllianceBernstein REST API 爬蟲 + 00984D（聯博）

- [x] 7.1 在 `ETF/scrapers/official_api_scraper.py` 新增 `_fetch_alliance_bernstein(fund_code)` 函式：GET AB API，解析 `domesticHoldings[].holdings[]`，允許非 4 位數 code（ISIN 等）（AllianceBernstein ETF 00984D added to registry and fetched via REST API）
- [x] 7.2 在 CATALOG 新增 `"00984D": {"issuer": "alliance_bernstein", "fund_code": "<fund_code>"}` 條目
- [x] 7.3 在 `_dispatch()` 加入 `alliance_bernstein` 分支
- [x] 7.4 在 `ETF/config/etf_registry.py` 新增 00984D 的 `EtfEntry`（source: "official_api"）
- [x] 7.5 在 `src/lib/investment/etfRegistry.ts` 新增 00984D 的 `EtfRegistryEntry`（含名稱、顏色）

## 8. [P] 新增 Fubon HTML 爬蟲 + 00982D、00983D（富邦）

- [x] 8.1 在 `ETF/scrapers/official_api_scraper.py` 新增 `_fetch_fubon(fund_code)` 函式：BeautifulSoup 解析官網持股頁，找 `<h6>` 含「持股明細」後讀取 `<tbody>`，欄位順序代號/名稱/股數/權重（Fubon ETF 00982D and 00983D added to registry and fetched via HTML parsing）
- [x] 8.2 在 CATALOG 新增 `"00982D"` 和 `"00983D"` 條目，`issuer: "fubon"`，含各自的官網 URL 或 fund_code 參數
- [x] 8.3 在 `_dispatch()` 加入 `fubon` 分支
- [x] 8.4 在 `ETF/config/etf_registry.py` 新增 00982D、00983D 的 `EtfEntry`（source: "official_api"）
- [x] 8.5 在 `src/lib/investment/etfRegistry.ts` 新增 00982D、00983D 的 `EtfRegistryEntry`（含名稱、顏色）

## 9. fallback-chain — 更新 dispatch issuer 清單

- [x] 9.1 確認 `_dispatch()` 的 issuer 分支涵蓋所有新增 issuer：cathay、morgan、alliance_bernstein、fubon（etf-scraper-fallback-chain: Secondary ETF scraping uses a three-layer fallback chain — 新增 4 個 issuer dispatch 路徑後驗證 14 種 issuer 全數覆蓋）
- [x] 9.2 所有新 fetcher 統一整合至現有 `ETF/scrapers/official_api_scraper.py` 的 CATALOG + `_dispatch()` 架構（爬蟲整合到現有 official_api_scraper.py 而非新建檔案），不新增額外模組
- [x] 9.3 `change_category` 作為計算欄位由 `diff_engine.py` 即時填入、由 `sql_storage.py` 持久化到 DB，確認端到端流程：compute_diff → save_diff_logs → DB 欄位有值（change_category 作為計算欄位（non-stored 優先，但加 DB 欄位以便 SQL 查詢）驗證）
- [x] 9.4 記錄 CTBC ARK（00983A）fund_id 探測結果（ctbc ark（00983A）fund_id 探測方式）：若 FID 確認則 Task 6.2–6.3 執行；若無法確認則保留 pocket，在 CATALOG 不新增條目
- [x] 9.5 確認摩根 XLSX（00401A、00989A）的 `_fetch_morgan()` 使用 `Referer` header 且過濾 `Record Type = "D"` 列（摩根 XLSX（00401A、00989A）解析策略驗證）
- [x] 9.6 確認聯博 `_fetch_alliance_bernstein()` 解析 `domesticHoldings[].holdings[]` 且 code 驗證寬鬆（允許 ISIN）（聯博（00984D）REST API 結構驗證）
- [x] 9.7 確認富邦 `_fetch_fubon()` 以 `<h6>持股明細</h6>` 定位節點後讀取後續 `<tbody>`（富邦（00982D、00983D）HTML 解析策略驗證）

## 10. 驗證與整合測試

- [x] 10.1 `uv run python ETF/main.py --dry-run` 確認新增的 7 支 ETF 爬蟲皆可取得非空 DataFrame，沒有 CATALOG 找不到的 KeyError
- [x] 10.2 `uv run pytest ETF/` 確認現有測試通過，無因欄位新增導致的 schema 不符
- [x] 10.3 手動確認 `etf_diff_logs` 查詢包含 `change_category` 欄位，且舊資料 `change_category IS NULL`（向後相容驗證）
