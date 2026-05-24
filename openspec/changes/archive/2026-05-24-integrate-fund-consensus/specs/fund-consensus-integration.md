# Spec: fund-consensus-integration

## 目的
把 `getFundMomentumSignals` 和 `getConsensusSignals` 的資訊融合進選股池、策略選股、族群強弱三個主要決策頁面，作為一級指標（非獨立頁面）。

## 需求

### R1：選股池（`/investment`）
- 每支 `UnifiedHolding` 必須攜帶 `consensus_count`（0–3）和 `fund_consec_days`（整數 ≥ 0）
- `StockPickerTable` 顯示「投信連買」欄（`fund_consec_days`，可排序）和「共識」欄（`consensus_count`，可排序）
- `FactorFilterChips` 提供「三重共識」filter，選中時只顯示 `consensus_count >= 3` 的股票
- 缺失共識資料時欄位顯示 `—`，不報錯

### R2：策略選股（`/investment/strategy`）
- `StrategyMonitorStock` 攜帶 `consensus_count` 和 `fund_consec_days`
- `StrategyMonitorCard` 顯示 `投信 Nd` badge（`fund_consec_days ≥ 1`）和 `共識 ★N` badge（`consensus_count ≥ 2`）
- `consensus_count === 3` 的卡片有 `ring-1 ring-amber-400/60` 邊框高亮

### R3：族群強弱（`/investment/sectors`）
- `SectorDashboard` 接受 `consensusMap?: Record<string, ConsensusSignal>`
- 族群列顯示「投信＋N」徽章，N = 當族群內 `fund_buying=true` 且 ETF 有買的股票數，N ≥ 1 才顯示
- 族群展開後每支股票旁顯示 `投信 Nd` badge（`fund_consec_days ≥ 1`）

### R4：效能 / 可靠性
- 三頁的 `getConsensusSignals()` 呼叫在 Server Component 層平行執行（與其他 action 同一個 `Promise.all`）
- `getConsensusSignals()` 失敗時，頁面靜默降級（`consensusMap` 為空物件），不影響主要功能
