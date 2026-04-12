## ADDED Requirements

### Requirement: 新增自選股
使用者 SHALL 能在投資頁面輸入股票代號後將其加入自選清單，並可選擇分組標籤。
同一用戶不得重複加入相同代號。

#### Scenario: 成功新增
- **WHEN** 使用者在搜尋框輸入代號（如「2317」）並點擊「加入」
- **THEN** 該股票出現在自選清單中，DB 新增一筆 `custom_watchlist` 記錄

#### Scenario: 重複加入
- **WHEN** 使用者嘗試加入已在清單中的股票代號
- **THEN** 系統顯示「已在自選清單中」提示，不重複寫入

### Requirement: 移除自選股
使用者 SHALL 能從自選清單中移除任一股票，操作即時生效。

#### Scenario: 成功移除
- **WHEN** 使用者點擊自選清單中某股旁的移除按鈕
- **THEN** 該股從列表中消失，DB 對應記錄刪除

### Requirement: 分組標籤
使用者 SHALL 能為自選股設定自由文字標籤（預設：「自選」），用於分類管理。

#### Scenario: 設定標籤
- **WHEN** 使用者新增股票時輸入標籤文字
- **THEN** 該股在清單中顯示對應標籤

#### Scenario: 預設標籤
- **WHEN** 使用者新增股票時未輸入標籤
- **THEN** 系統自動套用「自選」為預設標籤

### Requirement: RLS 隔離
每位使用者 MUST 只能讀寫自己的自選清單，不得看到他人資料。

#### Scenario: 資料隔離
- **WHEN** 使用者 A 查詢自選清單
- **THEN** 僅返回 `user_id = A` 的資料，不包含其他用戶的記錄

### Requirement: Drawer UI
自選管理介面 SHALL 以側邊 Drawer 呈現，不破壞現有投資頁面佈局，並適配手機螢幕。

#### Scenario: 開啟 Drawer
- **WHEN** 使用者點擊投資頁面的「★ 自選」按鈕
- **THEN** 右側 Drawer 滑出，顯示現有自選清單與搜尋框

#### Scenario: 手機可用
- **WHEN** 使用者在手機瀏覽器開啟 Drawer
- **THEN** Drawer 佔滿螢幕寬度，按鈕足夠大可用手指操作
