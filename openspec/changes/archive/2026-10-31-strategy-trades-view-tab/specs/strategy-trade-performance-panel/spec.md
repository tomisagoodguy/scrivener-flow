## MODIFIED Requirements

### Requirement: Trade performance panel placement and strategy switch

The "換股後表現" panel SHALL be rendered only in the trades view of `/investment/strategy` (`view=trades`), below the page title row and the main view toggle; the strategy view (no `view` parameter), the monitor view and the chart view SHALL NOT render it. The panel SHALL offer a switch with "全部" (default) and one option per strategy present in the data, labelled with the short strategy label. Switching SHALL be client-side state and SHALL NOT change the URL. The panel SHALL include a note that figures are price returns from the next-day open, adjusted for dividends, excluding fees and taxes, and recomputed with the current strategy logic.

#### Scenario: Switch to a single strategy

- **WHEN** the user selects a strategy option in the panel on `/investment/strategy?view=trades`
- **THEN** every section of the panel shows only that strategy's trades and the URL is unchanged

#### Scenario: Not shown in other views

- **WHEN** the user opens `/investment/strategy?view=monitor`
- **THEN** the panel is not rendered

#### Scenario: Strategy view no longer embeds the panel

- **WHEN** the user opens `/investment/strategy`
- **THEN** the strategy analytics panel, the multi-strategy consensus panel and the strategy signal cards are rendered and the "換股後表現" panel is not

## ADDED Requirements

### Requirement: Trades view tab in strategy page toggle

The strategy page main view toggle SHALL render five tabs in this order: "策略視角" linking to `/investment/strategy`, "監控清單" linking to `/investment/strategy?view=monitor`, "圖表" linking to `/investment/strategy?view=chart`, "均線發散候選" linking to `/investment/strategy/fan-breakout`, and "換股後表現" linking to `/investment/strategy?view=trades`. The tab of the current view SHALL be highlighted; "均線發散候選" SHALL never be highlighted on this page. A missing or unrecognized `view` value SHALL be treated as the strategy view.

#### Scenario: Trades tab highlighted

- **WHEN** the user opens `/investment/strategy?view=trades`
- **THEN** the "換股後表現" tab is highlighted and the other four tabs are not

#### Scenario: Unrecognized view falls back

- **WHEN** the user opens `/investment/strategy?view=foo`
- **THEN** the strategy view is rendered and the "策略視角" tab is highlighted

##### Example: View parsing

| `view` param | Parsed view |
| ------------ | ----------- |
| (absent)     | strategy    |
| monitor      | monitor     |
| chart        | chart       |
| trades       | trades      |
| foo          | strategy    |

### Requirement: Trades view data loading

In the trades view the page SHALL query only the strategy signals (for the title data date) and the trade performance data; it SHALL NOT query factor IC, strategy analytics, consensus signals, consensus history, bare-K snapshots or fan-breakout signals. The title data date SHALL be the strategy signals date, falling back to the trade performance `asOf` date. The trades view SHALL render the panel even when no strategy signals are available. The strategy view SHALL NOT query the trade performance data.

#### Scenario: No strategy signals in trades view

- **WHEN** the strategy signals query returns no result and the trade performance data has `asOf` 2026-10-30
- **THEN** `/investment/strategy?view=trades` shows the panel and the title data date 2026-10-30 instead of the "尚無策略訊號資料" message
