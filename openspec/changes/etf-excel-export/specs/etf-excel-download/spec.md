## ADDED Requirements

### Requirement: ETF 選股池 Excel 匯出 API
系統 SHALL 提供 `GET /api/investment/export-excel` endpoint，回傳 `.xlsx` 二進位檔，  
Content-Type 為 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`，  
Content-Disposition 為 `attachment; filename="etf-pool-YYYY-MM-DD.xlsx"`。

#### Scenario: 成功下載 Excel
- **WHEN** 使用者發送 `GET /api/investment/export-excel`
- **THEN** 伺服器回傳 HTTP 200 + `.xlsx` 二進位串流

#### Scenario: API 包含兩個 Sheet
- **WHEN** 伺服器回傳 Excel 檔案
- **THEN** 檔案包含名為「選股策略」和「完整指標」的兩個工作表

---

### Requirement: Sheet 1「選股策略」格式
Sheet 1 SHALL 包含六欄，欄標題列為第一列，  
各欄下方填入對應篩選策略的股票代號（純數字），  
不同欄長度可不同，空缺格為空白，格式為文字型數字以保留前導零。

欄位定義：
| 欄標題 | 篩選條件 |
|--------|---------|
| 全部池 | Union Pool 所有股票 |
| 三大全過 | filter_score === 3 |
| 雙Filter | filter_score >= 2 |
| 動能通過 | momentum_pass === true |
| 投信通過 | it_buy_10d_pass === true |
| 營收新高 | rev_ma3_new_high === true |

#### Scenario: 選股策略 Sheet 欄位正確
- **WHEN** 開啟 Excel 的「選股策略」Sheet
- **THEN** 第一列為六欄標題（全部池、三大全過、雙Filter、動能通過、投信通過、營收新高）

#### Scenario: 代號為文字型數字
- **WHEN** 讀取「選股策略」Sheet 的儲存格
- **THEN** 代號（如 2317）以文字格式儲存，可被 `int(cell.value)` 正確解析

---

### Requirement: Sheet 2「完整指標」格式
Sheet 2 SHALL 包含所有持股的量化指標一覽，每股一列。

欄位（依序）：代號、名稱、ETF來源、權重%、分數（0-3）、動能60d(%)、投信10日(張)、營收新高、產業、收盤價、漲跌%

#### Scenario: 完整指標 Sheet 包含所有欄位
- **WHEN** 開啟 Excel 的「完整指標」Sheet
- **THEN** 第一列包含上述 11 個欄位標題

#### Scenario: 資料按分數降序排列
- **WHEN** 查看「完整指標」Sheet 的資料列
- **THEN** 資料依 filter_score 由高到低排列，分數相同時依 weight 降序

---

### Requirement: 前端下載按鈕
投資頁面 Header SHALL 包含「⬇ 下載 Excel」按鈕，  
點擊後呼叫 API 並觸發瀏覽器下載，下載期間按鈕顯示 Loading 狀態。

#### Scenario: 點擊下載觸發瀏覽器下載
- **WHEN** 使用者點擊「⬇ 下載 Excel」按鈕
- **THEN** 瀏覽器開始下載 `.xlsx` 檔案，檔名含今日日期

#### Scenario: 下載中按鈕禁用
- **WHEN** API 請求進行中
- **THEN** 按鈕顯示 Loading 狀態且不可再次點擊，避免重複請求
