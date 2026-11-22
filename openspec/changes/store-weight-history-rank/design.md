## Context

- `etf_weight_history` 是 `etf_holdings_snapshot` 的 view（migration `20261115140000_etf_weight_history_as_view.sql`），rank 以 `row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code)` 即時計算，型別為 bigint。
- snapshot 索引：主鍵 `(etf_code, stock_code, data_date)`、`(etf_code)`、`(stock_code, data_date DESC)`（2026-11-15 查 `pg_indexes`）。依股票篩選本可走 `(stock_code, data_date DESC)`，但視窗函式擋住條件下推。
- 快照唯一寫入點：`ETF/database/storage.py` 的 `ETFStorage.save_snapshot`（REST upsert，`resolution=merge-duplicates`），由 `save_snapshot_step.py` 與 `multi_etf_step.py` 呼叫；每次呼叫帶入該 ETF 該日的完整持股 DataFrame。其他對 snapshot 的 UPDATE（`disposal_detect_step.py` 的 `is_disposal`、`sql_storage.py` 的舊日屬性清空）不改 `weight`。
- 2026-11-15 實測：snapshot 約 15.5 萬列；依股票查 2330 每頁約 300 ms（暖）、冷啟動第一次逾時；依 ETF 查 00981A 每頁約 25 ms。

## Goals / Non-Goals

**Goals:**

- 依股票篩選的 weight history 查詢不再為整張表算排名，2330 單頁查詢在資料庫內 < 50 ms（目標值，以 EXPLAIN ANALYZE 驗證）。
- rank 數值與現行 view 完全相同（同 ETF 同日、weight 降序、同分 stock_code 升冪），前端與 API 不需改。

**Non-Goals:**

- 不改 `getRankingHistory` 的分頁方式（另案）。
- 不改前端、API 回應格式與快照保留政策。

## Decisions

### rank 在 pipeline 寫入時計算

`ETFStorage.save_snapshot` 在組 records 前，依 `weight` 降序、`code` 升冪排序後給 1..n 的 rank，寫入 `rank` 欄位。選這個寫入點是因為它是唯一寫入 snapshot 的函式，且每次呼叫帶完整一日持股，能算出完整名次。使用者 2026-11-15 選定「儲存 rank」而非加索引或 API 快取（理由見 proposal）。

### 分兩支 migration，依序部署

PostgREST 寫入不存在的欄位會失敗，所以順序必須是：

1. Migration A（`20261116090000_add_snapshot_rank.sql`）：新增 `rank integer` 可為 NULL，並以視窗函式回填所有列；view 不動。
2. 部署 pipeline 寫入 rank 的程式。
3. Migration B（`20261116100000_weight_history_view_stored_rank.sql`）：再補填一次 rank 為 NULL 的列（涵蓋步驟 1、2 之間寫入的資料），然後 `CREATE OR REPLACE VIEW` 改為 `rank::bigint AS rank`（保持欄位型別 bigint，避免需要 DROP VIEW）。

兩支都在 Supabase SQL Editor 手動執行（與既有 snapshot migration 一致），執行前向使用者確認。

### 回填比對作為驗收

Migration A、B 執行後各以 SQL 比對「儲存的 rank」與「視窗函式算出的 rank」不一致列數，必須為 0；B 之後 `rank IS NULL` 列數必須為 0。

## Implementation Contract

**行為**

- `GET /api/investment/etf-weight-history?code=2330` 在 dev server 冷啟動後第一次呼叫回 200。
- 各頁面顯示的 rank 與改動前相同。

**介面／資料形狀**

- `etf_holdings_snapshot.rank integer NULL`；pipeline 寫入後新資料不為 NULL。
- `etf_weight_history` 欄位與型別不變（rank 仍為 bigint）。
- `ETFStorage.save_snapshot(df, etf_code, data_date)` 簽名不變，records 每列多 `rank`。

**失敗模式**

- Migration A 回填或 B 的比對不一致 > 0：停止，不切換 view。
- pipeline 寫入失敗沿用既有行為（`save_snapshot` 拋錯，屬關鍵步驟）。

**驗收**

- `uv run pytest ETF/tests/test_storage_snapshot_rank.py` 通過（rank 依 weight 降序、同分依代碼升冪）。
- SQL：儲存 rank 與視窗 rank 不一致 0 列；B 之後 NULL 0 列。
- EXPLAIN ANALYZE（anon 角色）2330 單頁 < 50 ms，計畫使用 `idx_etf_holdings_snapshot_stock_date`。
- dev server 重啟後第一次呼叫 2330 API 回 200，總點數等於 SQL 列數。

**範圍**

- 範圍內：兩支 migration、`ETFStorage.save_snapshot`、新 pytest、`src/types/supabase.ts` 的 snapshot 型別。
- 範圍外：前端讀取程式、`getRankingHistory`、保留政策。

## Risks / Trade-offs

- [同一 ETF 同日若重跑且持股變少，upsert 不刪舊列，舊列保留舊 rank] → 現行 view 會把舊列一起重排；改後舊列 rank 不變。pipeline 目前每日一次寫入，接受；實際發生時以 Migration B 的比對 SQL 重算。
- [Python 與資料庫對 stock_code 的排序規則不同，同分時名次可能不同] → 以回填比對 SQL 檢查 pipeline 寫入後的新資料，不一致 > 0 即修正排序方式。
- [回填 15.5 萬列 UPDATE 產生 dead tuples] → 執行後在 SQL Editor 單獨執行 `VACUUM etf_holdings_snapshot`（不可包在 transaction 內）。
