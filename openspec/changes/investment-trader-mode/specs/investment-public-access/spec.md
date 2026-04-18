## ADDED Requirements

### Requirement: Investment routes bypass AuthGate
`/investment` 及所有子路由（`/investment/*`）SHALL 被視為 public route，`AuthGateProvider` 不顯示 passphrase screen。

#### Scenario: 未授權用戶訪問 /investment
- **WHEN** 未輸入 passphrase 的用戶直接訪問 `/investment`
- **THEN** 系統直接渲染投資監控頁，不顯示 passphrase gate

#### Scenario: 未授權用戶訪問子路由
- **WHEN** 用戶訪問 `/investment/bare-k` 或 `/investment/stock/2330` 等任意子路由
- **THEN** 系統直接渲染對應頁面，不顯示 passphrase gate

### Requirement: Investment data accessible without session
投資監控相關 Supabase 查詢 SHALL 使用 `getServiceClient()`（anon key，無 cookie 依賴），確保無 session 時資料正常讀取。

#### Scenario: 無 session 時讀取 ETF 持股
- **WHEN** 無認證 session 的請求到達 investment server component
- **THEN** `getServiceClient()` 成功讀取 `etf_holdings_snapshot` 等資料表並回傳資料
