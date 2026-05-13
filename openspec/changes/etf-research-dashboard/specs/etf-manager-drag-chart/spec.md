## ADDED Requirements

### Requirement: Display manager drag bar chart

The page at `/investment/manager-drag` SHALL fetch the latest `computed_date` from `etf_cumulative_drag` and render a horizontal bar chart with one bar per ETF. The primary metric SHALL be `annual_manager_drag_kshares_per_yi` (年化經理人拖累，千股/億元AUM). A secondary bar (lighter shade) SHALL overlay `annual_excess_volume_kshares_per_yi`.

#### Scenario: Null AUM metrics

- **WHEN** `annual_manager_drag_kshares_per_yi` is null for an ETF
- **THEN** that ETF's bar SHALL be rendered as a grey placeholder with label "AUM 資料不足"

#### Scenario: Sort order

- **WHEN** the chart renders
- **THEN** ETFs SHALL be sorted by `annual_manager_drag_kshares_per_yi` descending (largest drag on top)

### Requirement: Summary stats panel

Above the chart, the page SHALL display: total `n_events` across all ETFs, average `events_per_year`, and date range covered (`days_span`).

#### Scenario: Stats display

- **WHEN** data loads
- **THEN** three stat cards SHALL show: 總事件數、平均年化頻率、資料跨度（天）

### Requirement: Server Action data fetch

A Server Action `getEtfManagerDrag()` at `src/app/actions/getEtfManagerDrag.ts` SHALL query `etf_cumulative_drag` for the latest `computed_date` and return all ETF rows.

#### Scenario: Empty table

- **WHEN** no data exists yet
- **THEN** the page SHALL display "尚無資料，等待 Pipeline 執行後自動更新"
