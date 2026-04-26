## ADDED Requirements

### Requirement: ETF 頁新增「單股進出場」tab
ETF 頁 SHALL 新增第三個 tab「單股進出場」，以 URL query param `?tab=stock-trade` 維持可書籤化狀態。

#### Scenario: 切換至單股進出場 tab
- **WHEN** 使用者點擊「單股進出場」tab
- **THEN** URL 更新為 `?tab=stock-trade`，左側顯示選股列表，右側顯示預設選定股票的損益視圖

#### Scenario: 直接開啟 tab URL
- **WHEN** 使用者直接訪問帶有 `?tab=stock-trade` 的 URL
- **THEN** 頁面直接顯示「單股進出場」tab 內容，不跳回預設 tab

---

### Requirement: 選股列表依報酬率排序
左側選股清單 SHALL 顯示所有持倉（含已出清）股票，依報酬率降序排列（無報酬率資料者排最後）。
每列顯示：股票代號、股票名稱、報酬率%、目前權重%。

#### Scenario: 列表渲染
- **WHEN** tab 載入完成
- **THEN** 顯示所有股票，報酬率最高者排最上方

#### Scenario: 選取股票
- **WHEN** 使用者點擊左側某股票
- **THEN** 右側更新為該股票的損益卡片 + 雙軸圖 + 事件時間軸

---

### Requirement: 股數 / 股價雙軸圖
右側 SHALL 顯示雙軸折線圖：左軸為持股股數（張），右軸為股票收盤價（元）。
加減碼事件以圓點標記於圖上（綠點 = 加碼，紅點 = 減碼，灰點 = 首次建倉，空心點 = 出清）。

#### Scenario: 雙軸圖渲染
- **WHEN** 選定某股票
- **THEN** 顯示從首次持有到最後持有日的股數折線（左軸）與收盤價折線（右軸）

#### Scenario: 標記加減碼事件
- **WHEN** `etf_diff_logs` 有此 ETF × 此股票的事件
- **THEN** 對應日期的點以顏色區分加碼 / 減碼 / 建倉 / 出清

---

### Requirement: 事件時間軸
右側 SHALL 在圖表下方顯示事件時間軸，每筆事件一列：日期、事件類型（ENTRY / ADD / REDUCE / EXIT）、股數變動、投入金額估算。

#### Scenario: 時間軸顯示
- **WHEN** 有加減碼事件
- **THEN** 由新至舊排列，每列顯示日期、類型 badge、Δ 股數、估算投入金額（|Δshares × close|）

#### Scenario: 無事件資料
- **WHEN** `etf_diff_logs` 無此股票資料
- **THEN** 顯示「尚無事件記錄」提示文字
