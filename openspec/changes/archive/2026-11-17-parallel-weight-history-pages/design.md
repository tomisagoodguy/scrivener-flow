## Context

- `fetchAllRows<T>(label, fetchPage)`（`src/lib/supabase/fetchAllRows.ts`）每頁 1000 列、依序請求直到某頁不足 1000 列，任一頁錯誤即拋出含 label 的 Error。呼叫端：`getFanBreakoutSignals`、`fetchWeightHistory`、`/investment/history` 的 `fetchOverlapTrend`。
- `fetchWeightHistory` 固定 `data_date`、`etf_code`、`stock_code` 排序，供個股 API、`getRankingHistory`、疊圖、history 頁 Server Actions 使用。
- `getRankingHistory` 用 `createClient()`（讀 cookies 的 server client），未快取；snapshot 與 view 為公開讀取（RLS `true`）。`unstable_cache` 內不能讀 cookies。
- 2026-11-15 實測：00981A 每頁資料庫內約 25 ms；全歷史首次 3,896 ms、第二次 1,584 ms。

## Goals / Non-Goals

**Goals:**

- 00981A 全歷史讀取（無快取）< 1,000 ms（目標值，以實測驗證）；快取命中時不發出資料庫請求。
- 既有呼叫端在未指定並行數時行為完全不變。

**Non-Goals:**

- 不改 view、排名計算、API 回應格式。

## Decisions

### 批次並行分頁

`fetchAllRows(label, fetchPage, options?)`，`options.concurrency` 預設 1。每批同時請求 `concurrency` 個連續範圍；依範圍順序檢查回應，遇到第一個列數 < 1000 的頁即停止，後面同批已取得的頁丟棄（它們必為空）；整批都滿頁才送下一批。同批任一頁錯誤即拋錯。多送的請求最多 `concurrency - 1` 個空頁。

### fetchWeightHistory 並行數 4

並行數 4 是估算值：17,281 列 18 頁 → 5 批；8,808 列 9 頁 → 3 批。以 00981A 實測耗時確認，若仍 ≥ 1,000 ms 再評估調高。

### getRankingHistory 快取

改用 `getPublicClient()` 並以 `unstable_cache(fn, ['ranking-history-v1', etfCode], { revalidate: 3600 })` 包住；內部錯誤照常拋出（不快取失敗）。快取項目大小受 Next 單筆 2 MB 限制：最大 ETF 17,281 列，實作時量測序列化後大小，若 > 2 MB 則不快取該函式並把量測數字記到 tasks。

## Implementation Contract

**行為**

- ETF 持股頁排名歷史資料與改動前相同（列數、最新日期），00981A 讀取更快；重複開同一 ETF 頁在 1 小時內不重讀資料庫。

**介面／資料形狀**

- `fetchAllRows<T>(label: string, fetchPage: (from, to) => PromiseLike<PageResponse>, options?: { concurrency?: number }): Promise<T[]>`，`concurrency` 預設 1，小於 1 視為 1。
- `fetchWeightHistory` 與 `getRankingHistory` 簽名不變。

**失敗模式**

- 任一頁錯誤即拋錯，不回傳部分結果（含並行批次）；`getRankingHistory` 失敗拋錯，不寫入快取。

**驗收**

- `yarn test --testPathPatterns "fetchAllRows|weightHistoryData|etfPageData"` 通過，含並行邊界 Example 表與「同批第二頁錯誤即拋錯」。
- 00981A 實測：列數 8,808（或執行當下 SQL 列數）、無重複、耗時記錄。
- `yarn tsc --noEmit` 通過。

**範圍**

- 範圍內：`fetchAllRows`、`fetchWeightHistory`、`getRankingHistory` 與其測試。
- 範圍外：其他自行分頁模組、view、前端元件。

## Risks / Trade-offs

- [並行請求增加同時連線數] → 並行數 4，最多多送 3 個空頁；Supabase 連線池足以承受（估算，實測若出現 429/逾時則降低並行數）。
- [批次間資料被 pipeline 寫入] → 與依序分頁風險相同，穩定排序下只可能造成單列重複，pipeline 在收盤後執行，接受。
