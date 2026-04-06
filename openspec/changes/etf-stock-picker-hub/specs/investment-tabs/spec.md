## MODIFIED Requirements

### Requirement: Tab 列表與預設值
`InvestmentTabs` SHALL 包含六個 tab：「選股」（stock-picker）、「策略洞察」（analysis）、「Revenue Lab」（revenue-lab）、「持股明細」（holdings）、「異動紀錄」（ledger）、「ETF 對比」（compare）。預設 tab 從原本的 `analysis` 改為 `stock-picker`。

#### Scenario: 初次進入 ETF 頁面
- **WHEN** 使用者訪問 `/investment/00981A`（無 tab 參數）
- **THEN** 顯示「選股」tab 的內容（StockPickerHub）

#### Scenario: 帶 tab 參數進入
- **WHEN** 使用者訪問 `/investment/00981A?tab=analysis`
- **THEN** 顯示「策略洞察」tab 的內容

#### Scenario: Tab 切換更新 URL
- **WHEN** 使用者點擊「持股明細」tab
- **THEN** URL 更新為 `?tab=holdings`，不觸發頁面重新整理

## ADDED Requirements

### Requirement: 選股 tab 內容
`InvestmentTabs` SHALL 接受 `stockPickerContent` prop，渲染於 `stock-picker` tab 中。

#### Scenario: 渲染 StockPickerHub
- **WHEN** 「選股」tab 為 active
- **THEN** 顯示 `stockPickerContent`（StockPickerHub 元件）
