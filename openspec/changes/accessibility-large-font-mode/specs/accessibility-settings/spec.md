## ADDED Requirements

### Requirement: 大字體模式切換
系統 SHALL 提供使用者切換大字體模式的開關，啟用後整體介面文字縮放 1.2 倍，偏好持久化至 localStorage。

#### Scenario: 啟用大字體模式
- **WHEN** 使用者在無障礙設定面板開啟「大字體模式」
- **THEN** `<html>` 元素加上 `.large-font` class，介面文字立即縮放 1.2 倍，無需重載頁面

#### Scenario: 關閉大字體模式
- **WHEN** 使用者關閉「大字體模式」開關
- **THEN** `<html>` 移除 `.large-font` class，文字恢復正常大小

#### Scenario: 重開頁面保留偏好
- **WHEN** 使用者曾啟用大字體模式後重新整理或重開瀏覽器
- **THEN** 系統從 localStorage 讀取偏好，在頁面 hydration 前注入 `.large-font` class，不發生 FOUC

### Requirement: 高對比模式切換
系統 SHALL 提供高對比模式開關，啟用後提升文字與背景對比度至 WCAG AA 標準（≥ 4.5:1），偏好持久化至 localStorage。

#### Scenario: 啟用高對比模式
- **WHEN** 使用者開啟「高對比模式」
- **THEN** `<html>` 加上 `.high-contrast` class，文字顏色、背景色依預設色票調整

#### Scenario: 與大字體模式並存
- **WHEN** 使用者同時啟用大字體模式和高對比模式
- **THEN** 兩種模式效果同時生效，不互相干擾

### Requirement: 無障礙設定面板入口
系統 SHALL 在 Header 使用者選單中提供「無障礙設定」入口，點擊後開啟設定面板。

#### Scenario: 開啟設定面板
- **WHEN** 使用者點擊 Header 右上角使用者選單中的「無障礙設定」
- **THEN** 顯示包含「大字體模式」與「高對比模式」兩個 toggle 的設定面板

#### Scenario: 面板顯示當前狀態
- **WHEN** 使用者開啟設定面板
- **THEN** 兩個 toggle 的狀態反映目前的 localStorage 偏好值

### Requirement: 觸控目標最小尺寸
系統 SHALL 確保所有可點擊元素（button、a、role="button"）的最小觸控目標為 44×44px。

#### Scenario: 按鈕觸控目標
- **WHEN** 使用者在觸控裝置點擊任何按鈕或連結
- **THEN** 觸控目標區域不小於 44×44px，不論視覺大小

### Requirement: 關鍵數字加粗
系統 SHALL 對所有金額與日期數值套用 `font-semibold`，使其在周圍文字中突出。

#### Scenario: 案件金額顯示
- **WHEN** 案件列表或詳情頁顯示合約金額、代償金額等
- **THEN** 數字部分使用 `font-semibold`，比周圍 label 文字更醒目

### Requirement: 警示色搭配圖示
系統 SHALL 在所有狀態標籤、警示訊息中同時顯示圖示與顏色，不僅依賴顏色傳遞資訊。

#### Scenario: 案件狀態標籤
- **WHEN** 顯示案件狀態（如「逾期」、「待處理」）
- **THEN** 標籤同時包含對應圖示（如 ⚠️ 或 SVG icon）與顏色，色盲使用者也能識別
