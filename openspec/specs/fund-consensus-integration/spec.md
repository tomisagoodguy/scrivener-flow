# Spec: fund-consensus-integration

## Purpose

把 `getFundMomentumSignals` 和 `getConsensusSignals` 的資訊融合進選股池、策略選股、族群強弱三個主要決策頁面，作為一級指標（非獨立頁面）。

## Requirements

### Requirement: 選股池整合（`/investment`）

每支 `UnifiedHolding` 必須攜帶 `consensus_count`（0–3）和 `fund_consec_days`（整數 ≥ 0）。`StockPickerTable` 顯示「投信連買」欄（`fund_consec_days`，可排序）和「共識」欄（`consensus_count`，可排序）。`FactorFilterChips` 提供「三重共識」filter，選中時只顯示 `consensus_count >= 3` 的股票。缺失共識資料時欄位顯示 `—`，不報錯。

#### Scenario: 持股攜帶共識欄位
- **GIVEN** `getConsensusSignals()` 回傳資料
- **WHEN** Server Component 組裝 `UnifiedHolding` 列表
- **THEN** 每筆 holding 含有 `consensus_count` 和 `fund_consec_days` 欄位

#### Scenario: 表格顯示共識欄位
- **GIVEN** 選股池頁面載入完成
- **WHEN** 使用者瀏覽 `StockPickerTable`
- **THEN** 顯示「投信連買」欄（`fund_consec_days`）和「共識」欄（`consensus_count`），兩欄均可點擊排序

#### Scenario: 三重共識 filter
- **GIVEN** 使用者點選「三重共識」FilterChip
- **WHEN** filter 生效
- **THEN** 只顯示 `consensus_count >= 3` 的股票，其他股票隱藏

#### Scenario: 共識資料缺失降級
- **GIVEN** `getConsensusSignals()` 回傳空資料或失敗
- **WHEN** 表格渲染
- **THEN** 共識相關欄位顯示 `—`，頁面不拋出錯誤

---

### Requirement: 策略選股整合（`/investment/strategy`）

`StrategyMonitorStock` 攜帶 `consensus_count` 和 `fund_consec_days`。`StrategyMonitorCard` 顯示 `投信 Nd` badge（`fund_consec_days ≥ 1`）和 `共識 ★N` badge（`consensus_count ≥ 2`）。`consensus_count === 3` 的卡片有 `ring-1 ring-amber-400/60` 邊框高亮。

#### Scenario: 策略卡片顯示投信連買 badge
- **GIVEN** 股票的 `fund_consec_days >= 1`
- **WHEN** 渲染 `StrategyMonitorCard`
- **THEN** 顯示 `投信 Nd` badge，N 為實際連買天數

#### Scenario: 策略卡片顯示共識 badge
- **GIVEN** 股票的 `consensus_count >= 2`
- **WHEN** 渲染 `StrategyMonitorCard`
- **THEN** 顯示 `共識 ★N` badge，N 為實際 consensus_count

#### Scenario: 三重共識卡片高亮
- **GIVEN** 股票的 `consensus_count === 3`
- **WHEN** 渲染 `StrategyMonitorCard`
- **THEN** 卡片套用 `ring-1 ring-amber-400/60` 邊框樣式

---

### Requirement: 族群強弱整合（`/investment/sectors`）

`SectorDashboard` 接受 `consensusMap?: Record<string, ConsensusSignal>`。族群列顯示「投信＋N」徽章，N = 當族群內 `fund_buying=true` 且 ETF 有買的股票數，N ≥ 1 才顯示。族群展開後每支股票旁顯示 `投信 Nd` badge（`fund_consec_days ≥ 1`）。

#### Scenario: 族群列投信徽章
- **GIVEN** 族群內有 `fund_buying=true` 且 ETF 有買進的股票
- **WHEN** 顯示族群列
- **THEN** 顯示「投信＋N」徽章，N 為符合條件的股票數；N = 0 時不顯示徽章

#### Scenario: 展開族群後個股 badge
- **GIVEN** 使用者展開族群列
- **WHEN** 顯示族群內個股
- **THEN** `fund_consec_days >= 1` 的股票旁顯示 `投信 Nd` badge

---

### Requirement: 效能與可靠性

三頁的 `getConsensusSignals()` 呼叫在 Server Component 層平行執行（與其他 action 同一個 `Promise.all`）。`getConsensusSignals()` 失敗時，頁面靜默降級（`consensusMap` 為空物件），不影響主要功能。

#### Scenario: 平行執行 consensus signals
- **GIVEN** Server Component 初始化
- **WHEN** 組裝頁面資料
- **THEN** `getConsensusSignals()` 與其他資料 action 在同一個 `Promise.all` 中平行執行，不序列等待

#### Scenario: consensus signals 失敗降級
- **GIVEN** `getConsensusSignals()` 拋出例外或回傳錯誤
- **WHEN** Server Component 處理結果
- **THEN** `consensusMap` 降級為空物件 `{}`，頁面其他功能正常運作，不顯示錯誤訊息給使用者
