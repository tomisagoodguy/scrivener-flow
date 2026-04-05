## ADDED Requirements

### Requirement: 重疊比例摘要卡
系統 SHALL 在 ETF 對比頁面頂部（卡片區上方）顯示一個摘要列，呈現持股重疊的統計數字。

#### Scenario: 有三方共同持股
- **WHEN** `overlap.all3` 長度 > 0
- **THEN** 摘要列顯示「三方共同持有 N 支」及佔前10大持股的百分比

#### Scenario: 有兩方共同持股
- **WHEN** `overlap.any2` 長度 > 0
- **THEN** 摘要列顯示「兩方共同持有 N 支」及佔前10大持股的百分比

#### Scenario: 無任何重疊
- **WHEN** `overlap.all3` 和 `overlap.any2` 均為空陣列
- **THEN** 摘要列顯示「前10大持股無重疊」

### Requirement: 交集說明截斷顯示
系統 SHALL 限制交集說明列中的股票代號顯示數量，避免長串溢出版面。

#### Scenario: 交集股票超過5支
- **WHEN** `overlap.all3` 或 `overlap.any2` 長度 > 5
- **THEN** 僅顯示前5支股票代號，後接「+N 支」文字（N 為剩餘數量）

#### Scenario: 交集股票不超過5支
- **WHEN** `overlap.all3` 或 `overlap.any2` 長度 ≤ 5
- **THEN** 顯示全部股票代號，不截斷

### Requirement: 資料日期含年份
系統 SHALL 在頁面標頭的資料日期徽章中顯示完整年月日。

#### Scenario: 顯示資料日期
- **WHEN** 頁面取得有效的 `data_date`
- **THEN** 日期格式為 `YYYY/MM/DD`（例如 2026/04/05）
