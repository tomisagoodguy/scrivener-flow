## ADDED Requirements

### Requirement: 個股頁顯示「經理人損益」區塊
個股頁 SHALL 在 ETF 持倉歷史圖表下方新增「經理人損益」區塊，列出所有持有此股票的 ETF，每個 ETF 一張損益卡片。

#### Scenario: 有持倉 ETF
- **WHEN** 一或多個 ETF 持有此股票（`etf_weight_history` 有紀錄）
- **THEN** 區塊標題「📊 經理人損益」下方逐一顯示各 ETF 的損益卡片

#### Scenario: 無持倉 ETF
- **WHEN** 無任何 ETF 持有此股票
- **THEN** 不顯示此區塊

---

### Requirement: 各 ETF 損益卡片並排顯示
多個 ETF 的損益卡片 SHALL 以 grid 並排（desktop 2 欄，mobile 1 欄），每張卡片標題顯示 ETF 代號與名稱。

#### Scenario: 多個 ETF 持有
- **WHEN** 有 2 個以上 ETF 持有此股票
- **THEN** 卡片以 2 欄 grid 顯示，每張卡片頂部標示 ETF 代號（如「00981A 統一台股增長」）

#### Scenario: 單一 ETF 持有
- **WHEN** 只有 1 個 ETF 持有此股票
- **THEN** 卡片佔滿整行寬度

---

### Requirement: 載入狀態
區塊 SHALL 在資料載入期間顯示 skeleton loading 佔位元素，不顯示空白區域。

#### Scenario: 資料載入中
- **WHEN** Server Action 尚未回傳資料
- **THEN** 顯示 skeleton card 佔位，高度與實際卡片一致

#### Scenario: 載入失敗
- **WHEN** Server Action 拋出錯誤
- **THEN** 顯示「損益資料載入失敗」提示，不崩潰整頁
