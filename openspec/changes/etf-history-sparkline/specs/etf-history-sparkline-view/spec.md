## ADDED Requirements

### Requirement: 歷史軌跡 sparkline 格狀檢視切換

「歷史軌跡」tab 的右上角 SHALL 提供「折線圖」與「Sparkline」兩種檢視模式切換按鈕，預設顯示折線圖（維持現有行為）。

#### Scenario: 切換至 Sparkline 模式
- **WHEN** 使用者點擊「Sparkline」切換按鈕
- **THEN** 原本的排名折線圖隱藏，顯示格狀 sparkline 卡片

#### Scenario: 切換回折線圖模式
- **WHEN** 使用者點擊「折線圖」切換按鈕
- **THEN** sparkline 格狀隱藏，顯示原本的排名折線圖

---

### Requirement: Sparkline 卡片顯示內容

每張 sparkline 卡片 SHALL 顯示以下資訊：
- 股票代碼（font-mono）
- 股票名稱
- 當前比重 %（最新一筆 weight）
- Peak 比重 %（時間範圍內最高 weight）
- 追蹤天數（時間範圍內有資料的天數）
- 目前排名（依當前比重排序後的序號）
- 比重 % 走勢 sparkline 曲線（AreaChart，無 Axis / Tooltip / Legend）

#### Scenario: 卡片正常渲染
- **WHEN** 某支股票在選定時間範圍內有至少 1 筆資料
- **THEN** 顯示卡片，peak 比重為該期間最大值，追蹤天數為不重複日期數

#### Scenario: 股票資料不足
- **WHEN** 某支股票在選定時間範圍內無任何資料
- **THEN** 不顯示該股票的卡片

---

### Requirement: 時間範圍篩選

sparkline 格狀與折線圖 SHALL 共用時間範圍篩選，選項為「近 3 個月」、「近 6 個月」、「全部」。

#### Scenario: 選擇近 3 個月
- **WHEN** 使用者選擇「近 3 個月」
- **THEN** 兩種檢視模式均只顯示最近 90 天內的資料點

#### Scenario: 選擇近 6 個月
- **WHEN** 使用者選擇「近 6 個月」
- **THEN** 兩種檢視模式均只顯示最近 180 天內的資料點

#### Scenario: 選擇全部
- **WHEN** 使用者選擇「全部」
- **THEN** 兩種檢視模式顯示所有可用歷史資料，不做日期過濾

---

### Requirement: Sparkline 卡片排序

sparkline 格狀 SHALL 提供排序選項：「依比重」（預設，由高至低）、「依 Peak」（由高至低）、「依追蹤天數」（由多至少）。

#### Scenario: 預設排序
- **WHEN** 使用者進入 sparkline 模式，未選擇排序
- **THEN** 卡片依當前比重由高至低排列

#### Scenario: 切換排序
- **WHEN** 使用者選擇不同排序選項
- **THEN** 卡片立即重新排列，不需重新 fetch 資料

---

### Requirement: 格狀布局響應式

sparkline 格狀 SHALL 依螢幕寬度調整欄數：手機 2 欄、平板 3 欄、桌機 4 欄、寬螢幕 5 欄。

#### Scenario: 桌機檢視
- **WHEN** 視窗寬度 ≥ 1280px
- **THEN** 每列顯示 5 張卡片

#### Scenario: 手機檢視
- **WHEN** 視窗寬度 < 768px
- **THEN** 每列顯示 2 張卡片
