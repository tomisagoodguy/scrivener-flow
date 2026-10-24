## Context

`/investment/strategy`（Server Component，`dynamic = 'force-dynamic'`）在「策略視角」以 `MultiStrategyConsensusPanel` 呈現由 `buildMultiConsensusStocks(result)` 算出的共選股。`result` 來自 `getStrategySignals()`：未指定日期時於 30 天視窗內各策略取自身最新日期（`strategy-signal-freshness` 已規範）。`StrategyEntry` 目前沒有每策略日期，前端無從得知各策略資料多舊。10 支策略中 9 支每月約 3 週停更，屬正常現象。

## Goals / Non-Goals

**Goals:**

- 共選口徑在 spec 與實作一致（各策略自身最新日期），並把各策略資料日期顯示出來
- 門檻 ≥2/≥3/≥4、列表/矩陣、最新/近 N 天三組切換，全部以 URL 參數表達（Server Component 可直接讀，無 client state）
- 每檔顯示選中的策略名稱
- 元件皆 ≤150 行

**Non-Goals:**

- 不改 Python 端策略或 `strategy_signals` schema（無 migration）
- 不處理前後端策略清單不一致（`fund_momentum` 只在前端 registry）
- 不在近 N 天模式顯示 ETF 持有與 00981A 增減碼（需額外三張表查詢，留待日後）
- 不做「同日共選」的嚴格模式
- 不改監控清單與圖表檢視

## Decisions

### URL 參數驅動的面板控制

以 `cmin`（2|3|4）、`cview`（list|matrix）、`cwin`（latest|7|14|30）三個 search params 控制面板，由 page 解析後傳入 props；切換以 `<Link>` 組 URL（保留其他兩個參數與 `view` 以外的狀態）。替代方案「Client Component + useState」被否決：會讓面板變 client、需把資料序列化下傳，且狀態無法分享連結。解析函式 `parseConsensusParams(searchParams)` 放在 `strategyConsensusUtils.ts`，非法值回退預設。

### StrategyEntry 新增每策略日期

`StrategyEntry` 新增必填 `date: string`。`_getStrategySignals` 在顯式日期分支填入該日期，在視窗分支填入 `latestByStrategy.get(id)`。快取 key 由 `strategy-signals-v3` 升為 `strategy-signals-v4`（依 Next.js 快取失效慣例）。改為必填會讓既有測試 fixture 編譯失敗，需一併補 `date`，這是刻意的：型別系統保證所有建構點都提供日期。

### 共選計算回傳策略清單並接受門檻

`buildMultiConsensusStocks(result, minCount = 2)` 改以 `Map<stock_id, Set<strategy_id>>` 計數（去重，避免同策略重複列入），`MultiConsensusEntry` 新增 `strategies: { id: string; label: string }[]` 與選填 `lastDate?: string`；`movement` 與 `etfHolders` 改為選填（近 N 天模式不提供）。策略顯示名稱取 `getStrategyDescriptions()`，找不到則用 id。

### 近 N 天共選以 Server Action 查詢並以純函式聚合

新增 `getStrategyConsensusHistory(days)`（`'use server'`，`getPublicClient()`，`unstable_cache` key `['strategy-consensus-history-v1', String(days)]`，revalidate 3600）只負責查詢 `strategy_signals` 與 `stock_basic_info` 並回傳原始列；聚合邏輯放純函式 `buildConsensusHistory(rows, stockInfo, minCount)`（`strategyConsensusUtils.ts`），便於單元測試。只有 `cwin !== 'latest'` 時 page 才呼叫此 action，最新模式維持零額外查詢。口徑採「視窗內不同策略數」而非「同日共選天數」，理由同上：月頻策略不每日產出，同日交集幾乎恆空。

### 面板拆分為控制列、股票卡與矩陣

- `ConsensusControls`：三組切換連結（純展示，props：目前參數）
- `ConsensusStockChip`：單一共選股卡片（現有 chip 內容 + 策略名稱 badge + 選填 lastDate），內含 `EtfHolderBadges`
- `ConsensusMatrix`：股票 × 策略表格；欄排序與格子資料由純函式 `buildConsensusMatrix(entries)` 產生
- `MultiStrategyConsensusPanel`：組合上述、日期說明列與空狀態

## Implementation Contract

- **行為**：策略視角在 ≥2 支策略時永遠顯示面板（含控制列）；門檻、檢視、區間切換反映在 URL 並可直接分享；空結果顯示「目前條件下無共選股」；最新模式下面板列出每支策略名稱與資料日期，落後於頂層日期者以 `text-gray-400` 呈現。
- **介面**：
  - `StrategyEntry { id; description; date: string; stocks }`
  - `MultiConsensusEntry { stock_id; name; count; industry; strategies: {id,label}[]; etfHolders?: string[]; movement?: MovementLabel; lastDate?: string }`
  - `parseConsensusParams(sp: { cmin?: string; cview?: string; cwin?: string }) => { minCount: 2|3|4; view: 'list'|'matrix'; window: 'latest'|7|14|30 }`
  - `buildMultiConsensusStocks(result, minCount?) => MultiConsensusEntry[]`
  - `getStrategyConsensusHistory(days: number) => Promise<{ rows: {strategy_id; stock_id; date}[]; stockInfo: {stock_code; name_short; industry}[] }>`
  - `buildConsensusHistory(rows, stockInfo, minCount) => MultiConsensusEntry[]`
  - `buildConsensusMatrix(entries) => { columns: {id,label,date?}[]; rows: {entry, cells: boolean[]}[] }`
- **失敗模式**：history action 遇 Supabase error → `console.error` 並回傳空 rows；非法 `days` 不查詢直接回空；page 不因 history 失敗而整頁失敗。
- **驗收**：`yarn test --testPathPatterns "buildMultiConsensusStocks|buildConsensusHistory|ConsensusMatrix|MultiStrategyConsensusPanel|StrategySignalCard"` 全綠；`yarn tsc --noEmit` 無錯；實跑 `/investment/strategy`、`?cmin=3`、`?cview=matrix`、`?cwin=14` 四個 URL 截圖確認（含深色模式與手機寬度矩陣橫向捲動）。
- **範圍內**：上列型別、純函式、一支新 Server Action、四個元件、page 參數解析與資料接線、相關測試。**範圍外**：Python 策略、DB schema、監控/圖表檢視、策略 registry 對齊。

## Risks / Trade-offs

- [`StrategyEntry.date` 改必填造成其他建構點編譯失敗] → 以 `tsc --noEmit` 找出全部建構點一次補齊；目前已知為 `getStrategySignals.ts` 與兩個測試檔。
- [近 30 天查詢列數較多（10 策略 × 每日數十檔 × 30 天）] → 只 select 三個欄位、Server 端聚合、快取 1 小時；量級在數千列內可接受。
- [Supabase 預設單次回傳上限 1000 列，30 天視窗可能截斷] → action 以 `.range()` 分頁取完全部列（每頁 1000，直到回傳少於 1000）。
- [矩陣欄位多時手機寬度溢出] → 容器 `overflow-x-auto`，策略名稱欄標頭使用短名（description 截斷至 8 字並以 `title` 顯示全名）。
- [深色模式 `rounded-xl` 被 `!important` 蓋背景] → 矩陣格子 marker 使用 inline `style` 背景或不帶 `rounded-*` 結構類別，依 `dark-mode.md` 做法。
