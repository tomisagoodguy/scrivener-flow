## ADDED Requirements

### Requirement: 閃電輸入模式開啟
`TodoContainer` 的「新增事件」按鈕 SHALL 開啟 `RapidEventInput` 元件，取代現有 inline form。

#### Scenario: 點擊新增事件
- **WHEN** 使用者點擊「新增事件」按鈕
- **THEN** `RapidEventInput` 展開，輸入框自動獲得焦點（autoFocus）

### Requirement: Enter 儲存並繼續
輸入框 SHALL 在按下 Enter 時儲存事件並清空輸入框，焦點保持在輸入框。

#### Scenario: 有效輸入按 Enter
- **WHEN** 使用者在輸入框輸入非空字串後按 Enter
- **THEN** 呼叫 `addManualTodo`，輸入框清空，焦點留在輸入框，session 記錄新增一筆

#### Scenario: 空白輸入按 Enter
- **WHEN** 使用者在輸入框為空時按 Enter
- **THEN** 不觸發儲存，輸入框維持空白

### Requirement: Esc 關閉輸入模式
按下 Esc 鍵 SHALL 關閉 `RapidEventInput`，清空 session 記錄。

#### Scenario: 按 Esc 關閉
- **WHEN** 使用者在輸入框按下 Esc
- **THEN** `RapidEventInput` 收起，回到「新增事件」按鈕狀態

### Requirement: Session 記錄顯示
`RapidEventInput` SHALL 在輸入框下方顯示本次 session 中已新增的事項清單。

#### Scenario: 新增後顯示記錄
- **WHEN** 使用者成功新增一筆事件
- **THEN** 該事件以「✓ [日期/時間預覽] [標題]」格式顯示在輸入框下方

#### Scenario: 關閉後清空記錄
- **WHEN** 使用者按 Esc 關閉輸入模式
- **THEN** Session 記錄清空（下次開啟時為空）

### Requirement: 輸入框即時預覽
輸入框 SHALL 在右側或下方即時顯示解析出的日期時間預覽（灰色小字）。

#### Scenario: 有效時間碼顯示預覽
- **WHEN** 使用者輸入含有效時間碼的字串（如 `開會 0502 1300`）
- **THEN** 預覽顯示「5月2日 13:00」

#### Scenario: 無時間碼無預覽
- **WHEN** 使用者輸入不含時間碼的字串
- **THEN** 預覽顯示「無日期」或空白
