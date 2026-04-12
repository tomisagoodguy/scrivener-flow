## ADDED Requirements

### Requirement: 自選股清單 CRUD

系統 SHALL 讓已登入使用者在 `/investment/watch-list` 頁面管理個人自選股清單，支援新增、刪除、查看。

#### Scenario: 新增自選股
- **WHEN** 使用者輸入股票代碼（如 `2330`）並點擊「加入」
- **THEN** 系統呼叫 `addWatchStock` Server Action
- **THEN** 股票加入 `watch_list` 表，公司名稱自動從 `company_basic_info` 填入
- **THEN** 頁面即時更新顯示新增的股票

#### Scenario: 重複加入同一股票
- **WHEN** 使用者嘗試加入已存在 watch_list 的股票代碼
- **THEN** 系統回傳錯誤訊息「該股票已在清單中」
- **THEN** 清單不新增重複筆

#### Scenario: 刪除自選股
- **WHEN** 使用者點擊某股票的「移除」按鈕
- **THEN** 系統呼叫 `removeWatchStock` Server Action
- **THEN** 該股票從 `watch_list` 表刪除
- **THEN** 頁面即時更新，該股票消失

#### Scenario: 查看清單
- **WHEN** 使用者訪問 `/investment/watch-list`
- **THEN** 頁面顯示個人 watch_list 的全部股票，含代碼、公司名稱、策略標籤、加入時間

---

### Requirement: 策略標籤管理

系統 SHALL 允許使用者為每支自選股標記一或多個預定義策略標籤。

預定義策略清單（與 notebook 條件一致）：`創260高`、`低波動`、`融資健康`、`營收9月高`、`投信買超`

#### Scenario: 標記策略標籤
- **WHEN** 使用者在某股票列的策略欄位選擇/取消策略
- **THEN** 系統呼叫 `updateWatchStrategies` Server Action
- **THEN** `watch_list.strategies` 欄位更新為選中的策略陣列

#### Scenario: 未選策略時顯示無標籤
- **WHEN** 某股票的 `strategies` 為空陣列
- **THEN** 在清單和裸K圖標題中不顯示策略資訊

---

### Requirement: RLS 多租戶隔離

系統 SHALL 確保每位使用者只能存取自己的 watch_list 資料。

#### Scenario: 使用者只看到自己的清單
- **WHEN** 使用者 A 和使用者 B 各自訪問 `/investment/watch-list`
- **THEN** 使用者 A 只看到自己加入的股票，使用者 B 同理
- **THEN** 兩者的資料互不可見

#### Scenario: 未登入時拒絕存取
- **WHEN** 未登入使用者嘗試訪問 `/investment/watch-list`
- **THEN** 系統重導向至 `/login`

---

### Requirement: 清單上限保護

系統 SHALL 限制每位使用者的 watch_list 最多 50 支股票。

#### Scenario: 超過上限時拒絕新增
- **WHEN** 使用者的 watch_list 已有 50 支股票，嘗試新增第 51 支
- **THEN** 系統回傳錯誤訊息「自選股上限為 50 支」
- **THEN** 不執行 INSERT
