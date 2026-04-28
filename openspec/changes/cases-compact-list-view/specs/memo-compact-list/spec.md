## ADDED Requirements

### Requirement: Compact list view for memo board
備忘錄板 SHALL 提供 `view=list` 緊湊清單模式，每列一案件，所有案件在一屏內可見。

#### Scenario: 切換到緊湊清單
- **WHEN** 使用者點擊 `📋 緊湊清單` tab
- **THEN** URL 變為 `?status=Memo&view=list`，頁面顯示表格列表而非卡片 grid

#### Scenario: 列表欄位顯示
- **WHEN** view=list 模式下
- **THEN** 每列顯示：案號（藍色連結）、買賣方、里程碑進度 badge（印/稅/過/交含日期）、應注意備註摘要（超過 40 字截斷）

#### Scenario: 備註截斷 hover
- **WHEN** 備註超過顯示寬度
- **THEN** 文字截斷顯示，滑鼠 hover 顯示完整內容（HTML title attribute）

#### Scenario: 無備註案件
- **WHEN** 案件無應注意備註
- **THEN** 備註欄顯示空白，不顯示佔位符號

#### Scenario: 緊急里程碑顏色
- **WHEN** 里程碑日期距今 ≤ 2 天
- **THEN** badge 使用警示色（amber）
- **WHEN** 里程碑日期已過期
- **THEN** badge 使用紅色
