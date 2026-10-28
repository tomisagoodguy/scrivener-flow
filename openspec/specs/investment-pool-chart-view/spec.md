# investment-pool-chart-view Specification

## Purpose

Lets the user scroll through bare-K charts for every Taiwan-listed constituent of all active ETFs on one page, ordered by how many ETFs hold each stock. The ETF pipeline syncs bare-K snapshots for these pool stocks so the charts have data.

## Requirements

### Requirement: Pool chart page entry and back navigation

The investment pool page `/investment` SHALL show a link labelled `圖表瀏覽` that navigates to `/investment/pool-chart`. The pool chart page SHALL show a back control that navigates to `/investment`. Adding the link SHALL NOT make `/investment` read `searchParams` or change its existing data queries.

#### Scenario: Open chart page from the pool page

- **WHEN** the user clicks `圖表瀏覽` on `/investment`
- **THEN** the browser navigates to `/investment/pool-chart` and the first chart section is visible

#### Scenario: Return to the pool page

- **WHEN** the user activates the back control on `/investment/pool-chart`
- **THEN** the browser navigates to `/investment`


<!-- @trace
source: investment-pool-chart-view
updated: 2026-10-28
code:
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/investment/pool/PoolChartViewer.tsx
  - src/lib/investment/poolChartUtils.ts
  - ETF/CLAUDE.md
  - src/app/investment/pool-chart/page.tsx
tests:
  - src/components/features/investment/pool/__tests__/PoolChartViewer.test.tsx
  - src/lib/investment/__tests__/poolChartUtils.test.ts
  - ETF/tests/test_sync_bare_k_step.py
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
-->

---
### Requirement: Pool chart stock list

The pool chart page SHALL list every stock that appears in the latest holdings of any active ETF returned by `getAllHoldings()`, restricted to codes matching `^\d{4}$`. Each stock SHALL appear exactly once and SHALL carry the list of ETF codes that hold it. The list SHALL be ordered by the number of holding ETFs descending, then by stock code ascending. When the list is empty the page SHALL show the message `目前沒有選股池股票`.

#### Scenario: Union, filtering and ordering

- **WHEN** the pool chart rows are built from per-ETF holdings
- **THEN** non-4-digit codes are excluded, duplicates are merged with their holding ETF codes, and rows are ordered by ETF count descending then code ascending

##### Example: three ETFs

| Holdings input | Expected rows (code: etfs) | Notes |
| --- | --- | --- |
| 00981A: 2330, 2454, NVDA; 00980A: 2330, 3008; 00991A: 2454, 2330, 006208 | 2330: [00981A, 00980A, 00991A]; 2454: [00981A, 00991A]; 3008: [00980A] | NVDA and 006208 dropped; 2330 held by 3 ETFs sorts first |
| 00981A: 3008, 2317; 00980A: 2317, 3008 | 2317: [00981A, 00980A]; 3008: [00981A, 00980A] | equal ETF count sorts by code ascending |
| all ETFs empty | (no rows) | page shows `目前沒有選股池股票` |

#### Scenario: Stock name fallback

- **WHEN** a holding has a null or empty `stock_name`
- **THEN** the row name is the empty string and the chart header still shows the stock code


<!-- @trace
source: investment-pool-chart-view
updated: 2026-10-28
code:
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/investment/pool/PoolChartViewer.tsx
  - src/lib/investment/poolChartUtils.ts
  - ETF/CLAUDE.md
  - src/app/investment/pool-chart/page.tsx
tests:
  - src/components/features/investment/pool/__tests__/PoolChartViewer.test.tsx
  - src/lib/investment/__tests__/poolChartUtils.test.ts
  - ETF/tests/test_sync_bare_k_step.py
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
-->

---
### Requirement: Continuous scroll pool charts with holding ETF tags

The pool chart page SHALL render the rows through the shared `ScrollChartViewer` in row order, one bare-K chart section per stock, with the holding ETF codes passed as the section tags and the header text `N 支 ETF 持有` where N is the holding ETF count. The viewer wrapper SHALL apply `pt-6` so the sticky sub-navigation does not overlap the page header.

#### Scenario: Header shows holding count and ETF tags

- **WHEN** the section for 2330 held by 00981A, 00980A and 00991A is rendered
- **THEN** its header shows `3 支 ETF 持有` and its tags show 00981A, 00980A and 00991A


<!-- @trace
source: investment-pool-chart-view
updated: 2026-10-28
code:
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/investment/pool/PoolChartViewer.tsx
  - src/lib/investment/poolChartUtils.ts
  - ETF/CLAUDE.md
  - src/app/investment/pool-chart/page.tsx
tests:
  - src/components/features/investment/pool/__tests__/PoolChartViewer.test.tsx
  - src/lib/investment/__tests__/poolChartUtils.test.ts
  - ETF/tests/test_sync_bare_k_step.py
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
-->

---
### Requirement: Pool chart page hides jump dots

`ScrollChartViewer` SHALL accept an optional `showJumpDots` prop defaulting to `true`. When `showJumpDots` is `true` the viewer SHALL keep its existing rule of showing the right-side jump dots only when there are more than 3 slides. When `showJumpDots` is `false` the viewer SHALL NOT render the jump dots. The pool chart page SHALL pass `showJumpDots={false}`; navigation there relies on the sub-navigation previous/next controls and the `n / total` position indicator.

Rationale: 218 dots of 8 px with 8 px gaps are about 3480 px tall in a fixed, vertically centred column, so most of them are off screen and cannot be clicked.

#### Scenario: Default keeps existing jump dots

- **WHEN** `ScrollChartViewer` is rendered with 4 slides and no `showJumpDots` prop
- **THEN** the jump-dot navigation is rendered

#### Scenario: Jump dots disabled

- **WHEN** `ScrollChartViewer` is rendered with 4 slides and `showJumpDots={false}`
- **THEN** no jump-dot navigation is rendered and the sub-navigation previous/next controls are still rendered

#### Scenario: Pool chart page has no jump dots

- **WHEN** the pool chart page renders its rows
- **THEN** `ScrollChartViewer` receives `showJumpDots={false}`


<!-- @trace
source: investment-pool-chart-view
updated: 2026-10-28
code:
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/investment/pool/PoolChartViewer.tsx
  - src/lib/investment/poolChartUtils.ts
  - ETF/CLAUDE.md
  - src/app/investment/pool-chart/page.tsx
tests:
  - src/components/features/investment/pool/__tests__/PoolChartViewer.test.tsx
  - src/lib/investment/__tests__/poolChartUtils.test.ts
  - ETF/tests/test_sync_bare_k_step.py
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
-->

---
### Requirement: On-demand snapshot loading

The pool chart page SHALL NOT embed bare-K snapshots in the server-rendered payload. Each chart section SHALL request its snapshot through the `getStrategySnapshots` Server Action only after the section has stayed within the viewport (observed with `IntersectionObserver`) continuously for `DWELL_MS` = 300 milliseconds. A section that leaves the viewport before 300 milliseconds SHALL NOT send a request. Each section SHALL send at most one request for its lifetime. The section SHALL show a loading placeholder until the request settles. A section whose snapshot is missing SHALL show `此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新`. A section whose request fails SHALL show `圖表載入失敗` and SHALL log the error to the console.

Rationale: browser-side Server Action calls in Next.js run one at a time; requesting on first render made a long jump queue the destination behind every section scrolled past.

#### Scenario: Snapshot loads after the section dwells in view

- **WHEN** a section stays in the viewport for 300 milliseconds
- **THEN** exactly one snapshot request for that stock is sent and the bare-K chart replaces the loading placeholder after it resolves

##### Example: dwell timing

| Viewport sequence | Requests sent | Notes |
| --- | --- | --- |
| enters, leaves after 299 ms | 0 | scrolled past during a jump |
| enters, stays 300 ms | 1 | |
| enters, stays 300 ms, leaves, re-enters for 300 ms | 1 | never re-requests |
| never enters the viewport | 0 | |

#### Scenario: Snapshot not yet synced

- **WHEN** the snapshot request for a stock resolves with no snapshot
- **THEN** the section shows `此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新`

#### Scenario: Snapshot request fails

- **WHEN** the snapshot request rejects
- **THEN** the section shows `圖表載入失敗` and the error is written with `console.error`


<!-- @trace
source: investment-pool-chart-view
updated: 2026-10-28
code:
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/investment/pool/PoolChartViewer.tsx
  - src/lib/investment/poolChartUtils.ts
  - ETF/CLAUDE.md
  - src/app/investment/pool-chart/page.tsx
tests:
  - src/components/features/investment/pool/__tests__/PoolChartViewer.test.tsx
  - src/lib/investment/__tests__/poolChartUtils.test.ts
  - ETF/tests/test_sync_bare_k_step.py
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
-->

---
### Requirement: SyncBareKStep includes pool stocks

`SyncBareKStep` SHALL fetch pool stocks as the distinct `stock_code` values matching `^[0-9]{4}$` in each ETF's latest `etf_holdings_snapshot.data_date`, ordered by holding ETF count descending then stock code ascending. Pool stocks SHALL be appended after watch-list, strategy, window-momentum and equity-ranking stocks and de-duplicated keeping the first occurrence. `MAX_STOCKS` SHALL be 400. A failure while fetching pool stocks SHALL be logged with `logger.error` and SHALL yield an empty list without raising.

#### Scenario: Merge order with pool stocks

- **WHEN** watch-list is [2330], strategy is [2454], momentum is [], equity ranking is [3008] and pool is [2330, 2317, 3008]
- **THEN** the synced list is [2330, 2454, 3008, 2317]

#### Scenario: Pool query fails

- **WHEN** the pool stock query raises an exception
- **THEN** the step logs an error, treats pool stocks as empty and continues syncing the other sources

<!-- @trace
source: investment-pool-chart-view
updated: 2026-10-28
code:
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/investment/pool/PoolChartViewer.tsx
  - src/lib/investment/poolChartUtils.ts
  - ETF/CLAUDE.md
  - src/app/investment/pool-chart/page.tsx
tests:
  - src/components/features/investment/pool/__tests__/PoolChartViewer.test.tsx
  - src/lib/investment/__tests__/poolChartUtils.test.ts
  - ETF/tests/test_sync_bare_k_step.py
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
-->