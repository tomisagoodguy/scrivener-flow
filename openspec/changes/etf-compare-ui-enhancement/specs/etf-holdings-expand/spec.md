## ADDED Requirements

### Requirement: 持股清單展開/收合
每張 ETF 卡片 SHALL 預設顯示前10筆持股，並提供按鈕讓使用者展開查看全部持股。

#### Scenario: 預設顯示前10筆
- **WHEN** ETF 卡片首次渲染
- **THEN** 持股表格僅顯示前10筆，並在表格下方顯示「顯示全部 N 筆」按鈕（N 為持股總數）

#### Scenario: 持股不足10筆
- **WHEN** ETF 持股總數 ≤ 10
- **THEN** 顯示全部持股，不顯示展開按鈕

#### Scenario: 點擊展開
- **WHEN** 使用者點擊「顯示全部 N 筆」
- **THEN** 表格顯示所有持股，按鈕文字變更為「收合」

#### Scenario: 點擊收合
- **WHEN** 使用者點擊「收合」
- **THEN** 表格回到僅顯示前10筆，按鈕文字回到「顯示全部 N 筆」

### Requirement: 交集持股列高亮強化
系統 SHALL 以更醒目的視覺樣式標示交集持股列，取代現有的細框線標示。

#### Scenario: 三方共同持股列
- **WHEN** 持股同時出現在三支 ETF 中（in all3）
- **THEN** 整列背景為黃色半透明（`bg-yellow-50/80 dark:bg-yellow-900/30`），badge 為 `text-xs font-semibold`

#### Scenario: 兩方共同持股列
- **WHEN** 持股出現在兩支 ETF 中（in any2 but not all3）
- **THEN** 整列背景為藍色半透明（`bg-blue-50/80 dark:bg-blue-900/30`），badge 為 `text-xs font-semibold`
