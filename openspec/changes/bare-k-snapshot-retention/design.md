## Context

`bare_k_snapshots` 由 `SyncBareKStep` 每日 upsert，主鍵語意為 `(stock_id, date)`，每列的 JSONB 欄位已含約 240 個交易日資料。`cleanup_old_data` 由 `CleanupStep`（pipeline 最後一步）與 `sync_stock_financials.py` 呼叫，所有刪除在同一交易內，失敗時 rollback 並只記 log。

2026-11-04 實測：6,458 列、617 檔、表總大小 167 MB；每檔最新一列合計約 14 MB。

## Goals / Non-Goals

**Goals:**

- 每檔股票只保留最新一列，讓此表大小隨股票數量而不是隨天數成長。
- 釋放線上既有舊列佔用的空間。

**Non-Goals:**

- 不調整 `equity_distribution_stats` 的保留期。
- 不新增 `etf_weight_history`、`etf_position_summary` 的清理。
- 不調整 `MAX_STOCKS` 或選股池快照範圍。
- 不更改 `bare_k_snapshots` 的 schema 或主鍵。
- 不清除已退出同步名單的股票的最後一列。
- 本 change 單獨完成後 Database Size 仍預估高於 0.5 GB，降到額度內由後續 change 處理。

## Decisions

### 以存在更新列為刪除條件

刪除條件是「同一 `stock_id` 存在日期更新的列」，不是固定天數。

替代方案是保留 N 天，但股票退出同步名單 N 天後會失去唯一一列，頁面變成無資料；當日同步全部失敗時也可能刪到不該刪的列。現行條件在這兩種情況都保留該股最新一列。

### 保留現有 schema 不改為每檔一列的主鍵

替代方案是把主鍵改成 `stock_id`，由 upsert 直接覆寫，連清理都不需要。但這要動 migration 與 upsert 語句，風險與改動面都較大。現在只加一條清理語句即可達到相同的儲存結果，所有讀取端也不必修改。

### 刪除語句抽成可測試的模組常數

現有測試只用 mock 比對 SQL 字串，無法證明語句真的留下正確的列。把裸K語句定義為 `sql_storage.py` 的模組常數 `BARE_K_RETENTION_SQL`，語句只用 PostgreSQL 與 SQLite 都支援的語法，測試就能在記憶體 SQLite 上實際執行並檢查留下的列。

### 線上一次性清理由使用者在 SQL Editor 執行

`VACUUM FULL` 無法在交易內執行，且會鎖表，因此不放進 pipeline。由使用者在 Supabase SQL Editor、非 pipeline 執行時段手動執行。每日清理只做 `DELETE`，空間由 autovacuum 回收後供隔日寫入重用。

## Implementation Contract

**Behavior**：`cleanup_old_data` 執行後，`bare_k_snapshots` 每個 `stock_id` 恰好留下日期最新的一列，其他表的清理行為不變。

**Interface / data shape**：`ETF/database/sql_storage.py` 新增模組常數 `BARE_K_RETENTION_SQL`（字串），內容為：

```sql
DELETE FROM bare_k_snapshots
WHERE EXISTS (
    SELECT 1 FROM bare_k_snapshots AS newer
    WHERE newer.stock_id = bare_k_snapshots.stock_id
      AND newer.date > bare_k_snapshots.date
)
```

`cleanup_old_data` 在同一交易內以 `text(BARE_K_RETENTION_SQL)` 執行，並 log 刪除筆數。

**Failure modes**：沿用 `cleanup_old_data` 既有行為，例外時整批 rollback、`logger.error` 記錄、不往外拋，pipeline 繼續。

**Acceptance criteria**：

- `uv run pytest ETF/tests/test_cleanup_old_data.py` 通過，包含在 SQLite 上實際執行 `BARE_K_RETENTION_SQL` 的測試。
- `uv run ruff check ETF/database/sql_storage.py ETF/tests/test_cleanup_old_data.py` 通過。
- 線上查詢 `select count(*), count(distinct stock_id) from bare_k_snapshots` 兩數相等。
- 線上 `pg_total_relation_size('bare_k_snapshots')` 低於 40 MB。

**Scope boundaries**：in scope 是上述常數、清理呼叫、測試、`ETF/CLAUDE.md` 的保留說明、線上一次性清理。out of scope 見 Non-Goals。

## Risks / Trade-offs

- [舊列永久刪除，之後無法回看某日當時算出的 `signals`、`summary`] → 目前無功能讀取，使用者已於 2026-11-04 同意。
- [`VACUUM FULL` 期間鎖表，裸K頁面會等待] → 表小，預估數秒到一分鐘（估計，以實際執行時間確認），在非 pipeline 時段執行。
- [每日 `DELETE` 加 upsert 造成表膨脹] → 預估穩定在最新列的 2～3 倍（估計 30～40 MB，以上線一週後的 `pg_total_relation_size` 確認），若超過 60 MB 另開 change 改主鍵。

## Migration Plan

1. 部署含新清理語句的程式碼。
2. 使用者在 SQL Editor 執行刪除語句，再單獨執行 `VACUUM FULL bare_k_snapshots;`。
3. 查詢驗證列數與大小。

回復方式：舊列刪除後無法從此表回復，但最新列已包含約 240 日資料，且 `SyncBareKStep` 隔日會重新產生快照。程式碼可用 `git revert` 回復。
