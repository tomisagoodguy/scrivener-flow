## MODIFIED Requirements

### Requirement: ETF 切換路由行為
`EtfSelector` SHALL 在使用者點擊 ETF 按鈕時，導向 `/investment/[etf_code]`，並保留當前 `tab` query 參數。（舊行為：更新 `?etf=` query string）

#### Scenario: 切換 ETF 保留當前 tab
- **WHEN** 使用者在 `?tab=holdings` 狀態下點擊「00980A」
- **THEN** 導向 `/investment/00980A?tab=holdings`

#### Scenario: 切換 ETF 時無 tab 參數
- **WHEN** 使用者在無 tab 參數狀態下切換 ETF
- **THEN** 導向 `/investment/[新etf_code]`（不帶 tab，顯示預設 stock-picker tab）

### Requirement: 接收當前 ETF 的方式
`EtfSelector` SHALL 透過 prop `currentEtf` 接收當前 ETF 代號（string），不再從 `useSearchParams` 取 `etf` 參數。

#### Scenario: 正確高亮當前 ETF
- **WHEN** 當前路由為 `/investment/00991A`
- **THEN** 「00991A」按鈕顯示 active 樣式，其他兩個為 inactive
