# momentum-chart-view Specification

## Purpose

TBD - created by archiving change 'momentum-chart-view'. Update Purpose after archive.

## Requirements

### Requirement: Momentum page view toggle

The momentum page (`/investment/momentum`) SHALL render a view toggle with two links labeled "卡片" and "圖表" inside the header card. The "圖表" link SHALL navigate to `?view=chart` and the "卡片" link SHALL omit the `view` parameter. Both links MUST preserve the current `window` and `min_count` values. Any `view` value other than `chart` SHALL be treated as the card view. The active view SHALL be visually highlighted.

#### Scenario: Toggle preserves filters

- **WHEN** the user is on `/investment/momentum?window=10&min_count=3` and clicks "圖表"
- **THEN** the browser SHALL navigate to a URL containing `view=chart`, `window=10` and `min_count=3`

#### Scenario: Unknown view falls back to cards

- **WHEN** the user opens `/investment/momentum?view=foo`
- **THEN** the page SHALL render the card grid and highlight "卡片"

#### Scenario: Changing filters stays in chart view

- **WHEN** the user is in chart view and selects a different 觀察天數 option in MomentumFilter
- **THEN** the resulting URL SHALL still contain `view=chart`

---
### Requirement: Momentum continuous scroll chart viewer

When `view=chart`, the momentum page SHALL render every momentum stock returned by `getWindowMomentum` as a vertically scrollable list of bare-K six-panel charts using `ScrollChartViewer` and `BareKSlideContent`, in the same order as the card view (etfCount descending, then totalAccumulatedShares descending). Snapshots SHALL be loaded via `getStrategySnapshots` only when `view=chart`.

#### Scenario: Stock with snapshot renders six-panel chart

- **WHEN** `bare_k_snapshots` contains an entry for a momentum stock
- **THEN** that slide SHALL render the full six-panel bare-K chart

#### Scenario: Stock without snapshot shows placeholder

- **WHEN** `bare_k_snapshots` has no entry for a momentum stock
- **THEN** that slide SHALL display "此股票尚未同步裸K資料，將於今日 Pipeline 執行後更新" and the other slides SHALL render normally

#### Scenario: Empty momentum list

- **WHEN** `getWindowMomentum` returns zero stocks in chart view
- **THEN** the page SHALL show the same empty-state message as the card view ("窗口內無同步加碼個股") and SHALL NOT render ScrollChartViewer

#### Scenario: Card view does not query snapshots

- **WHEN** the page is rendered without `view=chart`
- **THEN** `getStrategySnapshots` SHALL NOT be called

---
### Requirement: Accumulating ETF tags on momentum chart

Each momentum chart slide SHALL show one tag per accumulating ETF, formatted as `<etfCode> +<lots>張`, where lots = `Math.round(netShares / 1000)` with thousands separators. Tag order SHALL follow `etfDetails` order (netWeightChange descending). The formatting SHALL be implemented by the pure function `formatMomentumEtfTags`.

#### Scenario: Shares converted to lots

- **WHEN** a stock has etfDetails `[{ etfCode: '00981A', netShares: 320400 }, { etfCode: '00980A', netShares: 1250000 }]`
- **THEN** the tags SHALL be `['00981A +320張', '00980A +1,250張']`

##### Example: Rounding and separators

| netShares | Tag |
| --------- | --- |
| 320400 | `00981A +320張` |
| 1250000 | `00981A +1,250張` |
| 499 | `00981A +0張` |

---
### Requirement: Accumulation date markers on momentum chart

`getWindowMomentum` SHALL return `accumulationDates: string[]` for every stock, computed by the pure function `computeAccumulationDates(sharesByDate)` as the dates whose summed diff_shares across accumulating ETFs is greater than 0, sorted ascending. The chart view SHALL pass `accumulationDates` to `BareKSlideContent` as `markerDates`. The `getWindowMomentum` cache key SHALL be bumped to `window-momentum-v2`.

#### Scenario: Only net-buy dates are marked

- **WHEN** sharesByDate is `{ '2026-10-20': 5000, '2026-10-21': -2000, '2026-10-22': 0, '2026-10-17': 3000 }`
- **THEN** `computeAccumulationDates` SHALL return `['2026-10-17', '2026-10-20']`

#### Scenario: Markers rendered on chart

- **WHEN** a momentum stock with a snapshot has non-empty accumulationDates
- **THEN** its K-line panel SHALL display markers on those dates

---
### Requirement: Momentum chart header summary

Each momentum chart slide header SHALL display a summary produced by the pure function `formatMomentumHeader(etfCount, totalWeightChange)` in the form `<N> 家同步・權重 <signed value>pp`, with the weight rounded to two decimals and always signed.

#### Scenario: Positive and negative weight change

- **WHEN** etfCount is 3 and totalWeightChange is 1.254
- **THEN** the header summary SHALL be `3 家同步・權重 +1.25pp`

##### Example: Signed formatting

| etfCount | totalWeightChange | Output |
| -------- | ----------------- | ------ |
| 3 | 1.254 | `3 家同步・權重 +1.25pp` |
| 2 | -0.5 | `2 家同步・權重 -0.50pp` |
| 4 | 0 | `4 家同步・權重 +0.00pp` |

---
### Requirement: Back navigation from momentum chart view

The momentum chart viewer back link SHALL point to `/investment/momentum?window=<current window>&min_count=<current min_count>` (card view with the current filters).

#### Scenario: Back keeps filters

- **WHEN** the user is on `/investment/momentum?view=chart&window=14&min_count=2` and clicks the back link
- **THEN** the browser SHALL navigate to `/investment/momentum?window=14&min_count=2`
