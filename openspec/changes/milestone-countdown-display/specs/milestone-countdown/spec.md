## ADDED Requirements

### Requirement: 倒數天數計算
系統 SHALL 根據里程碑日期與今日日期計算剩餘天數（日曆天），以台灣本地時間午夜為基準。

#### Scenario: 計算未來日期剩餘天數
- **WHEN** 里程碑日期為今日之後 N 天
- **THEN** 系統回傳正整數 N

#### Scenario: 計算今日到期
- **WHEN** 里程碑日期等於今日
- **THEN** 系統回傳 0

#### Scenario: 計算已逾期天數
- **WHEN** 里程碑日期早於今日 N 天
- **THEN** 系統回傳負整數 -N

#### Scenario: 無日期不顯示
- **WHEN** 里程碑日期為 null 或 undefined
- **THEN** 元件不渲染任何內容

### Requirement: 顏色編碼顯示
`MilestoneCountdown` 元件 SHALL 根據剩餘天數套用對應顏色樣式。

#### Scenario: 7天以上顯示綠色
- **WHEN** 剩餘天數 ≥ 7
- **THEN** 標籤顯示綠色（`text-green-600 bg-green-50`）並顯示「還有 N 天」

#### Scenario: 3到6天顯示橘色
- **WHEN** 剩餘天數介於 3 到 6（含）
- **THEN** 標籤顯示橘色（`text-amber-600 bg-amber-50`）並顯示「還有 N 天」

#### Scenario: 1到2天顯示紅色
- **WHEN** 剩餘天數介於 1 到 2（含）
- **THEN** 標籤顯示紅色（`text-red-600 bg-red-50`）並顯示「還有 N 天」

#### Scenario: 今日到期顯示紅色
- **WHEN** 剩餘天數為 0
- **THEN** 標籤顯示紅色並顯示「今日到期」

#### Scenario: 逾期顯示閃爍紅色
- **WHEN** 剩餘天數 < 0
- **THEN** 標籤顯示閃爍紅色（`animate-pulse text-red-700 bg-red-100`）並顯示「已逾期 N 天」

### Requirement: 整合至 RecentCases 卡片
首頁最近案件卡片的里程碑區塊 SHALL 在每個已填寫日期的里程碑下方顯示倒數標籤。

#### Scenario: 有日期的里程碑顯示倒數
- **WHEN** 案件里程碑（簽約/用印/完稅/過戶/交屋）有填寫日期
- **THEN** 日期旁或下方顯示 `MilestoneCountdown` 倒數標籤

#### Scenario: 無日期的里程碑不顯示倒數
- **WHEN** 案件里程碑日期為空
- **THEN** 該里程碑不顯示倒數標籤

### Requirement: 整合至案件詳情頁
案件詳情頁里程碑顯示區塊 SHALL 在每個里程碑日期旁顯示倒數標籤。

#### Scenario: 詳情頁里程碑倒數顯示
- **WHEN** 用戶瀏覽案件詳情頁，且里程碑有填寫日期
- **THEN** 每個里程碑欄位旁顯示倒數天數標籤與顏色
