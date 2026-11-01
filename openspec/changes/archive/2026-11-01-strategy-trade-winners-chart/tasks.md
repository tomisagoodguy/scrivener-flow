## 1. 資料純函式

- [x] 1.1 在 `src/lib/investment/strategyTradeUtils.ts` 新增 `rankWinnerStocks(trades)`：只收持有中、已進場、`holdingReturn > 0` 的 trade，同股去重取最高報酬、`strategyIds` 依報酬遞減去重，排序為最高報酬遞減、同值依 stockId 升冪（需求：Winners chart stock selection and order；決策 3：同股多策略去重，取最高報酬）。驗證：`src/lib/investment/__tests__/strategyTradeUtils.test.ts` 新增案例涵蓋 spec 的 ordering 範例表（2317, 2330, 2454）、排除報酬 0／待進場／已出場，`yarn test --testPathPatterns strategyTradeUtils` 綠燈。
- [x] 1.2 在同檔新增 `holdingMarksFromTrades(trades)`：把 `StrategyTrade` 映射為 `StrategyHoldingRow`（stockId→stock_id 等）後交給既有 `buildHoldingMarks()`，待進場者略過（需求：Winners chart slide header and holding marks；決策 4：持有標記由面板 trades 在 client 端推導）。驗證：同一測試檔新增案例，斷言 2026-10-01 進場、持有中的 trade 產生 `entryDates: ['2026-10-01']` 與 `periods: [{ start: '2026-10-01', end: null }]`。

## 2. 按需載入圖表支援持有標記

- [x] 2.1 `LazyBareKSlide` 新增選填 `holdingMarks?: StrategyHoldingMarks` prop，載入完成後原樣傳給 `BareKSlideContent`；未傳時行為與現況相同（決策 2：快照用 LazyBareKSlide 按需載入；決策 4：持有標記由面板 trades 在 client 端推導）。驗證：`src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx` 新增案例斷言 prop 有轉傳，`yarn test --testPathPatterns LazyBareKSlide` 綠燈（含既有案例）。

## 3. 正報酬圖表元件與面板切換

- [x] 3.1 [after: 1.1, 1.2, 2.1] 新增 `src/components/features/strategy/TradeWinnersChartViewer.tsx`：以 `rankWinnerStocks` 產生 slides，用 `ScrollChartViewer`（`showJumpDots={false}`、外層 `pt-6`、`key={resetKey}`）＋ `LazyBareKSlide`（帶 `holdingMarksFromTrades` 結果），標頭顯示紅色報酬百分比、持有天數與（有傳 `strategyShortLabels` 時）策略簡稱；無符合股時顯示「目前無正報酬持有股」（需求：Winners chart stock selection and order；需求：Winners chart slide header and holding marks；需求：Winners chart empty state）。驗證：新增 `src/components/features/strategy/__tests__/TradeWinnersChartViewer.test.tsx`，斷言順序、去重後只出現一次、標頭「30.00%」帶 `text-rose-600`、「20 天」、空狀態文字，`yarn test --testPathPatterns TradeWinnersChartViewer` 綠燈。
- [x] 3.2 [after: 3.1] `StrategyTradePerformancePanel` 標題列加「列表／圖表」切換（client state、預設列表、不改 URL、切策略時保留模式）；圖表模式保留摘要與附註，以 `TradeWinnersChartViewer`（`resetKey` 為目前策略 id）取代正負報酬欄、產業表與近期換出（需求：Trade panel list and chart mode switch；決策 1：圖表模式放在面板內，以 client state 切換）。驗證：`src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx` 新增案例：預設可見 `trade-positive`；點「圖表」後 `trade-positive` 消失、圖表元件出現；既有案例不變綠燈。

## 4. 整體驗證

- [x] 4.1 [after: 3.2] 型別與 lint：`yarn tsc --noEmit` 無錯，`yarn eslint` 於本 change 改動檔無新錯；`yarn test --testPathPatterns "strategyTradeUtils|LazyBareKSlide|TradeWinnersChartViewer|StrategyTradePerformancePanel|ConsensusChartViewer|PoolChartViewer"` 全綠（需求：Trade panel list and chart mode switch）。
- [x] 4.2 [after: 4.1] 實跑：`yarn dev` 開 `/investment/strategy?view=trades`，切「圖表」確認第 1 檔為報酬最高者、標頭紅色報酬與天數、K 線有買進標記；再切到單一策略確認回到第 1 檔且無策略標籤。將檢查結果（實際第 1 檔代號與報酬、圖表總檔數）寫回本任務下方（需求：Winners chart slide header and holding marks；需求：Winners chart empty state）。
  - 實測結果（2026-11-01，`yarn dev` localhost:3000，headless Playwright 腳本，資料日 2026-10-30）：列表模式正報酬欄 19 筆；切「圖表」後正負欄消失、摘要保留，子導覽列「1 / 11」（同股去重後 11 檔）。第 1 檔 6672 騰輝電子-KY，標頭「80.45%」為 `text-rose-600`、「49 天」、策略簡稱「低波動 Alph …」，與列表正報酬欄第 1 筆 6672 一致；裸K圖按需載入成功，K 線上有「買」「賣」標記與持有區間底色（截圖人工確認）。切換為「券商籌碼排名選股」後回到第 1 檔：6108 競國「11.13%」「17 天」，標頭不顯示策略簡稱。空狀態由 `TradeWinnersChartViewer.test.tsx`「無正報酬持有股時顯示空狀態且不渲染圖表」涵蓋（實際資料各策略皆有正報酬股，無法實跑）。
