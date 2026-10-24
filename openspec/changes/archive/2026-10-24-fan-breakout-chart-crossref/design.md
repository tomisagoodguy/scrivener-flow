## Context

- 均線發散候選頁由 `FanBreakoutScreener` 組成：篩選列（日期區間、首次／再次、最少連續天數、上市／上櫃）→ 分頁表格 → 單張 `FanBreakoutChartPanel`（`StockChart` + `usePriceData` 前端逐股抓價、MA5/10/20/60/120、入選日標記、上一檔／下一檔與 ←/→ 鍵）。資料來自 `getFanBreakoutSignals()`，近 30 天、每列為「某股某訊號日」，同一股票可出現多列；預設排序為訊號日新到舊。
- 策略圖表頁（`?view=chart`）由 `StrategyChartViewer` 把 `buildMonitorStocks()` 的結果轉成 `StockSlide` 交給 `BareKScrollViewer`：sticky 子導覽列（返回、目前股票、上/下一支與位置）、連續 section、IntersectionObserver 只渲染「已到訪 ±1」、超過 3 支顯示右側跳轉點。每格是 `BareKChart`（裸K六面板，資料為 Pipeline 預算的 `bare_k_snapshots`）。
- 裸K快照由 `SyncBareKStep` 同步「自選股 + 最新日 `is_selected` 策略股」，上限 50 支；快照的均線只有 ma5/ma20/ma60/ma120/h260，沒有 ma10。`BareKChart` 的策略標籤直接顯示傳入字串，目前傳的是策略 id（例如 `fan_breakout`）。
- `BareKScrollViewer` 已 205 行，超過元件 150 行上限；`bare-k/[code]` 頁面也使用它（會在捲動時 `history.replaceState` 到 `/investment/bare-k/<code>`）。

## Goals / Non-Goals

**Goals:**

- 候選頁可切換「連續看圖」，沿用捲動檢視器的導覽體驗，每格保留均線 + 入選日標記，並看到該列的關鍵欄位。
- 策略圖表頁可依策略與均線發散訊號型態篩選；策略標籤顯示中文名稱；均線發散候選在圖上看得到入選脈絡。
- 捲動檢視器只維護一份實作，裸K看盤頁行為不變。

**Non-Goals:**

- 不在裸K快照新增 MA10（需改 `bare_k_service` 與快照 JSON 形狀，屬 Pipeline 變更）；策略圖表頁維持快照既有的 4 條均線。
- 不改 `SyncBareKStep` 的 50 支上限與選股來源；候選頁連續看圖不依賴快照。
- 不把策略圖表頁篩選狀態寫入 URL；不改策略視角／監控清單兩個 view。
- 不改均線發散策略的選股條件、`getFanBreakoutSignals()` 的查詢與快取。
- 連續看圖模式不新增鍵盤導覽；不同步「捲動到的股票」回表格選取列。

## Decisions

### 抽出泛型捲動殼層 ScrollChartViewer

新增泛型元件 `ScrollChartViewer<T extends ScrollSlide>`，負責 sticky 子導覽列、section 排列、IntersectionObserver 懶渲染、右側跳轉點；每格內容與標題附加資訊由呼叫端以 `renderSlide`／`renderHeaderExtra` 提供。子導覽列拆成 `ScrollChartSubNav`，讓兩檔都 ≤150 行。`BareKScrollViewer` 改為薄包裝：以 `BareKSlideContent`（快照圖或「尚未同步」佔位卡，含原 isOwner 提示）當 `renderSlide`，並透過 `onActiveChange` 保留 `history.replaceState` 行為，外部 props 不變。

替代方案：在 `BareKScrollViewer` 直接加可選 `renderSlide`——預設分支需要 `snapshot` 欄位，泛型下要靠型別斷言才能共存，違反禁 `any`／少斷言原則，且檔案會更長。

### 候選頁連續看圖：每股只取最新訊號列

連續看圖的清單 = `latestRowPerStock(filterRows(rows, filters))`：依輸入順序保留每個 `stockId` 第一次出現的列（輸入已是訊號日新到舊，故為最新訊號列）。理由：同一股票連看多張相同 K 線沒有意義，且捲動殼層以股票代號為 section key。起始位置為目前表格選取列的股票在去重清單中的索引，找不到則 0。

### 模式狀態放在 useFanBreakoutScreener

`viewMode: 'table' | 'continuous'` 與 `setViewMode` 由 `useFanBreakoutScreener` 管理；←/→ 鍵監聽只在 `table` 模式生效，避免連續模式下在背景偷偷改選取列。篩選列在兩種模式都顯示；連續模式隱藏表格、分頁與單張圖面板。篩選變更時以「篩選條件序列化字串」作為捲動殼層的 React key 讓它重掛載、回到第 1 支（殼層的已渲染集合與目前索引是依位置記錄，清單換了必須重置）。

### FanBreakoutSlideChart 為候選頁兩種模式共用的圖

把 `FanBreakoutChartPanel` 內「`usePriceData` + 載入／錯誤文字 + `StockChart`（MA5/10/20/60/120、入選日標記）」抽成 `FanBreakoutSlideChart`，單張面板與連續看圖每格都用它（單一事實來源）。連續模式不改用裸K快照：歷史訊號日的候選可能不在最新日策略股中、沒有快照，而且快照缺 MA10。

### 策略圖表頁篩選為純函式 filterChartStocks

在 `strategyUtils.ts` 新增 `filterChartStocks()` 與 `countStocksByStrategy()` 純函式；`StrategyChartFilterBar` 只負責 UI，篩選狀態放在 `StrategyChartViewer` 的 `useState`。策略選項只列出目前股票清單中出現的策略，標籤為中文名稱 + 檔數。兩個篩選條件為 AND。

### 均線發散入選日標記疊在裸K K 線面板

頁面在 `view=chart` 時額外呼叫 `getFanBreakoutSignals()`，取 `date === latestDate` 的列建成 `Record<stockId, FanBreakoutRow>` 傳給 `StrategyChartViewer`。命中的股票：標題附加 spread／首次或再次／連續天數，`BareKChart` 收到 `markerDates`（`recentSignalDates`），由 `createKLinePanel` 以 `createSeriesMarkers` 在 K 棒下方畫向上箭頭（只畫快照 ohlcv 內有的日期，色同 `StockChart` 標記 `#e11d48`）。查詢失敗時視同無命中，圖表頁其餘功能不受影響。

### 策略標籤改顯示中文名稱

頁面把 `result.strategies` 的 `id → description` 組成 `strategyLabels` 傳入 `StrategyChartViewer`，傳給 `BareKChart` 的 `strategies` 改為中文名稱（查不到時退回 id）。

## Implementation Contract

**Behavior**

- 候選頁：篩選列下方出現「表格／連續看圖」切換（預設表格）。切到連續看圖後，看到去重後的候選依序垂直排列，sticky 子導覽列顯示目前股票與「第 n / 共 N」，>3 支時有右側跳轉點；子導覽列的返回鍵文字為「返回表格」，按下回到表格模式。每格標題在代號、名稱後依序顯示：訊號日、spread（`+12.3%`，一位小數）、首次／再次、連續 N 天、訊號後報酬（>0 `text-rose-600 dark:text-rose-400`、<0 `text-emerald-600 dark:text-emerald-400`、0 為灰色、null 顯示「—」）。缺值欄位不顯示（訊號後報酬例外，顯示「—」）。篩選後 0 筆時顯示既有文字「沒有符合篩選條件的候選。」且不渲染捲動殼層。
- 策略圖表頁：檢視器上方出現篩選列，「策略」下拉（「全部策略」+ 各策略「中文名（N）」）與「均線發散」下拉（全部／首次／再次）。篩選後 0 支時顯示「沒有符合篩選條件的股票」。策略標籤為中文。均線發散命中股的標題附加「發散 +x.x%・首次|再次・連續 N 天」，K 線上有入選日箭頭。返回鍵仍導向 `/investment/strategy`。
- 裸K看盤頁（`/investment/bare-k/[code]`）：外觀與網址同步行為完全不變。

**Interface / data shape**

```ts
// ScrollChartViewer.tsx
export interface ScrollSlide { code: string; name: string }
export interface ScrollChartViewerProps<T extends ScrollSlide> {
  slides: T[];
  initialIndex: number;
  renderSlide: (slide: T, index: number) => React.ReactNode;
  renderHeaderExtra?: (slide: T, index: number) => React.ReactNode;
  backHref?: string;           // 與 onBack 二擇一；都沒給時預設 '/investment/bare-k'
  onBack?: () => void;         // 有值時返回鍵為 <button>
  backLabel?: string;          // 預設「返回」
  onActiveChange?: (slide: T, index: number) => void;
}

// fanBreakout.ts
export function latestRowPerStock(rows: FanBreakoutRow[]): FanBreakoutRow[];

// strategyUtils.ts
export interface ChartStockFilters { strategy: 'all' | string; fanSignal: 'all' | FanBreakoutSignalType }
export const DEFAULT_CHART_STOCK_FILTERS: ChartStockFilters; // { strategy: 'all', fanSignal: 'all' }
export function filterChartStocks<T extends { stock_id: string; strategies: string[] }>(
  stocks: T[], filters: ChartStockFilters, fanSignalTypes: Record<string, FanBreakoutSignalType | null>,
): T[];
export function countStocksByStrategy(stocks: { strategies: string[] }[]): Record<string, number>;

// BareKChart props 新增
markerDates?: readonly string[];
// StrategyChartViewer props 新增
strategyLabels: Record<string, string>;
fanBreakoutByStock: Record<string, FanBreakoutRow>;
// useFanBreakoutScreener 回傳新增
viewMode: 'table' | 'continuous'; setViewMode: (m: 'table' | 'continuous') => void;
continuousRows: FanBreakoutRow[]; continuousInitialIndex: number;
```

**Failure modes**

- `getFanBreakoutSignals()` 在圖表頁回傳 `error` → `fanBreakoutByStock` 為空物件，不顯示錯誤、圖表頁照常（候選頁本身仍會顯示錯誤，屬既有行為）。
- 連續模式單格 `usePriceData` 失敗 → 該格顯示錯誤文字，其他格不受影響。
- `fanSignal` 篩選不為 all 時，未命中均線發散的股票一律排除（不是保留）。

**Acceptance criteria**

- `yarn test --testPathPatterns "fanBreakout|strategyUtils|ScrollChartViewer|FanBreakoutScreener|StrategyChartViewer"` 全綠，涵蓋 specs 每個 scenario。
- `yarn tsc --noEmit` 與 `yarn lint` 無新錯誤。
- 新增／修改的元件檔皆 ≤150 行。
- 實跑兩頁（登入後）確認：切換、去重、篩選重置、標籤中文、箭頭標記、返回行為；並開 `/investment/bare-k/<code>` 確認捲動時網址仍同步。

**Scope boundaries**

- In scope：上述元件、兩個純函式模組、策略頁 `view=chart` 分支的資料組裝。
- Out of scope：Pipeline、DB、快照 MA10、URL 篩選參數、策略視角／監控清單、`getFanBreakoutSignals()` 內部。

## Risks / Trade-offs

- [連續模式已到訪的格不卸載，往下捲很多支會累積多個 lightweight-charts 實例與價格請求] → 與既有圖表頁行為一致；候選數受 30 天視窗限制，先接受，若實測卡頓再另開 change 做視窗外卸載。
- [圖表頁多一個 `getFanBreakoutSignals()` 呼叫拖慢首屏] → 該 action 已用 `unstable_cache`，且只在 `view=chart` 才呼叫，與 `getStrategySnapshots` 並行。
- [拆殼層可能改變裸K看盤頁行為] → 以 `ScrollChartViewer` 元件測試鎖住 onActiveChange、跳轉點門檻、返回連結；並實跑 bare-k 頁確認。
- [策略圖表頁的均線少 MA10，與候選頁圖不完全一致] → 屬已知限制，寫在 Non-Goals；入選日箭頭仍能提供脈絡。
