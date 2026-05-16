## MODIFIED Requirements

### Requirement: 成分股策略命中標記
Web 頁面成分股列表中，`is_strategy_hit = true` 的個股 SHALL 在名稱旁顯示 ⚡ 標記。

#### Scenario: 命中股標記
- **WHEN** 成分股的 is_strategy_hit 為 true
- **THEN** 股票名稱後顯示 ⚡ 標記（黃色）

#### Scenario: 未命中股
- **WHEN** is_strategy_hit 為 false 或 null
- **THEN** 不顯示任何額外標記
