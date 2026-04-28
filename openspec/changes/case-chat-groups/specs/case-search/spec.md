## MODIFIED Requirements

### Requirement: 全站搜尋包含通訊群組名稱
案件搜尋 SHALL 在現有條件基礎上加入 `chat_groups` JSONB 欄位的 LINE、WhatsApp、其他三個 key 的 ilike 查詢。

#### Scenario: 用 LINE 群組名稱搜尋找到案件
- **WHEN** 使用者在搜尋框輸入 LINE 群組名稱關鍵字並送出
- **THEN** `chat_groups->>'line'` 包含該關鍵字的案件出現在結果中

#### Scenario: 用 WhatsApp 群組名稱搜尋找到案件
- **WHEN** 使用者在搜尋框輸入 WhatsApp 群組名稱關鍵字並送出
- **THEN** `chat_groups->>'whatsapp'` 包含該關鍵字的案件出現在結果中

#### Scenario: 搜尋不影響其他欄位
- **WHEN** 關鍵字不匹配任何群組名稱但匹配案號
- **THEN** 案號匹配的案件仍正常出現，不因群組欄位為空而被排除
