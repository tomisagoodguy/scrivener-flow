## ADDED Requirements

### Requirement: Display Active Share heatmap matrix

The page at `/investment/active-share` SHALL fetch the latest `computed_date` from `etf_active_share` and render an N×N heatmap grid. Each cell (row=ETF A, col=ETF B) SHALL show `active_share_pct` as a background color from white (0%) to deep rose (100%). The diagonal SHALL be left blank.

#### Scenario: Pairwise symmetry

- **WHEN** the heatmap is rendered
- **THEN** cell (A, B) and cell (B, A) SHALL both display the same `active_share_pct` value (the table stores only A < B; the page mirrors it)

##### Example: color scale

| active_share_pct | Background |
|---|---|
| 0–20% | `bg-rose-50` |
| 21–40% | `bg-rose-100` |
| 41–60% | `bg-rose-200` |
| 61–80% | `bg-rose-300` |
| 81–100% | `bg-rose-500` |

#### Scenario: No data

- **WHEN** `etf_active_share` is empty (step hasn't run on Monday yet)
- **THEN** the page SHALL display "每週一更新，尚無資料" with the last updated date if available

### Requirement: Show AS vs mean sidebar

Below or beside the heatmap, the page SHALL list each ETF's `as_vs_mean_a` value (its Active Share against the industry-mean portfolio), sorted descending. Higher value = more differentiated from peers.

#### Scenario: Sidebar data

- **WHEN** heatmap data is loaded
- **THEN** a ranked list SHALL show `etf_code` and `as_vs_mean` for each ETF

### Requirement: Server Action data fetch

A Server Action `getEtfActiveShare()` at `src/app/actions/getEtfActiveShare.ts` SHALL query `etf_active_share` for the latest `computed_date` and return all pairwise rows plus the list of unique ETF codes.

#### Scenario: Latest date selection

- **WHEN** multiple `computed_date` values exist
- **THEN** only the most recent date's rows SHALL be returned
