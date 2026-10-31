## MODIFIED Requirements

### Requirement: Consensus matrix view toggle

The multi-strategy consensus panel SHALL offer a "列表 / 矩陣 / 圖表" toggle implemented as links setting the URL search parameter `cview` to `list`, `matrix` or `chart`, preserving `cmin` and `cwin`. The default SHALL be `list`; any missing or unrecognized value SHALL be treated as `list`. The toggle SHALL apply in both latest mode and history mode.

#### Scenario: Switching to matrix

- **WHEN** the user clicks "矩陣" on `/investment/strategy?cmin=3`
- **THEN** the URL becomes `/investment/strategy?cmin=3&cview=matrix` and the matrix replaces the chip list

#### Scenario: Switching to chart

- **WHEN** the user clicks "圖表" on `/investment/strategy?cmin=3&cwin=14`
- **THEN** the URL becomes `/investment/strategy?cmin=3&cview=chart&cwin=14` and the bare-K chart viewer replaces the chip list

#### Scenario: Unrecognized view value

- **WHEN** the user opens `/investment/strategy?cview=grid`
- **THEN** the panel renders the list view and the "列表" option is highlighted
