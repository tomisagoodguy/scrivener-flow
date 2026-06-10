## Context

ETF Pipeline 目前追蹤 22 支主動型 ETF，透過 `ETF/scrapers/official_api_scraper.py` 的 CATALOG + per-issuer fetcher 架構分派到各投信 API。其中仍有 5 支使用 Pocket.tw（公告日才更新）：00983A、00400A、00401A、00989A（以及 00998A 暫保留）。另有 3 支 D 結尾 ETF 完全未納入。

`diff_engine.py` 產生的 `etf_diff_logs` 使用 IN/OUT/CLOSE/BUY/SELL/TRIM 六種 `change_type`；前端需自行映射到「新增/移除/加碼/減碼」語意，增加查詢複雜度。

## Goals / Non-Goals

**Goals:**
- 為 5 支 ETF 新增官方爬蟲，消除 Pocket.tw 依賴（00998A 除外）
- 新增 3 支 D 結尾 ETF（00984D、00982D、00983D）至完整追蹤
- `etf_diff_logs` 新增 `change_category` 欄位，提供 added/removed/increased/decreased 四值語意標籤
- 同步雙端 registry（Python + TypeScript）

**Non-Goals:**
- 不修改 `change_type` 欄位（向後相容）
- 不回填舊歷史資料的 `change_category`
- 不強制前端遷移到 `change_category`
- 00998A（復華金融股息）官方 API 仍待確認，維持 pocket

## Decisions

### 爬蟲整合到現有 official_api_scraper.py 而非新建檔案

**決定**：所有新 issuer fetcher 整合進 `ETF/scrapers/official_api_scraper.py` 的 CATALOG + `_dispatch()` 架構。

**理由**：現有架構已有 11 種 issuer，新增 5 種只需擴充 CATALOG dict 和 `_dispatch()` switch，不破壞現有測試和 fallback chain。若另建新檔，`multi_etf_step.py` 的 import 邏輯要改動更多。

**替代方案**：建立 `ETF/scrapers/new_issuers_scraper.py` → 拒絕，增加模組碎片化。

### change_category 作為計算欄位（non-stored 優先，但加 DB 欄位以便 SQL 查詢）

**決定**：在 `diff_engine.py` 計算時填入 `change_category`（字串），並在 DB migration 中新增欄位，`sql_storage.py` 的 UPSERT 自動帶入。

**映射規則**：
- IN → `added`
- OUT, CLOSE → `removed`
- BUY → `increased`
- SELL, TRIM → `decreased`

**理由**：加 DB 欄位讓前端可直接 SQL 過濾（`WHERE change_category = 'added'`），不需每次在 JS 重新映射。若只在應用層計算，查詢舊資料時仍需映射。

**替代方案**：只在前端計算 → 拒絕，因為 Server Action 查詢 SQL 已有複雜度，讓 DB 承載語意標籤更乾淨。

### CTBC ARK（00983A）fund_id 探測方式

**決定**：`_fetch_ctbc()` 已在 `official_api_scraper.py` 實作（為 00995A 中信台灣卓越）。00983A 使用相同函式，僅 FID 不同。FID 透過瀏覽 `https://www.ctbcinvestments.com.tw/` 的 Network tab 確認後寫入 CATALOG。

**替代方案**：直接 HTML 解析 → 備用方案，若 API FID 無法確認時退回。

### 摩根 XLSX（00401A、00989A）解析策略

**決定**：GET 下載 XLSX 檔，帶 `Referer: https://www.morganassetmanagement.com.tw/` header，以 openpyxl 解析 `Record Type=D` 的列。

**判斷**：現有 `_parse_xlsx()` 已處理標準欄位，但摩根 XLSX 格式有 Record Type 欄位，需另寫 `_fetch_morgan()` fetcher 過濾 `D` 型列。

### 聯博（00984D）REST API 結構

**決定**：GET `https://www.abfunds.com.tw/api/fundholding/{fundCode}`，解析 `domesticHoldings[].holdings[]`，提取 `stockCode`、`stockName`、`shares`、`weight`。

### 富邦（00982D、00983D）HTML 解析策略

**決定**：GET 富邦投信官網產品頁，以 BeautifulSoup 解析 `<h6>` 節（找含「持股明細」的段落），讀取後續 `<tbody>` 的 `<tr><td>` 列。欄位順序：代號、名稱、股數、權重（需驗證）。

## Risks / Trade-offs

- **CTBC ARK FID 未知** → 若 FID 無法確認，00983A 保持 pocket source，`official_api_scraper.py` 不加此 ETF 的 CATALOG 條目
- **摩根 XLSX URL 結構可能變動** → 爬取前先驗證 HTTP 200 及 Content-Type；失敗時 fallback pocket
- **富邦 HTML 結構脆弱** → 加 `try/except` 包覆，失敗靜默跳過（輔助步驟策略）
- **`change_category` 舊資料為 NULL** → 前端過濾時需加 `IS NOT NULL` guard，或以 `change_type` 補充
- **D 結尾 ETF 持股可能為非台股（如 00984D 為美元計價債券）** → 爬蟲回傳時 `code` 欄位可能是 ISIN 或非 4 位數字，需加寬鬆的 code 驗證（不只是 `r'^\d{4,6}$'`）

## Migration Plan

1. 新增 DB migration：`supabase/migrations/<timestamp>_add_diff_category.sql`（`ALTER TABLE etf_diff_logs ADD COLUMN IF NOT EXISTS change_category VARCHAR(20)`）
2. 更新 `diff_engine.py`：`compute_diff()` 每筆 log 自動填入 `change_category`
3. 更新 `sql_storage.py`：UPSERT 的欄位清單加入 `change_category`
4. 新增各 issuer fetcher 至 `official_api_scraper.py`
5. 更新 CATALOG 與 `_dispatch()`
6. 更新 `ETF/config/etf_registry.py`（升級 source + 新增 3 支 D 類）
7. 更新 `src/lib/investment/etfRegistry.ts`（同步）
8. 手動驗證：`uv run python ETF/main.py --dry-run` 確認新 ETF 爬蟲可取得資料
