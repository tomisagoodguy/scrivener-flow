## ADDED Requirements

### Requirement: ETF 分段路由
系統 SHALL 使用 `/investment/[etf]` 作為各 ETF 監控頁的 URL，`[etf]` 為 `00980A`、`00981A`、`00991A` 其中之一。不合法的 ETF 代號 SHALL redirect 到 `/investment/00981A`。

#### Scenario: 直接訪問 ETF URL
- **WHEN** 使用者訪問 `/investment/00981A`
- **THEN** 顯示 00981A 的投資監控頁，與舊版 `?etf=00981A` 內容相同

#### Scenario: 不合法的 ETF segment
- **WHEN** 使用者訪問 `/investment/99999X`
- **THEN** server-side redirect 到 `/investment/00981A`

### Requirement: 根頁 redirect
系統 SHALL 在 `/investment`（根頁）做 server-side redirect 到 `/investment/00981A`。

#### Scenario: 訪問根頁
- **WHEN** 使用者訪問 `/investment`
- **THEN** 立即 redirect 到 `/investment/00981A`

### Requirement: 舊 query string 相容
系統 SHALL 將 `/investment?etf=00980A` 形式的舊 URL redirect 到 `/investment/00980A`。

#### Scenario: 舊書籤 query string URL
- **WHEN** 使用者訪問 `/investment?etf=00980A`
- **THEN** redirect 到 `/investment/00980A`（保留 tab query 參數）

### Requirement: 個股頁新路由
系統 SHALL 使用 `/investment/stock/[code]` 作為個股詳情頁 URL。舊路徑 `/investment/dashboard/[code]` SHALL redirect 到新路徑。

#### Scenario: 訪問個股詳情新路徑
- **WHEN** 使用者訪問 `/investment/stock/2330`
- **THEN** 顯示 2330 的個股詳情頁

#### Scenario: 舊路徑 redirect
- **WHEN** 使用者訪問 `/investment/dashboard/2330`
- **THEN** redirect 到 `/investment/stock/2330`
