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

In chart view the page SHALL render a list selector with three links: "雙訊號" (`list=double`), "主力買進" (`list=big`) and "散戶減少" (`list=retail`), each labeled with the number of stocks it will show. A missing or unrecognized `list` value SHALL be treated as `double`. The chart rows SHALL be taken from the ranking result for the current `tier`, `weeks`, `sort` and `dir` parameters in its existing order: `double` SHALL use the double-signal ranking as is (at most 10 rows), and `big` and `retail` SHALL use the first `EQUITY_CHART_LIST_LIMIT` (100) rows of the big-holder and retail-decline rankings. The chart view SHALL NOT render the double-signal section or the ranking panel grid. `TierNav` and `WeekNav` links SHALL preserve `view` and `list` while in chart view.

#### Scenario: Invalid list falls back to double

- **WHEN** the user opens `/investment/equity?view=chart&list=foo`
- **THEN** the "雙訊號" link is highlighted and the chart shows the double-signal ranking

#### Scenario: Big list is capped at 100

- **WHEN** the big-holder ranking has 218 rows and the user opens `?view=chart&list=big`
- **THEN** the chart contains exactly the first 100 rows of the big-holder ranking, in the same order, and the "主力買進" link shows 100 as its count

##### Example: rows selected per list

| list | doubleSignalRanking | bigHolderRanking | retailDeclineRanking | chart rows |
| ---- | ------------------- | ---------------- | -------------------- | ---------- |
| double | 7 rows | 218 rows | 272 rows | the 7 double-signal rows |
| big | 7 rows | 218 rows | 272 rows | big-holder rows 1–100 |
| retail | 7 rows | 218 rows | 272 rows | retail rows 1–100 |
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


<!-- @trace
source: equity-chart-top-100
updated: 2026-10-31
code:
  - src/components/features/investment/equity/EquityChartViewer.tsx
  - src/lib/investment/equityChartUtils.ts
  - src/components/features/investment/BareKTradeLabels.ts
  - src/app/investment/equity/page.tsx
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/app/actions/getWindowMomentum.ts
tests:
  - src/components/features/investment/__tests__/BareKTradeLabels.test.ts
  - src/lib/investment/__tests__/equityChartUtils.test.ts
  - src/components/features/investment/equity/__tests__/EquityChartViewer.test.tsx
  - ETF/tests/test_sync_bare_k_step.py
-->

---
### Requirement: Scrollable bare-K charts for equity ranking stocks

The chart view SHALL render the selected rows with the shared `ScrollChartViewer`, and each section SHALL load its stock's latest `bare_k_snapshots` row on demand through `LazyBareKSlide`: the section SHALL show a loading skeleton until it has stayed in the viewport for `DWELL_MS` (300 ms), then request that single stock's snapshot through `getStrategySnapshots` at most once, and render `BareKSlideContent` with the result. The page SHALL NOT fetch bare-K snapshots on the server for the chart rows. Each section header SHALL show the stock code and the stock name from the ranking row. Each chart's tags SHALL be the ETF codes listed for that stock in the ranking `etfMap`, or no tags when the stock has no entry. Stocks without a snapshot SHALL show a placeholder with the text "此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新", and a failed snapshot request SHALL show "圖表載入失敗" in that section only. The viewer SHALL show jump dots only when the chart has at most 30 rows and SHALL hide them when it has more than 30 rows. The viewer's back link SHALL point to `/investment/equity` carrying the current non-default `tier` and `weeks`. Changing the list SHALL remount the viewer at the first stock. The viewer SHALL NOT change the browser URL while scrolling.

#### Scenario: Stock with snapshot renders chart and ETF tags

- **WHEN** stock 2330 is in the chart rows, has a bare-K snapshot, `etfMap['2330']` is `['00981A', '00980A']`, and its section has stayed in the viewport for 300 ms
- **THEN** its section renders the six-panel bare-K chart with tags "00981A" and "00980A"

#### Scenario: Sections load snapshots only after dwelling in view

- **WHEN** the chart view opens with 100 rows
- **THEN** the server render issues no `bare_k_snapshots` query, sections not yet dwelled in the viewport show the loading skeleton, and no snapshot request is sent for a section that left the viewport before 300 ms

#### Scenario: Stock without snapshot shows placeholder

- **WHEN** a chart-row stock has no `bare_k_snapshots` row and its section finishes loading
- **THEN** its section shows the placeholder text "此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新"

#### Scenario: Jump dots depend on row count

- **WHEN** the chart has a given number of rows
- **THEN** jump dots are shown or hidden according to the row count

##### Example: jump dot visibility

| chart rows | jump dots |
| ---------- | --------- |
| 7 | shown |
| 30 | shown |
| 31 | hidden |
| 100 | hidden |

#### Scenario: Back link returns to table view

- **WHEN** the user is on `?view=chart&list=big&tier=200` and clicks the viewer's back link
- **THEN** the browser navigates to `/investment/equity?tier=200`


<!-- @trace
source: equity-chart-top-100
updated: 2026-10-31
code:
  - src/components/features/investment/equity/EquityChartViewer.tsx
  - src/lib/investment/equityChartUtils.ts
  - src/components/features/investment/BareKTradeLabels.ts
  - src/app/investment/equity/page.tsx
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/app/actions/getWindowMomentum.ts
tests:
  - src/components/features/investment/__tests__/BareKTradeLabels.test.ts
  - src/lib/investment/__tests__/equityChartUtils.test.ts
  - src/components/features/investment/equity/__tests__/EquityChartViewer.test.tsx
  - ETF/tests/test_sync_bare_k_step.py
-->

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

`SyncBareKStep` SHALL build the equity ranking stock list with a single query on `equity_distribution_stats` that reproduces the ranking page for every `weeks` value from 1 to `EQUITY_MAX_WEEKS` (4) with no tier and no sort. The query SHALL take the latest `EQUITY_MAX_WEEKS + 1` distinct `snapshot_date` values globally (not determined by any specific stock), numbered 0 (latest) to 4 in descending date order. For each N from 1 to 4 it SHALL compare each stock's latest-period row with its period-N row, computing `big_change` as the latest `big_holder_pct` minus the period-N `big_holder_pct`, and `sh_rate` as `(latest total_shareholders − period-N total_shareholders) / period-N total_shareholders × 100` rounded to 2 decimals, treated as null when the period-N `total_shareholders` is not positive or any operand is null. For each N it SHALL select the double-signal list (`big_change > 0` and `sh_rate < 0`, ordered by `big_change` descending, limit `EQUITY_DOUBLE_LIMIT` = 10), the big-holder list (`big_change > 0`, ordered by `big_change` descending, limit `EQUITY_LIST_LIMIT` = 100) and the retail-decline list (`sh_rate < 0`, ordered by `sh_rate` ascending, limit `EQUITY_LIST_LIMIT` = 100), with ties broken by `stock_code` ascending. The results SHALL be concatenated ordered by N ascending, then list order (double-signal, big-holder, retail-decline), then rank, and de-duplicated keeping the first occurrence. A week N without a period-N snapshot SHALL contribute no stocks while other weeks proceed. The query SHALL NOT use `::` casts. Equity ranking stocks SHALL be appended after window-momentum stocks and before pool stocks, de-duplicated against all earlier entries, within the `MAX_STOCKS` (400) limit. `EQUITY_LIST_LIMIT` MUST equal the frontend `EQUITY_CHART_LIST_LIMIT`, and `EQUITY_MAX_WEEKS` MUST equal the largest frontend `weeks` option.

#### Scenario: Weeks and lists concatenated in order and de-duplicated

- **WHEN** the query returns the rows below
- **THEN** the equity ranking list is in week order, then list order, then rank, with later duplicates dropped

##### Example: concatenation order

- **GIVEN** query rows (weeks, list, rank, stock): (1, double, 1, 2454), (1, big, 1, 2454), (1, big, 2, 6669), (1, retail, 1, 2330), (2, double, 1, 3661), (2, big, 1, 6669), (4, retail, 1, 3008)
- **WHEN** `_fetch_equity_ranking_stocks` runs
- **THEN** it returns `['2454', '6669', '2330', '3661', '3008']`

#### Scenario: Ranking matches the frontend N-week computation

- **WHEN** stock A has `big_holder_pct` 40.00 at the latest period and 39.10 at period 2, and `total_shareholders` 9700 at the latest period and 10000 at period 2
- **THEN** for N = 2 stock A has `big_change` 0.90 and `sh_rate` -3.00, and is eligible for the double-signal, big-holder and retail-decline lists of week 2

#### Scenario: Insufficient history skips missing weeks

- **WHEN** `equity_distribution_stats` has only 3 distinct `snapshot_date` values
- **THEN** the list contains stocks from weeks 1 and 2 only, and the step does not raise

#### Scenario: Equity stocks appended after momentum and de-duplicated

- **WHEN** watch_list is `['2330']`, strategy stocks are `['2454']`, momentum stocks are `['3017']`, the equity ranking list is `['2454', '6669', '2330', '3661']` and pool stocks are empty
- **THEN** the sync batch is `['2330', '2454', '3017', '6669', '3661']`

#### Scenario: Equity query failure does not abort the step

- **WHEN** the equity ranking SQL query raises an exception
- **THEN** `SyncBareKStep` logs an error, treats the equity ranking list as empty, continues syncing the other stocks, and does not raise

#### Scenario: No equity distribution data

- **WHEN** `equity_distribution_stats` has no rows
- **THEN** the equity ranking list is empty and the step syncs the other stocks normally

<!-- @trace
source: equity-chart-top-100
updated: 2026-10-31
code:
  - src/components/features/investment/equity/EquityChartViewer.tsx
  - src/lib/investment/equityChartUtils.ts
  - src/components/features/investment/BareKTradeLabels.ts
  - src/app/investment/equity/page.tsx
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/app/actions/getWindowMomentum.ts
tests:
  - src/components/features/investment/__tests__/BareKTradeLabels.test.ts
  - src/lib/investment/__tests__/equityChartUtils.test.ts
  - src/components/features/investment/equity/__tests__/EquityChartViewer.test.tsx
  - ETF/tests/test_sync_bare_k_step.py
-->