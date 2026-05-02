## ADDED Requirements

### Requirement: 從單行字串解析標題與時間
`parseEventLine(input)` SHALL 從字串中找出時間 token，回傳 `{ title, startDate, isAllDay }`。

#### Scenario: 標題在前時間在後
- **WHEN** 輸入 `"郭育汝簽約 05021300"`
- **THEN** 回傳 `{ title: "郭育汝簽約", startDate: "2026-05-02T13:00", isAllDay: false }`

#### Scenario: 時間在前標題在後
- **WHEN** 輸入 `"05021300 郭育汝簽約"`
- **THEN** 回傳 `{ title: "郭育汝簽約", startDate: "2026-05-02T13:00", isAllDay: false }`

#### Scenario: 無時間碼
- **WHEN** 輸入 `"明天開庭"`
- **THEN** 回傳 `{ title: "明天開庭", startDate: null, isAllDay: false }`

### Requirement: 11碼民國年含時間（最高優先）
`YYYMMDDHHMM` 格式（ROC 年 100-129）SHALL 解析為對應西元年份與時間。

#### Scenario: 11碼民國含時間
- **WHEN** 輸入 token `"11505021300"`
- **THEN** 解析為 `2026-05-02T13:00`，`isAllDay: false`

### Requirement: 8碼日期加時間
`MMDDHHMM` 格式 SHALL 解析為當年對應日期與時間，為最常用格式。

#### Scenario: 8碼正常輸入
- **WHEN** 輸入 token `"05021300"`
- **THEN** 解析為當年 `05-02T13:00`，`isAllDay: false`

#### Scenario: 8碼月份或日期無效
- **WHEN** token `"13021300"`（月份13無效）
- **THEN** 解析失敗，回傳 null

### Requirement: 7碼民國年全天
`YYYMMDD` 格式（ROC 年 100-129）SHALL 解析為對應西元年份，全天事件。

#### Scenario: 7碼民國全天
- **WHEN** 輸入 token `"1150502"`
- **THEN** 解析為 `2026-05-02`，`isAllDay: true`

### Requirement: 4碼日期優先
4碼數字 SHALL 優先嘗試 `MMDD`（月 01-12，日 01-31），不合法才 fallback 到 `HHMM`（今天幾點）。

#### Scenario: 4碼有效日期
- **WHEN** 輸入 token `"0502"`（05月02日有效）
- **THEN** 解析為當年 `05-02`，`isAllDay: true`

#### Scenario: 4碼月份超過12 fallback 到時間
- **WHEN** 輸入 token `"1300"`（13月無效）
- **THEN** 解析為今天 `13:00`，`isAllDay: false`

#### Scenario: 4碼日期為00 fallback 到時間
- **WHEN** 輸入 token `"0900"`（09月00日，日=00無效）
- **THEN** 解析為今天 `09:00`，`isAllDay: false`

### Requirement: 民國年範圍限制
ROC 年份 SHALL 限制在 100–129（西元 2011–2040），超出範圍視為無效 token。

#### Scenario: 超出範圍
- **WHEN** token `"0990502"`（ROC 99，超出範圍）
- **THEN** 解析失敗，不辨識為民國日期
