## Why

consensus-signal（全市場共識掃描）與 fund-tracker（自選股投信追蹤）的資訊主軸相同，卻分散在兩個獨立路由，使用者必須切換頁面才能交叉比對；合併為 Tab 切換可降低導航成本，同時讓兩類訊號在同一頁面形成對照。

## What Changes

- 在 `/investment/consensus-signal` 頁面頂部加入 `全市場 | 自選股` Tab 切換元件
- 「全市場」Tab 保留現有 `ConsensusSummaryCards` + `ConsensusTable` 不變
- 「自選股」Tab 嵌入 fund-tracker 的三個元件：`AccumulationCycleCard`、`EtfFundCrossSignal`、`FundHealthTable`
- `/investment/fund-tracker` 路由保留，但頁面內容改為重導向至 `/investment/consensus-signal?tab=watchlist`，避免 broken link
- 側邊導航移除 fund-tracker 獨立項目，或標記為已合併

## Non-Goals

- 不合併底層資料 Action（`getConsensusSignals` 與 `getFundMomentumSignals` 各自獨立）
- 不修改任何資料庫查詢邏輯
- 不重新設計元件內部 UI（只搬移位置）

## Capabilities

### New Capabilities

- `consensus-fund-tab-view`: consensus-signal 頁面的 Tab 切換介面，整合全市場共識與自選股投信追蹤

### Modified Capabilities

- `fund-tracker-page`: 路由從獨立頁面改為重導向至合併頁面

## Impact

- Affected specs: `consensus-fund-tab-view`（新增）、`fund-tracker-page`（修改）
- Affected code:
  - New: `src/app/investment/consensus-signal/components/TabSwitcher.tsx`
  - Modified: `src/app/investment/consensus-signal/page.tsx`
  - Modified: `src/app/investment/fund-tracker/page.tsx`
  - Modified: `src/components/layout/SideNav.tsx`（視實際導航結構而定）
