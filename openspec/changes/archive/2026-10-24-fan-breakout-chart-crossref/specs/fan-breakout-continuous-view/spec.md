## ADDED Requirements

### Requirement: View mode toggle on fan-breakout candidate page

The fan-breakout candidate page SHALL show a two-option toggle labeled "表格" and "連續看圖" below the filter bar. The default mode SHALL be "表格". In "連續看圖" mode the page SHALL hide the candidate table, the pagination controls and the single-chart panel, and SHALL keep the filter bar visible.

#### Scenario: Default mode is table

- **WHEN** the user opens `/investment/strategy/fan-breakout` with at least one candidate row
- **THEN** the "表格" option is selected and the candidate table, pagination and single-chart panel are rendered

#### Scenario: Switch to continuous mode

- **WHEN** the user clicks "連續看圖"
- **THEN** the table, pagination and single-chart panel are not rendered, the filter bar remains rendered, and the scroll chart viewer is rendered

#### Scenario: Return to table via sub-nav back button

- **WHEN** the user is in continuous mode and clicks the sub-nav back button labeled "返回表格"
- **THEN** the page switches to table mode without navigating to another URL, and the table keeps the filters that were active

#### Scenario: Arrow keys only navigate in table mode

- **WHEN** the page is in continuous mode and the user presses ArrowRight or ArrowLeft
- **THEN** the table selection index SHALL NOT change

### Requirement: Continuous list contains one latest row per stock

The continuous view SHALL list the filtered candidate rows with duplicates removed by stock ID, keeping for each stock the first row in the filtered order (which is newest signal date first). The initial position SHALL be the stock of the currently selected table row, or the first stock when that stock is not in the list.

#### Scenario: Duplicate stock keeps its newest signal row

- **WHEN** the filtered rows contain the same stock on multiple signal dates
- **THEN** the continuous list contains that stock once, using its newest signal date row

##### Example: dedupe preserves order

- **GIVEN** filtered rows in order `[2330@2026-10-23, 2454@2026-10-23, 2330@2026-10-20, 3017@2026-10-20]`
- **WHEN** the continuous list is built
- **THEN** it is `[2330@2026-10-23, 2454@2026-10-23, 3017@2026-10-20]`

#### Scenario: Initial position follows table selection

- **WHEN** the selected table row is stock 2454 and the user switches to continuous mode
- **THEN** the viewer initially scrolls to the section for 2454 and the sub-nav shows its position

#### Scenario: No rows after filtering

- **WHEN** the filters leave zero rows while in continuous mode
- **THEN** the page shows "沒有符合篩選條件的候選。" and does not render the scroll chart viewer

#### Scenario: Filter change resets the viewer

- **WHEN** the user changes any filter while in continuous mode
- **THEN** the scroll chart viewer remounts and starts at the first stock of the new list

### Requirement: Each continuous section shows MA fan chart and signal summary

Each section in the continuous view SHALL render the same price chart used by the single-chart panel: a K-line chart with MA5, MA10, MA20, MA60 and MA120 lines and markers on every date in the row's recent signal dates. The section header SHALL show, after the stock code and name, the signal date, the spread as a signed percentage with one decimal, "首次" or "再次", "連續 N 天", and the return since signal. Return since signal SHALL use `text-rose-600 dark:text-rose-400` when positive, `text-emerald-600 dark:text-emerald-400` when negative, gray when zero, and SHALL display "—" when null. Spread, signal type and consecutive days SHALL be omitted when null.

#### Scenario: Header shows formatted summary

- **WHEN** a section renders a row with spread 0.1234, signal type "first", consecutive days 3 and return since signal 0.052
- **THEN** the header shows the signal date, "+12.3%", "首次", "連續 3 天" and "+5.2%" in rose color

##### Example: return-since-signal formatting

| returnSinceSignal | Displayed | Color class |
| ----------------- | --------- | ----------- |
| 0.052 | +5.2% | text-rose-600 |
| -0.031 | -3.1% | text-emerald-600 |
| 0 | 0.0% | gray |
| null | — | gray |

#### Scenario: Chart only loads for rendered sections

- **WHEN** the continuous view opens with 20 stocks at position 1
- **THEN** price data is requested only for sections the viewer has rendered (the active section and its neighbours), not for all 20 stocks

#### Scenario: Price data failure in one section

- **WHEN** price data loading fails for one stock
- **THEN** that section shows the error text and the other sections still render their charts

### Requirement: Single-chart panel and continuous sections share one chart component

The single-chart panel in table mode and every continuous section SHALL render the price chart through the same component, so MA periods and marker behavior stay identical in both modes.

#### Scenario: Same MA periods in both modes

- **WHEN** the same stock is shown in the table-mode panel and in a continuous section
- **THEN** both charts draw MA5, MA10, MA20, MA60 and MA120 and the same signal date markers
