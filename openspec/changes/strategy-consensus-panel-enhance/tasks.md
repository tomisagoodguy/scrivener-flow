## 1. 資料型別與每策略日期

- [x] 1.1 StrategyEntry 新增每策略日期（Per-strategy data date exposure）：`StrategyEntry` 加必填 `date: string`；`_getStrategySignals` 顯式日期分支填該日期、視窗分支填該策略自身最新日期；快取 key 升為 `strategy-signals-v4`；補齊 `src/__tests__/lib/buildMultiConsensusStocks.test.ts`、`src/components/features/__tests__/StrategySignalCard.test.tsx` 等 fixture。驗證：`yarn tsc --noEmit` 無錯，`yarn test --testPathPatterns StrategySignalCard` 綠燈。

## 2. 純函式（先寫測試）

- [x] 2.1 [P] URL 參數驅動的面板控制：先寫測試再實作 `parseConsensusParams`（`strategyConsensusUtils.ts`），`cmin` 僅接受 2/3/4、`cview` 僅 list/matrix、`cwin` 僅 latest/7/14/30，其餘回退預設（Consensus threshold switch、Consensus matrix view toggle、Consensus window mode switch 的參數解析）。驗證：`yarn test --testPathPatterns buildMultiConsensusStocks` 涵蓋 `cmin=9`→2、`cview=foo`→list、`cwin=5`→latest。
- [x] 2.2 共選計算回傳策略清單並接受門檻（Cross-strategy count computed server-side）：先改測試再實作 `buildMultiConsensusStocks(result, minCount = 2)`，以 `Set` 去重計數、回傳 `strategies: {id,label}[]`（label 取 `getStrategyDescriptions()`，缺則用 id）、依門檻過濾、count 降冪 + stock_id 升冪排序。驗證：`yarn test --testPathPatterns buildMultiConsensusStocks` 含 spec 排序範例、門檻 3 排除 count 2、同策略重複 stock 只算一次。
- [x] 2.3 [P] 近 N 天聚合純函式（Distinct-strategy count over a calendar window）：先寫 `src/__tests__/lib/buildConsensusHistory.test.ts` 再實作 `buildConsensusHistory(rows, stockInfo, minCount)`，計算不同策略數、最後選中日期、補 name/industry、門檻過濾與排序。驗證：`yarn test --testPathPatterns buildConsensusHistory` 涵蓋 spec 範例（2330 count 2、lastDate 2026-10-21）。
- [x] 2.4 [P] 矩陣資料純函式（Stock by strategy matrix rendering 的資料層）：先寫測試再實作 `buildConsensusMatrix(entries)`，欄依選中列數降冪、id 升冪排序，cells 為布林陣列。驗證：`yarn test --testPathPatterns ConsensusMatrix` 涵蓋 spec 欄排序範例（capital_layer, trend_template, low_vol_alpha）。

## 3. Server Action

- [x] 3.1 近 N 天共選以 Server Action 查詢並以純函式聚合：新增 `getStrategyConsensusHistory(days)`（`'use server'`、`getPublicClient()`、`unstable_cache` key `strategy-consensus-history-v1` + days、revalidate 3600），非法 days 直接回空、`.range()` 每頁 1000 取完、錯誤 `console.error` 後回空 rows，回傳 `{ rows, stockInfo }`。驗證：`yarn tsc --noEmit` 無錯，並以 `?cwin=30` 實跑頁面確認有列出股票且 server log 無錯誤。

## 4. 元件（面板拆分為控制列、股票卡與矩陣）

- [x] 4.1 [P] `ConsensusControls`：渲染門檻（≥2/≥3/≥4）、檢視（列表/矩陣）、區間（最新/近7天/近14天/近30天）三組 `<Link>`，每個連結保留另兩組參數，目前選項高亮（Consensus threshold switch、Consensus matrix view toggle、Consensus window mode switch）。驗證：元件測試斷言在 `cmin=3&cview=matrix` 下「近14天」連結 href 為 `?cmin=3&cview=matrix&cwin=14`，檔案 ≤150 行。
- [x] 4.2 [P] `ConsensusStockChip`：由既有 chip 抽出，加策略名稱 badge；`movement`/`etfHolders` 缺省時不渲染對應 badge，有 `lastDate` 時顯示 `MM/DD`（History mode entry display）；漲跌色維持紅漲綠跌。驗證：元件測試斷言 history entry 不出現「未持有」文字且顯示最後選中日期，策略名稱 badge 正確。
- [x] 4.3 [P] `ConsensusMatrix`：以 `buildConsensusMatrix` 輸出渲染表格，列頭連結 `/investment/stock/<id>`，欄頭策略短名（截 8 字 + `title` 全名）與最新模式日期，最後一欄為 count，外層 `overflow-x-auto`；空清單顯示「目前條件下無共選股」。驗證：`yarn test --testPathPatterns ConsensusMatrix` 斷言 3055 列三格填滿、2464 列兩格。
- [x] 4.4 重組 `MultiStrategyConsensusPanel`（Multi-strategy consensus panel display）：策略數 <2 時回 null；否則永遠顯示標題 + `ConsensusControls`；最新模式顯示各策略名稱與資料日期（落後頂層日期者 `text-gray-400`），近 N 天模式改顯示「統計區間：近 N 天（不同策略數）」；依 view 切換 chip 列表或矩陣；空結果顯示「目前條件下無共選股」。驗證：更新 `src/__tests__/components/MultiStrategyConsensusPanel.test.tsx` 涵蓋單一策略不渲染、零結果顯示空狀態文字、落後日期為 muted，`yarn test --testPathPatterns MultiStrategyConsensusPanel` 綠燈且檔案 ≤150 行。

## 5. 頁面接線與驗收

- [x] 5.1 `src/app/investment/strategy/page.tsx` 解析 `cmin`/`cview`/`cwin`，最新模式用 `buildMultiConsensusStocks(result, minCount)`，近 N 天模式才呼叫 `getStrategyConsensusHistory(window)` 並以 `buildConsensusHistory` 聚合，傳入面板；監控/圖表檢視不渲染面板。驗證：`yarn tsc --noEmit`、`yarn lint` 無錯，`yarn test --testPathPatterns "buildMultiConsensusStocks|buildConsensusHistory|ConsensusMatrix|MultiStrategyConsensusPanel|StrategySignalCard"` 全綠。
- [x] 5.2 實跑驗收：`yarn dev` 後以 Playwright 開 `/investment/strategy`、`?cmin=3`、`?cview=matrix`、`?cwin=14`，淺色/深色各截圖，並以 390px 寬確認矩陣橫向捲動不撐破頁面。驗證：截圖存於 `.playwright-mcp/`，逐張比對 spec 情境後刪除截圖。
