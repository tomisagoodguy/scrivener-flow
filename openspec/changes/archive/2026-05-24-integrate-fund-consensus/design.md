# Design: integrate-fund-consensus

## 資料流架構

### 共用資料來源
`getConsensusSignals()` 回傳 `{ signals: ConsensusSignal[], date: string }` 涵蓋所有股票，已按 `consensus_count` 降序排列。一次呼叫即可服務三個目標頁面。每個 `ConsensusSignal` 包含：
- `stock_id`、`consensus_count`（0–3）、`fund_buying`、`fund_consec_days`、`etf_etfs`、`strategy_hits`

三頁都在 Server Component 層（page.tsx）平行呼叫此 action，各自建立 `consensusMap: Record<string, ConsensusSignal>` 傳入 Client Component。

---

## 頁面 1：選股池（`/investment`）

### 資料層
`investment/page.tsx` 在現有 `Promise.all` 加入 `getConsensusSignals()`，結果 build 成 `fundConsensusMap`（key = stock_id）傳給 `StockPickerHub`。

### 型別擴充
`UnifiedHolding` 新增選用欄位：
```ts
consensus_count?: number   // 0–3
fund_consec_days?: number  // 投信連買天數
```
`StockPickerHubProps` 新增 `fundConsensusMap?: Record<string, ConsensusSignal>`。
`FactorFilter` 新增 `'triple_consensus'`。
`SortField` 新增 `'consensus_count' | 'fund_consec_days'`。

### Hook 邏輯（`useStockPickerHub`）
在 union holdings build 完成後，用 `fundConsensusMap` 填充每支股票的 `consensus_count` 和 `fund_consec_days`。
`triple_consensus` filter：`consensus_count >= 3`。
sort：`consensus_count` 和 `fund_consec_days` 直接比較數值，desc。

### UI
`StockPickerTable` 表頭新增兩欄：
- **投信連買**（`fund_consec_days`，可排序）
- **共識**（`consensus_count` 0–3，可排序）

`HoldingsTableRow` 對應格：
- `fund_consec_days`：`≥3` 顯示 `text-rose-600`，`1–2` 顯示 `text-slate-600`，`0` 顯示 `—`
- `consensus_count`：`3` → 橘色徽章 `★★★`，`2` → 藍色 `★★☆`，`1` → 灰色 `★☆☆`，`0` → 空

`FactorFilterChips` 新增「三重共識」chip（`triple_consensus`）。

---

## 頁面 2：策略選股（`/investment/strategy`）

### 資料層
`strategy/page.tsx` 在現有 `Promise.all` 加入 `getConsensusSignals()`，build 成 `consensusMap`。

### 型別擴充
`StrategyMonitorStock` 新增：
```ts
consensus_count?: number
fund_consec_days?: number
```
`buildMonitorStocks()` 在 map 時從 `consensusMap` 填充。

### UI（`StrategyMonitorCard`）
卡片 header 右側現有 `RetPill` 下方，增加小型 badges row：
- `fund_consec_days ≥ 1`：顯示 `投信 Nd` badge（`bg-violet-50 text-violet-600`）
- `consensus_count ≥ 2`：顯示 `共識 ★N` badge（`2` → 藍色，`3` → 橘金色）

三重共識（`consensus_count === 3`）的卡片邊框加 `ring-1 ring-amber-400/60`，視覺最突出。

---

## 頁面 3：族群強弱（`/investment/sectors`）

### 資料層
`sectors/page.tsx` 加入 `getConsensusSignals()`，build `consensusMap`，傳入 `SectorDashboard`。

### 族群層級 badge（近似值）
利用現有 `etfActivity[category].stock_etf_map` 中的 stock_id 集合，cross-reference `consensusMap`，計算該族群內「ETF 買且投信買（fund_buying=true）」的股票數 `fundEtfOverlapCount`。
若 `fundEtfOverlapCount ≥ 1`，在族群列顯示 `投信＋N` 灰藍徽章。

### 展開股票層級 badge
`SectorItem` 從 prop 取得 `consensusMap`，在展開後的股票表格每行股票名稱旁：
- `fund_consec_days ≥ 1`：顯示 `投信 Nd` badge（inline，`text-xs`）

### Props 擴充
```ts
// SectorDashboard Props
consensusMap?: Record<string, ConsensusSignal>

// SectorRowProps  
consensusMap?: Record<string, ConsensusSignal>
```

---

## 無 breaking change 保證
- 所有新 props 為 optional，預設值為 `undefined` / `{}` / `0`
- 現有行為完全保留，新欄位若無資料時靜默隱藏
- `getConsensusSignals()` 已有 server scope（受 RLS），無需額外授權
