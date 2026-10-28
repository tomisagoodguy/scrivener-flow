# equity-ranking-chart-view Specification

## Purpose

TBD - created by archiving change 'equity-ranking-chart-view'. Update Purpose after archive.

## Requirements

### Requirement: View toggle on equity ranking page

The equity ranking page (`/investment/equity`) SHALL render a view toggle with two links, "排行" and "圖表". "排行" SHALL link to `/investment/equity` and "圖表" SHALL link to `/investment/equity?view=chart`; both links SHALL carry the current `tier` and `weeks` parameters when they differ from the defaults. When `view` is absent or any value other than `chart`, the page SHALL render the existing table layout (`DoubleSignalSection` and `RankingPanelGrid`) unchanged, and SHALL NOT query bare-K snapshots.

#### Scenario: Default view is the table

- **WHEN** the user opens `/investment/equity`
- **THEN** the "排行" link is highlighted, the double-signal section and the ranking panel grid render as before, and no `bare_k_snapshots` query is issued

#### Scenario: Switching to chart view keeps tier and weeks

- **WHEN** the user is on `/investment/equity?tier=400&weeks=2` and clicks "圖表"
- **THEN** the browser navigates to a URL with `view=chart`, `tier=400` and `weeks=2`, and the "圖表" link is highlighted

---
### Requirement: Chart list selection

In chart view the page SHALL render a list selector with three links: "雙訊號" (`list=double`), "主力買進" (`list=big`) and "散戶減少" (`list=retail`), each labeled with the number of stocks it will show. A missing or unrecognized `list` value SHALL be treated as `double`. The chart rows SHALL be taken from the ranking result for the current `tier`, `weeks`, `sort` and `dir` parameters in its existing order: `double` SHALL use the double-signal ranking as is (at most 10 rows), and `big` and `retail` SHALL use the first `EQUITY_CHART_LIST_LIMIT` (30) rows of the big-holder and retail-decline rankings. The chart view SHALL NOT render the double-signal section or the ranking panel grid. `TierNav` and `WeekNav` links SHALL preserve `view` and `list` while in chart view.

#### Scenario: Invalid list falls back to double

- **WHEN** the user opens `/investment/equity?view=chart&list=foo`
- **THEN** the "雙訊號" link is highlighted and the chart shows the double-signal ranking

#### Scenario: Big list is capped at 30

- **WHEN** the big-holder ranking has 218 rows and the user opens `?view=chart&list=big`
- **THEN** the chart contains exactly the first 30 rows of the big-holder ranking, in the same order, and the "主力買進" link shows 30 as its count

##### Example: rows selected per list

| list | doubleSignalRanking | bigHolderRanking | retailDeclineRanking | chart rows |
| ---- | ------------------- | ---------------- | -------------------- | ---------- |
| double | 7 rows | 218 rows | 272 rows | the 7 double-signal rows |
| big | 7 rows | 218 rows | 272 rows | big-holder rows 1–30 |
| retail | 7 rows | 218 rows | 12 rows | all 12 retail rows |

#### Scenario: Tier change stays in chart view

- **WHEN** the user is on `?view=chart&list=retail` and clicks the "1000張+" tier link
- **THEN** the resulting URL contains `view=chart`, `list=retail` and `tier=1000`

#### Scenario: Empty list

- **WHEN** the selected list has zero rows
- **THEN** the page shows "此清單目前沒有股票" and does not render the scroll chart viewer

#### Scenario: No ranking data

- **WHEN** the ranking data is unavailable or flagged as insufficient for the selected weeks
- **THEN** the page shows the same empty-state message as the table view and does not query bare-K snapshots

---
### Requirement: Scrollable bare-K charts for equity ranking stocks

The chart view SHALL render the selected rows with the shared `ScrollChartViewer` and `BareKSlideContent` components, using the latest `bare_k_snapshots` row for each stock fetched through `getStrategySnapshots`. Each section header SHALL show the stock code and the stock name from the ranking row. Each chart's tags SHALL be the ETF codes listed for that stock in the ranking `etfMap`, or no tags when the stock has no entry. Stocks without a snapshot SHALL show a placeholder with the text "此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新". The viewer's back link SHALL point to `/investment/equity` carrying the current non-default `tier` and `weeks`. Changing the list SHALL remount the viewer at the first stock. The viewer SHALL NOT change the browser URL while scrolling.

#### Scenario: Stock with snapshot renders chart and ETF tags

- **WHEN** stock 2330 is in the chart rows, has a bare-K snapshot, and `etfMap['2330']` is `['00981A', '00980A']`
- **THEN** its section renders the six-panel bare-K chart with tags "00981A" and "00980A"

#### Scenario: Stock without snapshot shows placeholder

- **WHEN** a chart-row stock has no `bare_k_snapshots` row
- **THEN** its section shows the placeholder text "此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新"

#### Scenario: Back link returns to table view

- **WHEN** the user is on `?view=chart&list=big&tier=200` and clicks the viewer's back link
- **THEN** the browser navigates to `/investment/equity?tier=200`

---
### Requirement: Chip context in chart section header

Each section header in the equity chart view SHALL append chip context formatted "<級距>大戶 <change>pp・股東 <rate>%". The holder change field and label SHALL follow the active tier: tier `200` uses `mid_holder_pct_change` labeled "200張+", tier `1000` uses `whale_holder_pct_change` labeled "1000張+", and no tier or tier `400` uses `big_holder_pct_change` labeled "400張+". Values SHALL be shown with two decimals and a leading `+` when positive. A part whose value is null SHALL be omitted together with its separator, and when both values are null no context SHALL be shown.

#### Scenario: Default tier context

- **WHEN** tier is not set and a row has `big_holder_pct_change` 0.85 and `shareholders_change_rate` -2.3
- **THEN** the header context reads "400張+大戶 +0.85pp・股東 -2.30%"

##### Example: header context formatting

| tier | big | mid | whale | shareholders_change_rate | context |
| ---- | --- | --- | ----- | ------------------------ | ------- |
| (none) | 0.85 | 0.10 | 1.20 | -2.3 | 400張+大戶 +0.85pp・股東 -2.30% |
| 200 | 0.85 | 0.10 | 1.20 | -2.3 | 200張+大戶 +0.10pp・股東 -2.30% |
| 1000 | 0.85 | 0.10 | 1.20 | null | 1000張+大戶 +1.20pp |
| 400 | null | 0.10 | 1.20 | 1.5 | 股東 +1.50% |
| (none) | null | null | null | null | (empty) |

---
### Requirement: SyncBareKStep includes equity ranking stocks

`SyncBareKStep` SHALL query `equity_distribution_stats` at the globally latest `snapshot_date` (determined by an independent `MAX(snapshot_date)` query, not by any specific stock) and build the equity ranking stock list from the precomputed columns, reproducing the ranking page's default view (one week, no tier, no sort): the double-signal list (`big_holder_pct_change > 0` and `shareholders_change_rate < 0`, ordered by `big_holder_pct_change` descending, limit `EQUITY_DOUBLE_LIMIT` = 10), then the big-holder list (`big_holder_pct_change > 0`, ordered by `big_holder_pct_change` descending, limit `EQUITY_LIST_LIMIT` = 30), then the retail-decline list (`shareholders_change_rate < 0`, ordered by `shareholders_change_rate` ascending, limit `EQUITY_LIST_LIMIT` = 30). Ties SHALL be broken by `stock_code` ascending. The concatenated list SHALL be appended after window-momentum stocks and de-duplicated against all earlier entries, so that when the combined list exceeds `MAX_STOCKS` (200) equity ranking stocks are truncated first. `EQUITY_LIST_LIMIT` MUST equal the frontend `EQUITY_CHART_LIST_LIMIT`.

#### Scenario: Equity stocks appended last and de-duplicated

- **WHEN** watch_list is `['2330']`, strategy stocks are `['2454']`, momentum stocks are `['3017']`, and the equity ranking list is `['2454', '6669', '2330', '3661']`
- **THEN** the sync batch is `['2330', '2454', '3017', '6669', '3661']`

#### Scenario: Equity stocks truncated first at MAX_STOCKS

- **WHEN** watch_list, strategy and momentum stocks together are 195 distinct stocks and the equity ranking list adds 20 new stocks
- **THEN** the sync batch contains the 195 earlier stocks followed by the first 5 equity ranking stocks

#### Scenario: Equity query failure does not abort the step

- **WHEN** the equity ranking SQL query raises an exception
- **THEN** `SyncBareKStep` logs an error, treats the equity ranking list as empty, continues syncing the other stocks, and does not raise

#### Scenario: No equity distribution data

- **WHEN** `equity_distribution_stats` has no rows
- **THEN** the equity ranking list is empty and the step syncs the other stocks normally
