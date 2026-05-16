## ADDED Requirements

### Requirement: 族群強弱排行頁面
`/investment/sectors` 頁面 SHALL 顯示最新一日的族群強弱排行，支援日/週/月三個維度切換，預設以日漲幅排序。

#### Scenario: 首次載入
- **WHEN** 使用者進入 `/investment/sectors`
- **THEN** 顯示最新交易日的族群排行，預設日漲幅降序
- **THEN** 顯示資料日期

#### Scenario: 切換排序維度
- **WHEN** 使用者點擊「日/週/月」tab
- **THEN** 族群列表依對應漲幅重新排序，無需重新載入頁面

### Requirement: 族群成分股展開
點擊族群列 SHALL 展開該族群的成分股清單，顯示個股名稱、股號、日漲幅，以日漲幅降序排列。

#### Scenario: 展開成分股
- **WHEN** 使用者點擊族群列
- **THEN** 展開顯示該族群所有成分股（從 `sector_strength_stocks` 查詢）
- **THEN** 成分股以日漲幅降序排列
- **THEN** 漲幅顯示遵循台股色彩慣例（紅漲綠跌）

#### Scenario: 收合成分股
- **WHEN** 使用者再次點擊已展開的族群列
- **THEN** 成分股列表收合
