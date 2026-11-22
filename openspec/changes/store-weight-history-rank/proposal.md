## Summary

把持股排名（rank）在寫入 `etf_holdings_snapshot` 時就算好存起來，`etf_weight_history` view 改為直接讀這個欄位，不再每次查詢都用視窗函式重算，讓「依股票篩選」的查詢能先用索引縮小範圍。

## Motivation

個股頁「ETF 持倉歷史」走 `GET /api/investment/etf-weight-history?code=<股票>`，查 `etf_weight_history` view。view 以 `row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code)` 即時算 rank，依股票篩選的條件無法先套用：每頁都要對約 14.3 萬列算排名再丟掉 14 萬列（2026-11-15 EXPLAIN 實測，anon 角色暖快取每頁約 300 ms）。anon 角色 `statement_timeout` 為 3 秒，dev server 冷啟動後第一次呼叫 2330 即回 500 `canceling statement due to statement timeout`（2026-11-15 實測）。

已排除的 view 層改寫（2026-11-15 實測）：
- 以「先找出該股出現的 (ETF, 日期) 再只排這些分區」改寫：2330 幾乎每天被每支 ETF 持有，仍需排約 14.3 萬列，每頁 499 ms。
- 以相關子查詢計數取代視窗函式：無合適索引時每頁 3.9 秒。

## Proposed Solution

1. `etf_holdings_snapshot` 新增 `rank` 欄位，並以與 view 相同的規則（同 ETF 同日依 weight 降序、同分依 stock_code 升冪）回填既有約 15.5 萬列。
2. pipeline 唯一的快照寫入點 `ETFStorage.save_snapshot` 在寫入時依同一規則算出每列 rank 一併寫入。
3. 待 pipeline 寫入 rank 上線後，補填空值並把 `etf_weight_history` view 的 rank 改為讀取儲存的欄位（保持欄位名稱與型別，前端不需改）。

## Non-Goals

- 不改前端讀取程式與 API 回應格式。
- 不處理 `getRankingHistory` 依序分頁的耗時（另案 parallel-weight-history-pages）。
- 不改快照的保留政策；`rank` 與 `weight`／`shares` 一樣永久保留，不列入例行清空的個股屬性欄位。

## Alternatives Considered

- 新增 `(etf_code, data_date, weight DESC, stock_code)` 索引並以計數改寫 view：pipeline 不用改，但索引約 6–8 MB（估算），且需建索引後才能量測速度；使用者 2026-11-15 選擇儲存 rank。
- 只在 API 層加 1 小時快取：快取過期後第一次查詢仍可能逾時，根因不變。

## Impact

- Affected specs: etf-weight-history-reads
- Affected code:
  - New: supabase/migrations/20261116090000_add_snapshot_rank.sql
  - New: supabase/migrations/20261116100000_weight_history_view_stored_rank.sql
  - Modified: ETF/database/storage.py
  - New: ETF/tests/test_storage_snapshot_rank.py
  - Modified: src/types/supabase.ts
