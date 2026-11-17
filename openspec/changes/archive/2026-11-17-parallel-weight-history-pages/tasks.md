## 1. 並行分頁

- [x] 1.1 `fetchAllRows` 新增 `options.concurrency`（預設 1、小於 1 視為 1），依批次並行請求、遇第一個不足一頁即停止並依範圍順序合併，同批任一頁錯誤即拋錯（需求：Paginated reads return every matching row；決策：批次並行分頁）。驗證：在 `src/lib/supabase/__tests__/fetchAllRows.test.ts` 以 spec「concurrent batch boundaries」Example 表的 0／2905／4000／8808 列四列參數化斷言請求範圍與回傳列數、首末列順序，並新增「並行數 4 時同批第二頁錯誤即拋出含 label 的 Error」；先確認新測試在現行實作失敗；既有三列邊界測試（未指定並行數）維持通過；`yarn test --testPathPatterns fetchAllRows` 通過。
  - 實測（2026-11-17）：新增 9 個並行測試，其中 5 個在現行實作失敗（4 組批次邊界、整批同時發送），「同批第二頁錯誤」與「並行數 0／-2 視為 1」在依序模式即成立；實作後 `yarn test --testPathPatterns fetchAllRows` 13/13 通過（含原 3 列邊界與 null、錯誤測試），`getFanBreakoutSignals`／`weightHistoryData` 測試照舊通過；`yarn tsc --noEmit` 通過；ESLint 0 筆。
- [x] 1.2 [after: 1.1] `fetchWeightHistory` 呼叫 `fetchAllRows` 時傳入並行數 4（需求：Paginated reads return every matching row；決策：fetchWeightHistory 並行數 4）。驗證：`src/lib/investment/__tests__/weightHistoryData.test.ts` 的分頁測試改為斷言 2,905 列時請求範圍為 0–999 至 3000–3999 四頁、回傳 2,905 列；`yarn test --testPathPatterns weightHistoryData` 通過。
  - 實測（2026-11-17）：分頁測試改為預期 0–999 至 3000–3999 四頁後在現行實作失敗（仍依序 3 頁），加上並行數 4 後 4/4 通過且 2,905 列依序；ESLint 0 筆。注意：個股 API 也經由 `fetchWeightHistory`，store-weight-history-rank 完成前每個依股票的頁約 300 ms，任務 3.1 一併實測個股 API。

## 2. 排名歷史快取

- [x] 2.1 `getRankingHistory` 改用 `getPublicClient()` 並以 `unstable_cache`（key `['ranking-history-v1', etfCode]`、revalidate 3600）包住，失敗照常拋錯（需求：ETF ranking history is cached；決策：getRankingHistory 快取）。驗證：`src/lib/investment/__tests__/etfPageData.test.ts` 的 getRankingHistory 測試改為斷言傳入 `fetchWeightHistory` 的是 public client、`unstable_cache` 的 key 含 `ranking-history-v1` 與 ETF 代碼、讀取失敗時拋錯；`yarn test --testPathPatterns etfPageData` 與 `yarn tsc --noEmit` 通過。
  - 實測（2026-11-17）：測試改為預期 public client 與 `unstable_cache(fn, ['ranking-history-v1', etfCode], { revalidate: 3600 })` 後，2 個測試在現行實作失敗；實作後 8/8 通過（含讀取失敗拋錯）；`yarn tsc --noEmit` 通過；ESLint 0 筆。

## 3. 實測

- [x] 3.1 [after: 1.2, 2.1] 以 `fetchWeightHistory` 與 anon client 讀 00981A 全歷史（同 getRankingHistory 查詢）連跑兩次，記錄列數（須等於 SQL `SELECT count(*) FROM etf_holdings_snapshot WHERE etf_code='00981A'`）、`(data_date, stock_code)` 是否無重複與兩次耗時（目標 < 1,000 ms）；並量測最大 ETF 全歷史序列化後的 JSON 大小，> 2 MB 時依決策移除該快取（需求：Paginated reads return every matching row；需求：ETF ranking history is cached；決策：getRankingHistory 快取）。驗證：數字記到本任務下方。
  - 實測（2026-11-17，`fetchWeightHistory` + anon client，同一程序連跑；SQL 為同日 `count(*)`）：
    | 查詢 | 列數（SQL） | 無重複 | 最新日 | 耗時 | 序列化大小 |
    | --- | --- | --- | --- | --- | --- |
    | 00981A 第 1 次（含建立連線） | 8,858（8,858） | 是 | 2026-11-16 | 1,923 ms | 0.83 MB |
    | 00981A 第 2 次 | 8,858 | 是 | 2026-11-16 | 577 ms | 0.83 MB |
    | 00984A（最大 ETF） | 17,368（17,368） | 是 | 2026-11-16 | 1,342 ms | 1.66 MB |
    | 2330 個股 第 1／2 次 | 2,925（2,925） | 是 | 2026-11-16 | 702／644 ms | 0.27 MB |
  - 對照依序分頁（2026-11-15）：00981A 3,896／1,584 ms。並行後暖連線 577 ms 達成 < 1,000 ms 目標；第 1 次含建立連線為 1,923 ms，未達目標。
  - 最大 ETF 序列化 1.66 MB < 2 MB，依決策保留快取；但餘裕僅約 0.34–0.44 MB（依 2 MB 為 2,000,000 或 2,097,152 bytes）：00984A 每列約 95.5 bytes、最新一日 87 列（2026-11-17 SQL），約 41–53 個交易日（約 2–2.5 個月）後會超過，屆時 Next 不快取該 ETF（只影響速度，不影響正確性）；需另案改為快取較短期間或拆分。
  - 個股 2330 並行 4 頁未逾時（702／644 ms）。
