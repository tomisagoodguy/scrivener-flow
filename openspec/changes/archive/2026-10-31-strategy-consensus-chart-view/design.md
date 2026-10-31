## Context

`/investment/strategy` 是 Server Component（`src/app/investment/strategy/page.tsx`），由主檢視參數 `view`（未設＝策略視角、`monitor`、`chart`）與共選參數 `cmin` / `cview` / `cwin` 決定內容。共選股清單 `consensusStocks` 在伺服器端算好：最新模式用 `buildMultiConsensusStocks`（不多查 DB），近 N 天模式用 `getStrategyConsensusHistory` + `buildConsensusHistory`，兩者都依共選數遞減、代號遞增排序。`MultiStrategyConsensusPanel` 依 `params.view` 顯示列表（`ConsensusStockChip`）或矩陣（`ConsensusMatrix`），切換由 `ConsensusControls` 以 `<Link>` 組 URL。

連續捲動裸K圖已有共用元件 `ScrollChartViewer`（`slides` 需含 `code`、`name`），以及按需載入快照的 `LazyBareKSlide`（段落在視窗內停留 `DWELL_MS`＝300ms 才呼叫 `getStrategySnapshots([code])`、一生只請求一次）。選股池圖表頁 `PoolChartViewer` 即是「`ScrollChartViewer` + `LazyBareKSlide`」的組合範例。專案規則：元件檔 ≤150 行；`ScrollChartViewer` 外層需 `pt-6` 抵銷子導覽列的負 margin；瀏覽器端 Server Action 會排隊，禁止「掛載即請求」。

## Goals / Non-Goals

**Goals:**

- 共選面板多一個「圖表」切換（`cview=chart`），顯示與列表完全相同的股票集合與順序的連續捲動裸K圖。
- 最新模式與近 N 天模式都能用圖表，切換門檻或時間窗時圖表跟著換。
- 圖表模式下頁面只留共選面板與圖表，不再接策略分析面板與策略卡片。

**Non-Goals:**

- 不改動主檢視 `?view=chart`（全部策略股圖表）、`StrategyChartViewer` 與其篩選列。
- 不在共選圖表加均線發散脈絡、策略篩選或其他新篩選條件。
- 不改共選計算規則、排序、門檻選項或時間窗選項。
- 不新增資料表、Server Action、API Route 或 pipeline 步驟。

## Decisions

### 圖表作為 cview 的第三個值，而非新的主檢視

共選圖表以 `cview=chart` 表示，與 `list`、`matrix` 並列，掛在策略視角（未設 `view`）底下。這樣 `cmin` / `cwin` 的 URL 組裝、近 N 天歷史查詢（`needsHistory` 只在非 `monitor`、非主 `chart` 時為真）全部沿用，不需要在主檢視層再複製一套共選參數。替代方案「新增主檢視 `view=consensus-chart`」被否決：要把 `cmin`/`cwin` 解析與歷史查詢條件再接一次，且主檢視切換列會多一顆與共選面板重複的按鈕。

### 快照沿用 LazyBareKSlide 按需載入

每段圖表直接渲染 `LazyBareKSlide`，伺服器端不預查快照。共選股在「≥2、近 30 天」時可能有數十檔（估計值，未實測；可在 production 以 `?cmin=2&cwin=30` 看面板顯示的「N 支」確認），一次嵌入全部快照會讓 RSC payload 過大；而主檢視圖表的做法（`getStrategySnapshots` 伺服器端一次查全部）只適合固定且較少的股票。`LazyBareKSlide` 已有停留閘門與錯誤狀態，直接共用，不複製。它目前位於 `pool/` 目錄，本 change 僅跨目錄 import，不搬移檔案。

### 新元件 ConsensusChartViewer 封裝圖表

新增 `src/components/features/strategy/ConsensusChartViewer.tsx`（Client Component），把 `MultiConsensusEntry[]` 轉成 `ScrollChartViewer` 的 slides，並負責標頭資訊與空狀態。面板只決定「渲染哪一種檢視」，保持 ≤150 行。

### 圖表模式下隱藏策略分析面板與策略卡片

`cview=chart` 時，策略視角只渲染 `MultiStrategyConsensusPanel`（其內含圖表），不渲染 `StrategyAnalyticsPanel` 與策略卡片格。連續捲動圖表本身就佔滿數個螢幕，後面再接卡片會讓使用者捲不到底、也與 sticky 子導覽列互相干擾。列表與矩陣模式的版面完全不變。

### URL 組裝函式移到 strategyConsensusUtils 共用

`ConsensusControls` 內部的 `buildHref` 搬到 `strategyConsensusUtils.ts` 並匯出為 `buildConsensusHref(params)`（行為不變：省略預設值、參數順序 `cmin → cview → cwin`），讓 `ConsensusChartViewer` 的返回連結（同參數、`view: 'list'`）與控制列共用同一個實作。

## Implementation Contract

**Behavior**

- 共選面板的檢視切換顯示三個選項「列表 / 矩陣 / 圖表」；點「圖表」後 URL 帶 `cview=chart`，保留目前的 `cmin`、`cwin`，面板標題列與門檻、時間窗切換仍在，原本的 chip 列表位置改為連續捲動裸K圖。
- 圖表的股票集合與順序等於同參數下列表模式顯示的股票（同一份 `consensusStocks`）。
- 每段標頭的額外資訊：`{count} 策略共選`，接著列出各策略的 `shortStrategyLabel`；近 N 天模式且有 `lastDate` 時再加 `最後 {MM/DD}`（用既有 `formatMonthDay`）。裸K圖的標籤（`LazyBareKSlide` 的 `strategies`）傳策略簡稱陣列。
- `ScrollChartViewer` 設定：`initialIndex=0`、`showJumpDots={false}`（股數可能多，跳轉點會超出畫面）、`backHref=buildConsensusHref({ ...params, view: 'list' })`。外層 `div` 加 `pt-6`。
- 共選股為 0 檔時，顯示「目前條件下無共選股」，不渲染 `ScrollChartViewer`。
- 圖表模式時頁面不渲染 `StrategyAnalyticsPanel` 與策略卡片格；資料日期標題列與主檢視切換列仍在。

**Interface / data shape**

- `ConsensusView = 'list' | 'matrix' | 'chart'`。
- `parseConsensusParams({ cview: 'chart' })` 回傳 `view: 'chart'`；其他無法辨識的值回退 `'list'`。
- `buildConsensusHref(params: ConsensusParams): string` 從 `strategyConsensusUtils.ts` 匯出，`ConsensusControls` 改用它。
- `ConsensusChartViewer` props：`{ stocks: MultiConsensusEntry[]; params: ConsensusParams }`。slides 型別：`{ code: string; name: string; entry: MultiConsensusEntry }`，`name` 在 `entry.name` 為空時用 `stock_id`。

**Failure modes**

- 單檔快照請求失敗：沿用 `LazyBareKSlide` 的「圖表載入失敗」卡片，不影響其他段落。
- 單檔無快照：沿用 `LazyBareKSlide` 的「此股票尚未同步裸K資料」訊息。
- 近 N 天歷史查詢失敗：維持頁面目前的錯誤行為，本 change 不新增處理。

**Acceptance criteria**

- `yarn test --testPathPatterns buildMultiConsensusStocks` 涵蓋 `cview=chart` 解析與 `buildConsensusHref` 輸出。
- `yarn test --testPathPatterns ConsensusChartViewer` 涵蓋 slides 順序、標頭內容、返回連結、空狀態。
- `yarn test --testPathPatterns MultiStrategyConsensusPanel` 涵蓋 `cview=chart` 時渲染圖表、不渲染 chip 列表，以及三個切換選項的 href。
- `yarn tsc --noEmit` 無新錯誤；`yarn eslint` 改動檔無新錯誤。
- 本地 `yarn dev` 開 `/investment/strategy?cview=chart` 與 `?cmin=3&cview=chart&cwin=14`，確認圖表數量等於面板顯示的「N 支」、分析面板與策略卡片不出現、子導覽列沒有壓到面板。

**Scope boundaries**

- In scope：`strategyConsensusUtils.ts`、`ConsensusControls.tsx`、`MultiStrategyConsensusPanel.tsx`、新檔 `ConsensusChartViewer.tsx`、`strategy/page.tsx` 的條件渲染，以及上述測試。
- Out of scope：`StrategyChartViewer`、`ScrollChartViewer`、`LazyBareKSlide` 本身的行為、主檢視切換列、任何資料層。

## Risks / Trade-offs

- [股數多時捲動很長] → 子導覽列提供上一檔／下一檔；`showJumpDots` 關閉避免溢出。使用者可用 `cmin` 提高門檻縮小集合。
- [`LazyBareKSlide` 位在 `pool/` 卻被策略模組 import] → 目錄歸屬不理想，但搬移會牽動選股池測試路徑；本 change 先跨目錄 import，搬移留待日後重構。
- [圖表模式隱藏策略卡片可能讓使用者以為卡片消失] → 切回「列表」或「矩陣」即恢復；切換列在面板上方一直可見。
