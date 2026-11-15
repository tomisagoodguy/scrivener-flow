## 1. 共用分頁與讀取模組

- [x] 1.1 抽出共用分頁函式 fetchAllRows 到 `src/lib/supabase/fetchAllRows.ts`，`getFanBreakoutSignals` 改為匯入，行為不變（需求：Paginated reads return every matching row；決策：共用分頁函式 fetchAllRows）。驗證：新增 `src/lib/supabase/__tests__/fetchAllRows.test.ts`，以假的 `fetchPage` 覆蓋 spec Example 表的 0／1000／2905 列三種邊界（請求的範圍與回傳列數）與「第二頁錯誤時拋出含 label 與錯誤訊息的 Error」；先寫測試確認失敗再實作；`yarn test --testPathPatterns fetchAllRows` 與既有 `src/app/actions/__tests__/getFanBreakoutSignals.test.ts` 通過，`yarn tsc --noEmit` 通過。
- [x] 1.2 [after: 1.1] 新增 weight history 讀取模組 `fetchWeightHistory`（`src/lib/investment/weightHistoryData.ts`），依 filter 組 `.in/.eq/.gte` 並固定 `data_date`、`etf_code`、`stock_code` 排序後分頁讀取（需求：Weight history queries use a stable order；決策：weight history 讀取模組）。驗證：`src/lib/investment/__tests__/weightHistoryData.test.ts` 以假 Supabase query builder 斷言三個 order 依序呼叫、filter 只在有值時套用、分頁會讀到第 3 頁；`yarn test --testPathPatterns weightHistoryData` 通過。

## 2. 單一讀取點修正

- [x] 2.1 [after: 1.2] 個股頁 API `GET /api/investment/etf-weight-history` 改用 `fetchWeightHistory` 讀取該股所有 ETF 全歷史，移除改讀 snapshot 的 fallback，查詢失敗回 500（需求：Stock weight history API returns complete history；決策：移除改讀 snapshot 的 fallback）。驗證：dev server 呼叫 `?code=2330`，回傳總點數等於 SQL `SELECT count(*) FROM etf_holdings_snapshot WHERE stock_code='2330'`，各 ETF 最新日等於 SQL 查得的最新日；數字記到本任務下方。`yarn tsc --noEmit` 通過。
  - 實測（2026-11-15，dev server）：SQL `count(*) … stock_code='2330'` = 2,905；`curl /api/investment/etf-weight-history?code=2330` 回 200，總點數 2,905，20 支 ETF 最新日皆 2026-11-13（= SQL `max(data_date)` 逐 ETF）；耗時 1.35–1.61 s（3 次）。`yarn tsc --noEmit` 通過。
  - 風險：dev server 啟動後**第一次**呼叫回 500 `etf_weight_history: canceling statement due to statement timeout`（anon 角色 `statement_timeout=3s`）。EXPLAIN：view 的 `row_number() OVER (PARTITION BY etf_code, data_date)` 使 `stock_code` 篩選無法下推，每頁都對約 14.3 萬列算排名（暖快取每頁約 300 ms）。錯誤有如設計外露為 500；view 調整屬 Non-Goals，需另案處理。
- [x] 2.2 [after: 1.2] `getRankingHistory`（`src/lib/investment/etfPageData.ts`）改用 `fetchWeightHistory` 讀單一 ETF 全歷史，移除 count 預查與 snapshot fallback，失敗拋錯（需求：ETF ranking history returns complete history；決策：移除改讀 snapshot 的 fallback）。驗證：`src/lib/investment/__tests__/etfPageData.test.ts` 目前未涵蓋 getRankingHistory，新增一個以 mock 驗證「呼叫 fetchWeightHistory 帶 etfCodes=[etfCode]、錯誤時拋出」；`yarn test --testPathPatterns etfPageData` 通過；實際呼叫 00981A 的列數與耗時記到本任務下方。
  - 實測（2026-11-15）：`yarn test --testPathPatterns etfPageData` 7/7 通過（新增 2 個 getRankingHistory 測試，改動前失敗、改動後通過）。以相同查詢（`fetchWeightHistory` + anon client，`etfCodes=['00981A']`）讀取：8,808 列（= SQL snapshot `count(*)`），`(data_date, stock_code)` 無重複，最新日 2026-11-13；耗時首次 3,896 ms、第二次 1,584 ms。首次超過設計的 3 秒門檻（冷快取），依設計另案評估並行分頁或快取。
- [x] 2.3 [after: 1.2] `HoldingsPriceOverlayChart` 的 client 查詢改用 `fetchWeightHistory`（傳入 browser client，`fromDate` = 今天減 period 天），30／60／90 天都讀完整（需求：Holdings price overlay chart reads the full period）。驗證：`yarn tsc --noEmit`、`yarn eslint src/components/features/investment/HoldingsPriceOverlayChart.tsx` 無新錯誤；SQL 實測某熱門股 90 天列數 > 1000，並在 dev server 以瀏覽器 network 確認查詢回傳兩頁、圖表最新日期等於 SQL 最新日。
  - 實測（2026-11-15）：`yarn tsc --noEmit` 通過；ESLint 1 筆 `react-hooks/set-state-in-effect` 與 HEAD 版本相同（既有，非新增）。SQL：2330 近 90 天 1,272 列。Playwright 於 `/investment/stock/2330` 點 90D：瀏覽器送出 2 頁請求（`offset=0` 1,000 列、`offset=1000` 272 列，合計 1,272），排序 `data_date,etf_code,stock_code`，最新日 2026-11-13（= SQL）。另加查詢失敗時顯示錯誤訊息（原本會卡在載入動畫）。
  - 範圍外發現：此元件的股價查詢使用 `stock_prices_daily.date`，但該表只有 `data_date` 欄位，股價虛線因此一直是空的；本 change 未處理。

## 3. history 頁按需載入

- [x] 3.1 [after: 1.2] 新增 Server Actions `getEtfWeightHistory90d`、`getStockWeightHistory90d`（`src/app/actions/getWeightHistory.ts`），以 `unstable_cache`（key 含代碼）包住 `fetchWeightHistory`，失敗時拋錯（需求：History page loads data on demand；決策：history 頁按需載入）。驗證：`src/app/actions/__tests__/getWeightHistory.test.ts` 以 mock 斷言傳入的 filter（ETF 版只有 etfCodes、股票版只有 stockCode，兩者 fromDate 皆為 90 天前）；`yarn test --testPathPatterns getWeightHistory` 通過。
- [x] 3.2 [after: 3.1] history 頁伺服器端只載入每支 ETF 最新一天持股（`fetchLatestHoldings`），股票清單改依最新一日持有家數排序，頁首交易日數改由 `stock_prices_daily` 2330 近 90 天筆數計算，cache key 改為 `weight-history-latest-v2`（需求：History page loads data on demand；決策：history 頁按需載入）。驗證：`yarn tsc --noEmit` 通過；Playwright 頁首交易日數 > 1，伺服器端 weight history 查詢合計 ≤ 2,000 列（以 SQL 比對最新一日列數）。
  - 實測（2026-11-15）：`yarn tsc --noEmit` 通過。Playwright `/investment/history` 頁首「近 90 天 · 60 個交易日」（= SQL `stock_prices_daily` 2330 近 90 天 60 筆）。SQL：各 ETF 最新一日合計 1,052 列（23 支 ETF 同一最新日，registry 20 支 ≤ 1,052）≤ 2,000。股票清單第一檔為 2330。
- [x] 3.3 [after: 3.2] `HistoryTabs`、`StockWeightCrossEtfChart`、`EtfRankingHistoryChart` 改為依選擇呼叫 3.1 的 Server Action，以 Map 暫存已載入資料、忽略過期回應，載入中顯示載入狀態、失敗顯示錯誤訊息（需求：History page loads data on demand；決策：history 頁按需載入）。驗證：`yarn tsc --noEmit`、`yarn eslint` 三個檔案無新錯誤；Playwright 實測「各 ETF 排名史」選 00981A、「個股跨 ETF」選 2330 時，圖表最新日期等於 SQL 最新日、日期數等於 SQL 近 90 天相異日期數；結果記到本任務下方。
  - 實測（2026-11-15）：`yarn tsc --noEmit` 通過；三檔 ESLint 0 錯誤。Playwright 攔截 Server Action 回應：「個股跨 ETF」2330 → 64 個相異日期、最新 2026-11-13（SQL：64、2026-11-13）；「各 ETF 排名史」00981A → 59 個相異日期、最新 2026-11-13，畫面「最新排名」標示 2026-11-13（SQL：59、2026-11-13）。切走再切回已載入代碼時未再發請求（Map 暫存生效）。

## 4. 共識趨勢

- [x] 4.1 [after: 1.1] `fetchOverlapTrend` 改用 `fetchAllRows` 讀近 90 天 `etf_stock_overlap` 的 `data_date, etf_count`，排序 `data_date` + `stock_code`，cache key 改為 `overlap-trend-v2`（需求：Consensus trend aggregates every overlap row；決策：共識趨勢分頁聚合）。驗證：`yarn tsc --noEmit` 通過；Playwright「共識趨勢」點數等於 SQL `SELECT count(DISTINCT data_date) FROM etf_stock_overlap WHERE data_date >= current_date - 90`；結果記到本任務下方。
  - 實測（2026-11-15）：`yarn tsc --noEmit` 通過。SQL 近 90 天 25,730 列、64 個相異日期，`(data_date, stock_code)` 唯一。Playwright `/investment/history` 頁面傳給共識趨勢的資料有 64 個日期點、最新 2026-11-13（= SQL）。

## 5. 收尾

- [x] 5.1 [after: 2.1, 2.2, 2.3, 3.3, 4.1] 全面驗證：`yarn test`、`yarn tsc --noEmit`、所有改動檔 `yarn eslint` 無新錯誤，並以 Playwright 截圖確認個股頁「ETF 持倉歷史」顯示到資料庫最新日（需求：Stock weight history API returns complete history）。驗證：測試與型別輸出摘要、截圖檢查結論記到本任務下方。
  - 實測（2026-11-15）：`yarn test` 127 suites / 1,073 tests 全數通過；`yarn tsc --noEmit` 通過；15 個改動檔 ESLint 共 1 error + 1 warning，皆與 HEAD 版本相同（`HoldingsPriceOverlayChart` 的 `set-state-in-effect`、`history/page.tsx` 的 `consistent-type-definitions`；page 由 2 筆降為 1 筆），無新增。Playwright 截圖 `/investment/stock/2330`「ETF 持倉歷史」：各 ETF 線延伸到 11 月中（修正前止於 2026-07-02），同頁 API 回 2,905 點、最新 2026-11-13（= SQL）。
  - verify／review 後修正（2026-11-15）：
    - `useOnDemandWeightHistory` 抽到 `src/hooks/investment/useOnDemandWeightHistory.ts`（`HistoryTabs.tsx` 153 → 115 行）；同一代碼進行中的請求共用、以遞增序號只採最新選擇的回應。新增 5 個 hook 測試，「A → B → A 時 A 仍在載入」測試在舊實作失敗（對 A 發兩次請求），新實作通過。
    - Server Actions 擋空的或格式不對的代碼（英數 1–10 碼），避免空代碼退化成「全部 ETF × 90 天」；新增 4 組測試，改動前失敗。
    - 圖表元件只在 `useEffect` 通知選擇變更。
    - 新增 `src/app/api/investment/etf-weight-history/__tests__/route.test.ts`（400／依 ETF 分組／500）與 `src/components/features/investment/__tests__/WeightHistoryLoadStates.test.tsx`（疊圖錯誤、兩圖表的載入中與錯誤畫面）；兩者都做了刻意改壞實作的檢查，確認測試會失敗後再還原。
    - spec「Weight history queries use a stable order」改為 `etf_stock_overlap` 依 `data_date` + `stock_code` 排序（使用者同意），`spectra validate` 通過。
    - 頁首交易日數查證：2330 持股資料比股價多 5 天（2026-09-25、09-28、10-09、10-23、10-26），其中 4 天是國定假日，屬休市日仍有持股公告；頁首的 60 天維持不變。
    - 結果：`yarn test` 130 suites / 1,092 tests 通過；`yarn tsc --noEmit` 通過；本輪改動檔 ESLint 0 筆；Playwright 重跑結果與前次一致（2330 API 2,905 點、疊圖 90 天 1,000 + 272 列、頁首 60 天、跨 ETF 64 日、00981A 59 日、共識趨勢 64 點，最新皆 2026-11-13）。
