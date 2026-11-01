## Context

「換股後表現」面板（`StrategyTradePerformancePanel`）已在 client 端持有 `getStrategyTradePerformance()` 回傳的全部 trades（持有中＋近 60 天換出），並以 `splitByReturn()` 產生正／負報酬兩欄文字清單。策略頁其他地方已有兩套連續捲動裸K圖：`StrategyChartViewer`（伺服器端一次嵌入快照）與 `ConsensusChartViewer`（`LazyBareKSlide` 按需載入快照）。`BareKSlideContent` 已支援 `holdingMarks`（買／賣日與持有區間），但 `LazyBareKSlide` 尚未轉傳此 prop。

## Goals / Non-Goals

**Goals:**

- 面板內切換到圖表模式，看正報酬持有股的 K 線，順序與列表的正報酬欄一致（報酬高到低）。
- 不增加伺服器端查詢與頁面 payload。

**Non-Goals:**

- 負報酬、近期換出個股的圖表。
- 把模式寫進 URL、回查 60 天以前的歷史持有紀錄。

## Decisions

### 決策 1：圖表模式放在面板內，以 client state 切換

在面板標題列加「列表／圖表」切換，與既有策略切換同為 `useState`，不改 URL。圖表模式只取代正／負報酬兩欄、產業表與近期換出區塊，保留標題列、策略切換、摘要（`TradeSummary`）與附註。

替代方案：新增 `view=trades&tview=chart` URL 參數（如共選面板的 `cview`）。否決：需改 Server Component 讀參數，且策略切換本來就不進 URL，兩者一進一出會造成重新整理後狀態不一致。

### 決策 2：快照用 LazyBareKSlide 按需載入

正報酬股數量可達數十檔（估計值；以實際 `splitByReturn(trades).positive` 去重後筆數為準），伺服器端一次嵌入全部快照會讓 `view=trades` 首屏 payload 變大，且使用者未必切到圖表。沿用 `LazyBareKSlide` 停留 300ms 才請求、一生只請求一次的閘門，並如 `ConsensusChartViewer` 設 `showJumpDots={false}`。

替代方案：在 page.tsx 預先 `getStrategySnapshots()`。否決：理由如上，使用者沒切到圖表模式也要付出查詢與 payload 成本。

### 決策 3：同股多策略去重，取最高報酬

「全部」模式下同一股票可能被多個策略持有。圖表以股票為單位：每檔只出現一次，排序鍵為其所有正報酬 trade 的最高 `holdingReturn`，標頭顯示該最高報酬與對應 trade 的持有天數，標籤列出所有正報酬持有它的策略簡稱（依報酬遞減）。

替代方案：每筆 trade 一段圖。否決：同一張 K 線重複出現，捲動冗長。

### 決策 4：持有標記由面板 trades 在 client 端推導

新增純函式把 `StrategyTrade[]` 轉成 `StrategyHoldingRow[]` 後呼叫既有 `buildHoldingMarks()`，輸入為「目前策略範圍內該股的全部 trades」（含持有中與近 60 天換出，正負報酬皆含），因此標記包含同股其他策略的進出點。`LazyBareKSlide` 新增選填 `holdingMarks?: StrategyHoldingMarks`，原樣轉傳給 `BareKSlideContent`；未傳時行為不變。

替代方案：圖表模式另呼叫 `getStrategyChartTrades()` 取 400 天紀錄。否決：多一次 Server Action 排隊請求，且非本需求重點。

## Implementation Contract

**Behavior**

- 面板標題列出現「列表」「圖表」兩個選項，預設「列表」，畫面與現況相同。
- 選「圖表」後：摘要保留；其下改為連續捲動裸K圖，順序為去重後最高報酬遞減；每段標頭顯示「12.34%」（`returnColorClass` 紅色）、「N 天」與策略簡稱標籤（僅「全部」模式顯示標籤）。
- 切換策略時圖表重掛載回到第 1 檔（以策略 id 當 `key`）。
- 範圍內無正報酬持有股時顯示「目前無正報酬持有股」。

**Interface / data shape**（`src/lib/investment/strategyTradeUtils.ts`）

```ts
export interface WinnerStock {
    stockId: string;
    name: string | null;
    /** 該股正報酬 trades 中最高者 */
    best: StrategyTrade & { holdingReturn: number };
    /** 正報酬持有此股的策略 id，依報酬遞減、去重 */
    strategyIds: string[];
}
/** 持有中、已進場、報酬 > 0 的個股，同股去重，依最高報酬遞減；同報酬依 stockId 升冪 */
export function rankWinnerStocks(trades: StrategyTrade[]): WinnerStock[];
/** StrategyTrade → buildHoldingMarks 的輸入列，再彙整成每股標記 */
export function holdingMarksFromTrades(trades: StrategyTrade[]): Record<string, StrategyHoldingMarks>;
```

新元件 `TradeWinnersChartViewer`（`src/components/features/strategy/TradeWinnersChartViewer.tsx`）props：`trades: StrategyTrade[]`（已依策略切換過濾）、`strategyShortLabels?: Record<string, string>`、`resetKey: string`、`onBack: () => void`（子導覽列「返回列表」鍵，由面板傳入切回列表模式）。

**Failure modes**

- 單檔快照載入失敗：沿用 `LazyBareKSlide` 的「圖表載入失敗」卡片，其他段落不受影響。
- 該股無裸K快照：沿用 `BareKSlideContent` 的 `noSnapshotMessage`。
- `holdingReturn` 為 null 或 `entryDate` 為 null 的 trade 不進圖表（與 `splitByReturn` 母體一致）。

**Acceptance criteria**

- `yarn test --testPathPatterns strategyTradeUtils` 涵蓋 `rankWinnerStocks` 排序、去重、排除 ≤0／待進場／已出場，與 `holdingMarksFromTrades`。
- `yarn test --testPathPatterns TradeWinnersChartViewer` 與 `StrategyTradePerformancePanel`、`LazyBareKSlide` 綠燈。
- `yarn tsc --noEmit` 無錯；`yarn eslint` 改動檔無新錯。
- 本地 `yarn dev` 開 `/investment/strategy?view=trades`，切「圖表」可見第 1 檔 K 線與標頭報酬，結果記錄於 tasks.md。

**Scope boundaries**

- In scope：上列四個檔案與其測試。
- Out of scope：page.tsx 資料載入、`getStrategyTradePerformance`、DB／pipeline、`StrategyChartViewer`。

## Risks / Trade-offs

- [持有標記只涵蓋近 60 天換出] → 較早的進出點不會畫出；圖表主題是「目前持有中」，可接受，已列 Non-Goal。
- [正報酬股數量多時捲動很長] → 子導覽列提供上一檔／下一檔，且按需載入不影響效能；是否限筆數待實際數量觀察。
