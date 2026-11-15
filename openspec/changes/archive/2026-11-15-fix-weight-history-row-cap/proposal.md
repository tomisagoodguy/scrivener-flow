## Problem

ETF 持股比重歷史的多個畫面顯示過期或殘缺的資料，且沒有任何錯誤提示（2026-11-15 實測）：

- 個股頁「ETF 持倉歷史」：2330 共 2,905 列，畫面只到 2026-07-02，實際最新為 2026-11-13。
- `/investment/history`「個股跨 ETF」「各 ETF 排名史」：近 90 天 69,569 列，65 個交易日只顯示 1 天（最舊那天）。
- `/investment/history`「共識趨勢」：`etf_stock_overlap` 近 90 天 25,730 列，只聚合到最舊的少數日期。
- ETF 持股頁排名歷史（`getRankingHistory`）：單一 ETF 全歷史最多 17,281 列，只拿到最舊約 20 個交易日。
- 個股持股比重 × 股價疊圖（`HoldingsPriceOverlayChart`）：90 天單股最多 1,272 列，熱門股的最新日期被截掉。

使用者用這些畫面判斷 ETF 對個股的加減碼，約自 2026-07 起看到的都是舊狀況。

## Root Cause

Supabase PostgREST 單次查詢最多回 1000 列（max-rows），超過的部分靜默丟棄、不回錯誤。上述讀取點都沒有分頁，且依 `data_date` 升冪排序，所以被丟掉的正好是最新的日期。此問題在 `etf_weight_history` 還是實體表時就存在（舊表同樣截在 2026-07-03），與 2026-11-15 改成 view 無關。

## Proposed Solution

1. 新增共用的分頁讀取函式（由 `getFanBreakoutSignals` 內的私有 `fetchAllRows` 抽出），任一頁失敗即拋錯；所有分頁查詢改用穩定排序（`data_date` + `etf_code` + `stock_code`），避免翻頁時重複或漏列。
2. 新增 weight history 讀取模組，以單一函式提供「依 ETF／股票／起始日篩選、自動分頁」的查詢，供以下讀取點共用：個股頁 API、`getRankingHistory`、`HoldingsPriceOverlayChart`、`/investment/history`。
3. 個股頁 API 與 `getRankingHistory` 改用此模組，並移除改讀 `etf_holdings_snapshot` 的 fallback（view 與 fallback 讀的是同一份資料，fallback 無法補出更多內容，且本身也會被截斷）。
4. `/investment/history` 改成按需載入（使用者已選定）：開頁只載入每支 ETF 最新一天的持股（實測 1,052 列）供股票清單與共識統計；切到某支 ETF 或某檔股票時才載入它近 90 天的資料。頁首交易日數改由市場交易日計算。
5. 「共識趨勢」的 `etf_stock_overlap` 查詢改為分頁讀完後再聚合。
6. 快取 key 加版本號，讓舊的殘缺快取立即失效。

## Non-Goals (optional)

- 不修改 `etf_weight_history` view 定義與 ETF pipeline。
- 不調整 `investmentPnl` 的查詢：單一 ETF × 單一股票全歷史最多 174 列（實測），遠低於上限。
- 不重構其他已自行分頁的模組（`getStreaks`、`getEtfSectorActivity` 等）改用共用函式。
- 不處理 `HoldingsPriceOverlayChart` 在 Client Component 直接查資料庫的既有架構問題，只修分頁。

## Success Criteria

- 個股頁 API 回傳 2330 的最新 `data_date` = 2026-11-13（或執行當下 snapshot 中 2330 的最新日），且列數等於資料庫實際列數。
- `getRankingHistory('00981A')` 回傳列數等於該 ETF 在 snapshot 的列數，最新日期等於該 ETF 最新 `data_date`。
- `HoldingsPriceOverlayChart` 90 天查詢回傳每支 ETF 的最新日期等於資料庫最新日期。
- `/investment/history` 頁首顯示近 90 天的實際交易日數（非 1）；「各 ETF 排名史」選任一 ETF 時，圖表涵蓋近 90 天所有該 ETF 的資料日期；「個股跨 ETF」選任一股票時涵蓋其近 90 天所有日期；「共識趨勢」涵蓋近 90 天所有 `etf_stock_overlap` 日期（實測 64 天）。
- 開啟 `/investment/history` 的伺服器端查詢不超過 2,000 列（不再嘗試載入 6.9 萬列）。
- 分頁函式有單元測試：多頁合併、最後一頁不足一頁即停止、任一頁錯誤時拋出含資料表名稱的錯誤。

## Impact

- Affected specs: etf-weight-history-reads（新增）
- Affected code:
  - Modified: src/app/actions/getFanBreakoutSignals.ts
  - Modified: src/app/api/investment/etf-weight-history/route.ts
  - Modified: src/lib/investment/etfPageData.ts
  - Modified: src/components/features/investment/HoldingsPriceOverlayChart.tsx
  - Modified: src/app/investment/history/page.tsx
  - Modified: src/components/features/investment/HistoryTabs.tsx
  - Modified: src/components/features/investment/StockWeightCrossEtfChart.tsx
  - Modified: src/components/features/investment/EtfRankingHistoryChart.tsx
  - New: src/lib/supabase/fetchAllRows.ts
  - New: src/lib/investment/weightHistoryData.ts
  - New: src/app/actions/getWeightHistory.ts
  - New: src/lib/supabase/__tests__/fetchAllRows.test.ts
  - New: src/lib/investment/__tests__/weightHistoryData.test.ts
  - New: src/app/actions/__tests__/getWeightHistory.test.ts
  - Modified: src/lib/investment/__tests__/etfPageData.test.ts
