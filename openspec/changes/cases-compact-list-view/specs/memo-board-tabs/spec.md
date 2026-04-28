## ADDED Requirements

### Requirement: Compact list tab in VIEW_TABS
VIEW_TABS SHALL 包含 `list` 選項，排在現有 tab 之後。

#### Scenario: Tab 顯示
- **WHEN** 使用者在備忘錄板頁面
- **THEN** sub-view tabs 顯示：全部 / ⚠️ 應注意 / 📝 其他代辦 / 🔒 私密備註 / 📋 緊湊清單

#### Scenario: 緊湊清單 tab 不顯示計數
- **WHEN** view=list tab 顯示
- **THEN** 不顯示案件計數 badge（其他 tab 有計數，list 顯示全部）
