## Context

`/investment/strategy` 是 Server Component，以 `view` 參數決定主視角：未設＝策略視角、`monitor`＝監控清單、`chart`＝圖表；「均線發散候選」是連到獨立頁 `/investment/strategy/fan-breakout` 的連結。頂部切換列目前在 `page.tsx` 內寫了四段幾乎相同的 `<Link>` 樣板。上一個 change `strategy-trade-performance` 把「換股後表現」面板放在策略視角的共選面板之後、策略卡片之前，資料由 `getStrategyTradePerformance()` 在 `Promise.all` 中並行取得。

## Goals / Non-Goals

**Goals:**

- 「換股後表現」成為切換列的第五個分頁（`?view=trades`），策略視角不再嵌入此面板。
- trades 視角只查詢顯示所需的資料。
- 切換列樣板集中成一個元件，新增分頁不必再複製 `<Link>` 樣板。

**Non-Goals:**

- 不改面板內容、監控清單／圖表／均線發散候選行為、fan-breakout 獨立頁、pipeline 與資料表。

## Decisions

### 以 view=trades 作為主視角值，而非獨立路由

沿用 `view` 參數（與 `monitor`、`chart` 同層），而不是像均線發散候選那樣開新路由。這樣標題列、切換列、`Promise.all` 查詢都在同一個 Server Component 內，不必複製一份頁首；均線發散候選是獨立頁是因為它有自己的篩選與連續看圖。替代方案「新路由 `/investment/strategy/trades`」被否決：要重複標題列與資料日期邏輯。

### 視角解析集中為 parseStrategyView

新增 `parseStrategyView(view?: string): StrategyView`（`'strategy' | 'monitor' | 'chart' | 'trades'`），無法辨識的值回退 `'strategy'`。`page.tsx` 用它取代散落的 `isMonitor` / `isChart` 判斷來源，並推導 `isTrades`。

### 切換列抽成 StrategyViewTabs 元件

新增 `src/components/features/strategy/StrategyViewTabs.tsx`（純 `<Link>`，不需 client 指令），props `{ active: StrategyView }`，依固定順序渲染五個分頁：策略視角（`/investment/strategy`）、監控清單（`?view=monitor`）、圖表（`?view=chart`）、均線發散候選（`/investment/strategy/fan-breakout`，永不高亮）、換股後表現（`?view=trades`）。樣式沿用現有 class 字串。

### trades 視角只查詢策略訊號與換股後表現

`Promise.all` 依視角決定是否查詢：trades 視角查 `getStrategySignals()`（標題資料日期）與 `getStrategyTradePerformance()`；不查 `getFactorIC`、`getStrategyAnalytics`、`getConsensusSignals`、`getStrategyConsensusHistory`、`getStrategySnapshots`、`getFanBreakoutSignals`。標題日期在 trades 視角為 `result?.date ?? tradePerformance.asOf`。策略視角不再查 `getStrategyTradePerformance()`。頁面「尚無策略訊號資料」的提早返回不套用在 trades 視角，因為換股後表現不依賴當日訊號。

**Supersedes**: strategy-trade-performance / 面板放在策略視角、共選面板之後

## Implementation Contract

**Behavior**

- 頂部切換列依序顯示：策略視角、監控清單、圖表、均線發散候選、換股後表現；目前視角高亮，均線發散候選永不高亮。
- `/investment/strategy?view=trades` 顯示標題列、切換列（換股後表現高亮）與「換股後表現」面板，不顯示策略分析面板、共選面板、策略卡片。
- `/investment/strategy`（策略視角）顯示策略分析面板、共選面板、策略卡片，不顯示「換股後表現」面板；共選圖表模式（`cview=chart`）行為不變。
- 監控清單、圖表視角內容不變。
- `view` 為無法辨識的值時視同策略視角。

**Interface / data shape**

- `src/lib/investment/strategyUtils.ts`：`export type StrategyView = 'strategy' | 'monitor' | 'chart' | 'trades'`、`export function parseStrategyView(view?: string): StrategyView`。
- `StrategyViewTabs` props：`{ active: StrategyView }`。

**Failure modes**

- 換股後表現查詢失敗：沿用 `getStrategyTradePerformance` 回空，面板顯示「尚無換股後表現資料」。
- 策略訊號查詢回空：trades 視角照常顯示面板，標題日期改用 `asOf`；兩者皆無則顯示「—」。

**Acceptance criteria**

- `yarn test --testPathPatterns StrategyViewTabs` 涵蓋五個分頁順序與連結、各視角高亮、均線發散候選不高亮。
- `yarn test --testPathPatterns strategyUtils` 涵蓋 `parseStrategyView` 四個合法值與回退。
- `yarn tsc --noEmit`、改動檔 `yarn eslint` 無錯誤。
- 本地 `yarn dev` + Playwright：`?view=trades` 有面板、無共選面板與策略卡片；`/investment/strategy` 有共選面板與策略卡片、無面板；切換列五個分頁順序正確。結果寫回 tasks.md。

**Scope boundaries**

- In scope：`page.tsx` 的視角判斷、查詢條件、版面；新元件 `StrategyViewTabs`；`parseStrategyView`；上述測試。
- Out of scope：面板元件內容、監控清單／圖表／均線發散候選邏輯、fan-breakout 獨立頁、pipeline、資料表。

## Risks / Trade-offs

- [使用者已習慣在策略視角看到面板] → 切換列常駐可見，「換股後表現」分頁位置固定。
- [trades 視角仍查 getStrategySignals 只為標題日期] → 該查詢有 `unstable_cache`，成本低；換來標題日期與其他視角一致。
