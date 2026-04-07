## ADDED Requirements

### Requirement: ETF 持倉摘要卡片列
`EtfWeightHistoryChart` SHALL 在折線圖上方顯示一排摘要卡片，每個有資料的 ETF 顯示一張，無資料的 ETF 不顯示卡片。

#### Scenario: 有資料時顯示卡片
- **WHEN** `data` 中至少一個 ETF 有 `WeightHistoryEntry` 陣列且長度 > 0
- **THEN** 顯示對應數量的摘要卡片，排列於圖表上方

#### Scenario: 無資料時不顯示卡片列
- **WHEN** 所有 ETF 的資料陣列均為空
- **THEN** 整個卡片列不渲染（整個元件已隱藏，此為防禦性規則）

### Requirement: 卡片顯示最新值
每張卡片 SHALL 顯示該 ETF 的最新一筆資料值，並根據當前 `viewMode` 切換顯示內容。

#### Scenario: 排名模式
- **WHEN** `viewMode === 'rank'`
- **THEN** 卡片顯示最新 `rank` 值，格式為 `#N`

#### Scenario: 權重模式
- **WHEN** `viewMode === 'weight'`
- **THEN** 卡片顯示最新 `weight` 值，格式為 `N.NN%`

### Requirement: 卡片顯示趨勢方向
每張卡片 SHALL 顯示最新值相比前一期的變化量與方向 icon。

#### Scenario: 排名上升（數字變小）
- **WHEN** `viewMode === 'rank'` 且最新 rank < 前一期 rank（差值 ≥ 1）
- **THEN** 顯示綠色 ↑ icon 與差值（如 `↑3`）

#### Scenario: 排名下降（數字變大）
- **WHEN** `viewMode === 'rank'` 且最新 rank > 前一期 rank（差值 ≥ 1）
- **THEN** 顯示紅色 ↓ icon 與差值（如 `↓2`）

#### Scenario: 權重上升
- **WHEN** `viewMode === 'weight'` 且最新 weight > 前一期 weight（差值 ≥ 0.05）
- **THEN** 顯示綠色 ↑ icon 與差值（如 `↑0.15%`）

#### Scenario: 權重下降
- **WHEN** `viewMode === 'weight'` 且最新 weight < 前一期 weight（差值 ≥ 0.05）
- **THEN** 顯示紅色 ↓ icon 與差值（如 `↓0.08%`）

#### Scenario: 無變化或只有一筆資料
- **WHEN** 差值低於閾值，或資料只有一筆
- **THEN** 顯示灰色 → icon，變化量顯示 `—`

### Requirement: 卡片樣式與配色
每張卡片 SHALL 以對應 ETF 的顏色作為左側 border accent，使用 glass-card 風格。

#### Scenario: 卡片左側 border 顯示 ETF 配色
- **WHEN** 渲染任一 ETF 卡片
- **THEN** 卡片左側 4px border 使用 `ETF_CONFIG[etfCode].color`，與圖例線條顏色一致
