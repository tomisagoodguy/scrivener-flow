## ADDED Requirements

### Requirement: 代償步驟資料模型
系統 SHALL 維護一個 `redemption_steps` 資料表，每筆記錄代表一個案件的一個代償步驟，包含 `case_id`、`step_number`（1–7）、`is_done`（boolean）、`done_date`（date，可為 null）、`user_id`。
`(case_id, step_number)` 為複合唯一鍵。
`case_id` 設 `ON DELETE CASCADE`，案件刪除時自動清除步驟記錄。
RLS Policy 必須限制 `user_id = auth.uid()`。

#### Scenario: 步驟記錄隔離
- **WHEN** 使用者 A 查詢案件步驟
- **THEN** 系統 SHALL 只回傳 `user_id = A` 的步驟記錄，不回傳其他用戶的資料

### Requirement: 步驟常數定義
系統 SHALL 在 `src/lib/constants/caseConstants.ts` 定義 `REDEMPTION_STEPS` 常數，包含 7 個步驟的 `step_number` 和 `label`：
1. 確認原貸款餘額
2. 申請代償撥款（買方銀行）
3. 確認撥款日
4. 原貸款銀行確認收款
5. 申請塗銷抵押設定
6. 等塗銷完成
7. 確認土地建物謄本乾淨

#### Scenario: 步驟順序固定
- **WHEN** 前端渲染步驟列表
- **THEN** 系統 SHALL 依 `step_number` 升序排列，順序不可由使用者調整

### Requirement: 步驟自動初始化
當使用者首次開啟某案件的代償進度追蹤元件時，若 DB 中該案件無任何步驟記錄，Server Action SHALL 自動批次寫入 7 筆初始記錄（`is_done: false`、`done_date: null`）。
初始化操作 MUST 使用 `INSERT ... ON CONFLICT DO NOTHING` 確保冪等性。

#### Scenario: 首次開啟觸發初始化
- **WHEN** 使用者開啟案件詳情頁代償步驟區塊，且 DB 中無該案件的步驟記錄
- **THEN** 系統 SHALL 自動寫入 7 筆 `is_done: false` 的步驟記錄，並在 UI 呈現 7 個未勾選的步驟

#### Scenario: 重複開啟不重複建立
- **WHEN** 步驟記錄已存在，使用者再次開啟代償步驟區塊
- **THEN** 系統 SHALL 不重複建立記錄，保留現有的完成狀態

### Requirement: 步驟勾選與日期記錄
使用者 SHALL 能夠勾選/取消任意步驟的完成狀態。
勾選完成時，系統 SHALL 自動記錄當日日期為 `done_date`（使用者可手動修改）。
取消勾選時，`done_date` SHALL 清空為 null。
每次狀態變更 MUST 在 500ms 內觸發 Server Action 更新 DB，無需額外「儲存」按鈕。

#### Scenario: 勾選步驟自動記錄日期
- **WHEN** 使用者勾選某步驟的完成框
- **THEN** 系統 SHALL 將 `is_done` 設為 true，`done_date` 設為今日日期，並立即更新 DB

#### Scenario: 取消勾選清空日期
- **WHEN** 使用者取消某步驟的完成框
- **THEN** 系統 SHALL 將 `is_done` 設為 false，`done_date` 設為 null，並立即更新 DB

#### Scenario: 手動修改完成日期
- **WHEN** 使用者在已勾選的步驟上修改日期輸入欄
- **THEN** 系統 SHALL 更新 `done_date` 為使用者輸入的日期，`is_done` 保持 true

### Requirement: 代償進度 UI 元件
系統 SHALL 在案件詳情頁的代償區塊中渲染 `RedemptionProgressTracker` 元件。
元件 MUST 遵循 CLAUDE.md 規定的 glass-card 視覺風格。
每個步驟列 MUST 包含：步驟編號、步驟名稱、完成勾選框、日期輸入欄（type="date"）。
已完成步驟 SHALL 以視覺標示區隔（如文字刪除線或綠色 checkmark）。

#### Scenario: 進度視覺呈現
- **WHEN** 使用者開啟代償步驟區塊
- **THEN** 系統 SHALL 顯示「N/7 步驟完成」的進度摘要，以及 7 個步驟列

#### Scenario: 步驟完成視覺區隔
- **WHEN** 步驟 `is_done: true`
- **THEN** 系統 SHALL 對該步驟的標籤文字套用刪除線或顯示綠色勾選圖示，以區隔未完成步驟
