## ADDED Requirements

### Requirement: 主力買進 Top 10 排行榜
頁面 SHALL 顯示「大戶持股比例增加幅度」前 10 名股票，欄位為：股票名稱、股票代碼、總股東人數、總股東人數變化率（%）、大戶持股比例變化（percentage point）。

#### Scenario: 有資料時正常顯示
- **WHEN** `equity_distribution_stats` 有最新一期資料
- **THEN** 依 `big_holder_pct_change DESC` 取前 10 筆並顯示排行榜

#### Scenario: 大戶比例增加為正數時標色
- **WHEN** `big_holder_pct_change > 0`
- **THEN** 顯示綠色（正向）文字與上箭頭

#### Scenario: 無資料時
- **WHEN** 資料表無任何資料
- **THEN** 顯示「尚無資料，每週一更新」提示，不顯示空表格

---

### Requirement: 散戶減少 Top 10 排行榜
頁面 SHALL 顯示「總股東人數減少幅度」前 10 名股票，欄位同主力買進排行榜。

#### Scenario: 有資料時正常顯示
- **WHEN** `equity_distribution_stats` 有最新一期資料
- **THEN** 依 `shareholders_change_rate ASC`（最負值在前）取前 10 筆並顯示排行榜

#### Scenario: 股東人數減少為負數時標色
- **WHEN** `shareholders_change_rate < 0`
- **THEN** 顯示紅色文字與下箭頭

---

### Requirement: 顯示資料更新日期
頁面 SHALL 在標題區顯示目前資料的 `snapshot_date`，讓用戶知道資料新鮮度。

#### Scenario: 正常顯示更新日期
- **WHEN** 頁面載入
- **THEN** 標題下方顯示「資料日期：YYYY-MM-DD（每週一更新）」

---

### Requirement: 連結至個股詳情頁
每列股票名稱 SHALL 為可點擊連結，導向 `/investment/stock/[code]`。

#### Scenario: 點擊股票名稱
- **WHEN** 用戶點擊排行榜中的股票名稱
- **THEN** 導向 `/investment/stock/[code]` 個股詳情頁

---

### Requirement: 頁面整合至投資儀表板導覽
`/investment/equity` 頁面 SHALL 在投資模組導覽中可存取，並提供返回 `/investment` 的連結。

#### Scenario: 從投資首頁導覽
- **WHEN** 用戶在 `/investment` 頁面
- **THEN** 可透過導覽連結進入 `/investment/equity`

#### Scenario: 返回按鈕
- **WHEN** 用戶在 `/investment/equity` 頁面
- **THEN** 頁面頂部有「← 返回」連結指向 `/investment`
