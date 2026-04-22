## ADDED Requirements

### Requirement: etf_position_summary 持倉摘要表

系統 SHALL 建立 `etf_position_summary` 資料表，每列代表某支 ETF 對某支股票的一段完整持倉紀錄（從首次買進到出清，或持續至今）：

欄位：`etf_code, stock_code, stock_name, entry_date, entry_price, entry_weight, exit_date (nullable), exit_price (nullable), latest_weight, active_days, status ('active'|'exited'), realized_pnl_pct (nullable), unrealized_pnl_pct`

計算邏輯：
- `entry_date` = `etf_diff_logs` 中該股最早的 IN 事件日期
- `exit_date` = 最後一次 OUT 事件後無後續 IN 事件的日期（null 表示仍持有）
- `entry_price` / `exit_price` = 對應日期的 `stock_prices_daily.close`
- `realized_pnl_pct` = `(exit_price - entry_price) / entry_price`（僅 exited）
- `unrealized_pnl_pct` = `(current_price - entry_price) / entry_price`（僅 active）

#### Scenario: Migration 建立
- **WHEN** 執行 `supabase/migrations/<timestamp>_add_etf_position_summary.sql`
- **THEN** 資料表建立，INDEX 在 `(etf_code, status)`，RLS 設為公開讀取

#### Scenario: Active 持倉記錄
- **WHEN** 某支股票在 `etf_diff_logs` 有 IN 事件且無最終 OUT 事件
- **THEN** `status = 'active'`，`exit_date = null`，`unrealized_pnl_pct` 為正確計算值

#### Scenario: 已出清持倉記錄
- **WHEN** 某支股票的最後異動為 OUT 且之後無新 IN 事件
- **THEN** `status = 'exited'`，`exit_date` 為 OUT 日期，`realized_pnl_pct` 為正確計算值

---

### Requirement: PositionSummaryStep 每日更新

Pipeline SHALL 包含 `PositionSummaryStep`，於 `SignalDetectStep` 之後執行，增量更新 `etf_position_summary`。

#### Scenario: 新 IN 事件建立記錄
- **WHEN** 當日 `etf_diff_logs` 出現某股的 IN 事件
- **THEN** 在 `etf_position_summary` 插入新 active 記錄，`entry_date = today`，查 `stock_prices_daily` 取 entry_price

#### Scenario: OUT 事件關閉記錄
- **WHEN** 當日 `etf_diff_logs` 出現某股的 OUT 事件
- **THEN** 將對應 active 記錄更新為 `status = 'exited'`，填入 `exit_date`、`exit_price`、`realized_pnl_pct`

#### Scenario: 每日更新 unrealized_pnl
- **WHEN** `PositionSummaryStep` 執行
- **THEN** 所有 active 記錄的 `unrealized_pnl_pct` 以當日收盤價重算

#### Scenario: 為輔助步驟
- **WHEN** `PositionSummaryStep` 拋出例外
- **THEN** 記錄 ERROR log，不 raise，不中斷 pipeline

---

### Requirement: ETF 深潛頁 6 Tab 架構

`/investment/[etf]` 頁面 SHALL 將現有 DrilldownTabs 重構為以下 6 個 Tab，各 Tab 獨立載入：

| Tab | 功能 | 資料來源 |
|-----|------|---------|
| 目前持股 | 當前持倉列表 | `etf_holdings_snapshot` |
| 當日加減碼 | 今日異動分類 | `etf_diff_logs`（當日） |
| 歷史軌跡 | 每支股票比重走勢時序 | `etf_weight_history` |
| 單股進出場 | 所有持倉的進出場記錄 | `etf_position_summary`（active） |
| 損益排行 | active + exited 損益排序 | `etf_position_summary` |
| 已出清 | 完整出清的持倉 | `etf_position_summary`（exited） |

#### Scenario: Tab 切換
- **WHEN** 使用者點擊任一 Tab
- **THEN** 對應內容立即載入（skeleton 佔位），URL query string 更新 `?tab=<name>` 保留狀態

---

### Requirement: 目前持股 Tab

顯示當日快照的完整持倉，按比重降序排列。

#### Scenario: 持股列表顯示
- **WHEN** 使用者開啟「目前持股」Tab
- **THEN** 顯示表格：排名、股票代號、名稱、持股比重（%）、持股張數、股價、漲跌幅（台股色彩慣例：紅漲綠跌）、未實現損益%

#### Scenario: 點擊個股開啟 StockDetailPanel
- **WHEN** 使用者點擊任一持股列
- **THEN** 右側滑出 `StockDetailPanel` 顯示該股完整資訊

---

### Requirement: 當日加減碼 Tab

將當日 `etf_diff_logs` 分為三類展示。

#### Scenario: 三類分組顯示
- **WHEN** 使用者開啟「當日加減碼」Tab
- **THEN** 分三區塊顯示：
  - **新建倉**（IN 事件）：股票代號、名稱、新增比重、進場股價
  - **加碼**（BUY 事件）：股票代號、名稱、比重變化（+X%）、加碼前/後比重
  - **減碼**（SELL 事件）：股票代號、名稱、比重變化（-X%）、減碼前/後比重

#### Scenario: 無異動時
- **WHEN** 當日無任何 `etf_diff_logs` 記錄
- **THEN** 顯示「今日無持倉異動」

---

### Requirement: 歷史軌跡 Tab

顯示每支股票在此 ETF 的比重走勢時序圖。

#### Scenario: 股票選擇器
- **WHEN** 使用者開啟「歷史軌跡」Tab
- **THEN** 顯示股票搜尋/選擇器（含所有曾持有的股票），預設顯示當前持倉前 5 支

#### Scenario: 比重走勢圖
- **WHEN** 使用者選擇一支股票
- **THEN** 顯示該股在此 ETF 的比重折線圖（X 軸 = 日期，Y 軸 = 比重 %）；持倉期間以實線，出清後以虛線標示退出點

---

### Requirement: 單股進出場 Tab

列出所有 active 持倉的進出場時間點與成本。

#### Scenario: 進出場列表
- **WHEN** 使用者開啟「單股進出場」Tab
- **THEN** 顯示所有 status='active' 的持倉：股票、進場日、進場價、當前價、持倉天數、未實現損益%（正值紅色/負值綠色，台股慣例）

#### Scenario: 按持倉天數排序
- **WHEN** 點擊「持倉天數」欄標題
- **THEN** 按天數降序排列，方便識別長期持倉

---

### Requirement: 損益排行 Tab

合併 active + exited 持倉，按損益排序。

#### Scenario: 損益排行列表
- **WHEN** 使用者開啟「損益排行」Tab
- **THEN** 顯示所有持倉（含已出清），按 pnl_pct 降序排列；active 持倉標記「持倉中」，exited 標記「已出清」；損益正負色彩遵循台股慣例（正=紅、負=綠）

#### Scenario: 篩選器
- **WHEN** 使用者點擊「僅顯示持倉中」或「僅顯示已出清」
- **THEN** 列表即時過濾

---

### Requirement: 已出清 Tab

顯示所有 status='exited' 的完整出場紀錄。

#### Scenario: 已出清列表
- **WHEN** 使用者開啟「已出清」Tab
- **THEN** 顯示表格：股票、進場日、出清日、持倉天數、進場價、出清價、已實現損益%；按出清日降序排列（最近出清優先）

#### Scenario: 總結統計
- **WHEN** 「已出清」Tab 渲染
- **THEN** 頂部顯示匯總：已出清股數、平均持倉天數、平均已實現損益%、勝率（pnl > 0 的比例）
