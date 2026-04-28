## ADDED Requirements

### Requirement: 儲存通訊群組名稱
`cases` 表 SHALL 有 `chat_groups jsonb DEFAULT '{}'` 欄位，支援以 app 名稱為 key 儲存群組名稱字串。

#### Scenario: 初始值為空物件
- **WHEN** 新建案件時未填入任何群組名稱
- **THEN** `chat_groups` 欄位值為 `{}`

#### Scenario: 儲存單一 app 群組名稱
- **WHEN** 代書在備忘錄卡片輸入 LINE 群組名稱並離開焦點
- **THEN** `cases.chat_groups` 更新為 `{"line": "輸入的名稱"}`，其他 key 不受影響

### Requirement: 備忘錄卡片顯示通訊群組編輯區塊
備忘錄卡片（CaseMemoCard）SHALL 顯示「📱 通訊群組」區塊，包含 LINE、WhatsApp、其他三個獨立輸入欄。

#### Scenario: 有群組名稱時顯示內容
- **WHEN** 案件 `chat_groups.line` 有值
- **THEN** 卡片顯示該值，hover 時出現「編輯」提示

#### Scenario: 無群組名稱時顯示佔位符
- **WHEN** 案件 `chat_groups.line` 為空
- **THEN** 顯示灰色斜體佔位符「LINE 群組名稱…」

#### Scenario: 點擊進入編輯模式
- **WHEN** 使用者點擊任一 app 的群組名稱欄位
- **THEN** 該欄位變為可輸入狀態，800ms debounce 後自動儲存

#### Scenario: 儲存狀態回饋
- **WHEN** auto-save 觸發
- **THEN** 顯示「儲存中…」→「✓ 已儲存」狀態提示，2 秒後消失

### Requirement: 備忘錄 view=all 才顯示通訊群組區塊
通訊群組區塊 SHALL 只在 `view=all` 或 `view=chat` 時顯示，不干擾其他 view。

#### Scenario: 全部 view 顯示通訊群組
- **WHEN** URL 為 `?status=Memo&view=all`
- **THEN** 每張卡片顯示「📱 通訊群組」區塊

#### Scenario: 其他 view 隱藏通訊群組
- **WHEN** URL 為 `?status=Memo&view=notes`
- **THEN** 卡片不顯示「📱 通訊群組」區塊
