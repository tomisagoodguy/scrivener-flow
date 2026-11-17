## Summary

讓持股比重歷史的分頁讀取一次並行送出多頁，並為 ETF 頁的排名歷史加上快取，縮短大 ETF 頁面的載入時間。

## Motivation

`getRankingHistory`（ETF 持股頁的排名歷史）讀單一 ETF 全歷史：00981A 8,808 列需 9 頁，2026-11-15 實測首次 3,896 ms、第二次 1,584 ms，首次超過 fix-weight-history-row-cap 設計定的 3 秒門檻。同日 EXPLAIN 實測每頁在資料庫內只花約 25 ms，耗時主要是 9 次依序的網路往返（暖快取約 175 ms／次，由 1,584 ms ÷ 9 估算）。`getRankingHistory` 目前沒有快取，每次開 ETF 頁都重讀。最大的 ETF 全歷史約 17,281 列（2026-11-15 實測），依序需 18 次往返。

## Proposed Solution

1. 共用分頁函式 `fetchAllRows` 新增選填的並行數：一次送出 N 頁，若該批每頁都滿 1000 列就送下一批，遇到第一個不足一頁即停止；結果依範圍順序合併。預設並行數 1，既有呼叫端行為不變。
2. `fetchWeightHistory` 以並行數 4 讀取（估算：17,281 列從 18 次往返降為 5 批）。
3. `getRankingHistory` 改用公開讀取的 client 並以 `unstable_cache`（key 含 ETF 代碼）快取 1 小時；查詢失敗仍拋錯，不快取空結果。

## Non-Goals

- 不改 `etf_weight_history` view 與排名計算方式（另案 store-weight-history-rank）。
- 不把其他自行分頁的模組改用並行分頁。

## Alternatives Considered

- 先查 `count: 'exact'` 再一次送出全部頁：需多一次查詢，且對 view 依股票篩選時 count 本身也要算整張表的排名（在 store-weight-history-rank 完成前），否決。
- 只加快取不並行：快取過期後第一次仍需依序 9–18 次往返。

## Impact

- Affected specs: etf-weight-history-reads
- Affected code:
  - Modified: src/lib/supabase/fetchAllRows.ts
  - Modified: src/lib/supabase/__tests__/fetchAllRows.test.ts
  - Modified: src/lib/investment/weightHistoryData.ts
  - Modified: src/lib/investment/__tests__/weightHistoryData.test.ts
  - Modified: src/lib/investment/etfPageData.ts
  - Modified: src/lib/investment/__tests__/etfPageData.test.ts
