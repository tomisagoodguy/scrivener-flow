# strategy-consensus-matrix Specification

## Purpose

TBD - created by archiving change 'strategy-consensus-panel-enhance'. Update Purpose after archive.

## Requirements

### Requirement: Consensus matrix view toggle

The multi-strategy consensus panel SHALL offer a "列表 / 矩陣" toggle implemented as links setting the URL search parameter `cview` to `list` or `matrix`, preserving `cmin` and `cwin`. The default SHALL be `list`; any missing or unrecognized value SHALL be treated as `list`. The toggle SHALL apply in both latest mode and history mode.

#### Scenario: Switching to matrix

- **WHEN** the user clicks "矩陣" on `/investment/strategy?cmin=3`
- **THEN** the URL becomes `/investment/strategy?cmin=3&cview=matrix` and the matrix replaces the chip list

---
### Requirement: Stock by strategy matrix rendering

In matrix view the panel SHALL render a table whose rows are the consensus stocks (same set and order as the list view) and whose columns are the strategies that selected at least one row stock, ordered by number of selected row stocks descending, then strategy id ascending. Each column header SHALL show the strategy name; in latest mode it SHALL also show that strategy's data date (`MM/DD`). Each row header SHALL show stock code and name and link to `/investment/stock/<stock_id>`. A cell SHALL show a filled marker when the column strategy selected the row stock and SHALL be empty otherwise. The last column SHALL show the row's strategy count. The table container SHALL scroll horizontally on narrow screens instead of overflowing the page.

#### Scenario: Matrix cells reflect selections

- **WHEN** consensus stocks are 3055 (capital_layer, low_vol_alpha, trend_template) and 2464 (capital_layer, trend_template)
- **THEN** columns are capital_layer, trend_template, low_vol_alpha in that order, row 3055 has three filled cells, and row 2464 has filled cells under capital_layer and trend_template only

##### Example: column ordering

| Strategy | Row stocks selected | Column position |
|----------|--------------------|-----------------|
| capital_layer | 2 | 1st |
| trend_template | 2 | 2nd (id ascending after capital_layer) |
| low_vol_alpha | 1 | 3rd |

#### Scenario: Empty matrix

- **WHEN** zero stocks satisfy the threshold in matrix view
- **THEN** no table is rendered and the text "目前條件下無共選股" is shown
