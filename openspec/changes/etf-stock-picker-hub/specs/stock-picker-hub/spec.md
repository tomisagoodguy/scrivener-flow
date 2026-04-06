## ADDED Requirements

### Requirement: 三 ETF 聯集持股列表
系統 SHALL 顯示三支 ETF（00980A/00981A/00991A）持股的聯集，每支個股為一列，包含：股票代號、名稱、被幾支 ETF 持有（1/2/3）、各 ETF 的持股權重（無持有顯示 —）、動能分數（filter_score 0~3）、60日動能%、投信10日買超、營收MA3新高標記。

#### Scenario: 頁面載入顯示聯集持股
- **WHEN** 使用者進入任一 ETF 頁面的「選股」tab
- **THEN** 系統顯示三 ETF 聯集持股表格，預設依動能分數 desc 排序

#### Scenario: 三方共同持有標記
- **WHEN** 某支股票被三支 ETF 同時持有
- **THEN** 該列顯示黃色「3共」badge

#### Scenario: 兩方共同持有標記
- **WHEN** 某支股票被恰好兩支 ETF 持有
- **THEN** 該列顯示藍色「2共」badge

### Requirement: ETF 勾選篩選
系統 SHALL 提供三個 ETF 勾選框（預設全選），勾選後列表即時篩選，只顯示被勾選的 ETF 中至少一支持有的個股。

#### Scenario: 取消勾選某 ETF
- **WHEN** 使用者取消勾選「00981A」
- **THEN** 列表只顯示 00980A 或 00991A 持有的個股，權重欄中 00981A 那欄的資料隱藏

#### Scenario: 只勾選兩支 ETF 看重疊
- **WHEN** 使用者勾選「00980A」和「00991A」並取消「00981A」
- **THEN** 列表過濾後的「共同持有」badge 重新計算（最多 2 ETF）

### Requirement: 多維排序
系統 SHALL 支援點擊欄標題排序：共同持有數、動能分數、60日動能%、投信10日買超、各 ETF 權重。

#### Scenario: 點擊欄標題排序
- **WHEN** 使用者點擊「動能分數」欄標題
- **THEN** 列表依動能分數 desc 排序，再次點擊改為 asc

### Requirement: 點擊個股進入詳情
系統 SHALL 在股票代號上提供連結，點擊後導向 `/investment/stock/[code]`。

#### Scenario: 點擊股票代號
- **WHEN** 使用者點擊列表中某支股票代號
- **THEN** 導向 `/investment/stock/[code]`（帶上當前 ETF 和 tab 參數，供個股頁導航用）
