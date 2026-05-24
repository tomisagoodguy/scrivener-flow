## Why

fund-tracker 目前只針對觀察清單做投信追蹤，但 etf_diff_logs 選股池涵蓋大量標的，缺乏一個全市場掃描頁面把「ETF 主動加碼 × 投信買超 × 量化策略選出」三重共識一次呈現，導致需手動比對三個頁面。

## What Changes

- 新增獨立頁面 `/investment/consensus-signal`：全市場三重共識掃描
- 新增 Server Action `getConsensusSignals`：從 `etf_diff_logs`、`strategy_signals` 三路查詢並合併評分
- 三重共識條件：
  1. **ETF 加碼**：`etf_diff_logs` 最新日期有 BUY/IN（任一支追蹤 ETF）
  2. **投信買超**：`strategy_signals` (`fund_momentum`) score ≥ 70（全市場 Top 30%）
  3. **量化選股**：`strategy_signals` 任一量化策略（super8888 / capital_layer / low_vol_cap / broker_ranked / low_vol_alpha）`is_selected = true`
- 頁面顯示：命中數量徽章、可篩選表格（依共識層數、策略命中數排序）
- 在 SideNav 投資群組加入「共識掃描」連結

## Capabilities

### New Capabilities
- `consensus-signal-scanner`: 全市場三重共識掃描頁面與資料查詢邏輯

### Modified Capabilities

## Impact

- 新增路由：`src/app/investment/consensus-signal/page.tsx`
- 新增 Server Action：`src/app/actions/getConsensusSignals.ts`
- 新增元件：`src/app/investment/consensus-signal/components/`（ConsensusTable、ConsensusFilters、ConsensusBadge）
- 查詢資料表：`etf_diff_logs`、`strategy_signals`、`stock_basic_info`、`etf_holdings_snapshot`
- 修改：`src/components/layout/SideNav.tsx`（加入導覽連結）
