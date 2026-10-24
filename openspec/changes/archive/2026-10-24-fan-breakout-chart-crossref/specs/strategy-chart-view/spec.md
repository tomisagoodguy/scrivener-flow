## ADDED Requirements

### Requirement: Chart view filter bar

The strategy chart view SHALL render a filter bar above the scroll chart viewer with two selects. The "策略" select SHALL offer "全部策略" plus one option per strategy that appears in the current chart stock list, labeled with the strategy's Chinese description and the number of stocks carrying it, formatted "<名稱>（N）". The "均線發散" select SHALL offer "全部", "首次" and "再次". Both filters SHALL be combined with AND. Filter state SHALL be held client-side and SHALL NOT be written to the URL.

#### Scenario: Filter by single strategy

- **WHEN** the user selects strategy "均線發散突破" in the "策略" select
- **THEN** only stocks whose strategy list contains `fan_breakout` are rendered in the viewer

#### Scenario: Filter by fan-breakout signal type

- **WHEN** the user selects "首次" in the "均線發散" select
- **THEN** only stocks that are fan-breakout candidates on the latest fan-breakout signal date with signal type "first" are rendered; stocks that are not fan-breakout candidates are excluded

##### Example: combined filters

| stock | strategies | fan signal type | strategy=all, fan=all | strategy=trend_template, fan=all | strategy=all, fan=first | strategy=trend_template, fan=first |
| ----- | ---------- | --------------- | --------------------- | -------------------------------- | ----------------------- | ---------------------------------- |
| 2330 | trend_template, fan_breakout | first | ✓ | ✓ | ✓ | ✓ |
| 2454 | fan_breakout | repeat | ✓ | ✗ | ✗ | ✗ |
| 3017 | trend_template | (none) | ✓ | ✓ | ✗ | ✗ |

#### Scenario: Strategy option counts

- **WHEN** the chart stock list has 3 stocks with `trend_template` and 2 with `fan_breakout`
- **THEN** the "策略" select shows options "全部策略", "<trend_template 名稱>（3）" and "均線發散突破（2）", and no option for strategies absent from the list

#### Scenario: Filter leaves no stock

- **WHEN** the selected filters match zero stocks
- **THEN** the view shows "沒有符合篩選條件的股票" and does not render the scroll chart viewer

#### Scenario: Filter change resets viewer position

- **WHEN** the user changes either filter
- **THEN** the scroll chart viewer remounts and starts at the first matching stock

### Requirement: Strategy tags show Chinese labels

Each chart in the strategy chart view SHALL display the strategy tags using the strategy description from the strategy signals result. When no description is available for a strategy ID, the tag SHALL fall back to the raw strategy ID.

#### Scenario: Known strategy id

- **WHEN** a stock carries strategy `fan_breakout` and the signals result describes it as "均線發散突破"
- **THEN** the chart tag reads "均線發散突破"

#### Scenario: Unknown strategy id

- **WHEN** a stock carries a strategy ID that has no description in the signals result
- **THEN** the chart tag shows the raw strategy ID

### Requirement: Fan-breakout context on chart view

For each stock that is a fan-breakout candidate on the latest fan-breakout signal date, the strategy chart view SHALL append "發散 +x.x%・首次|再次・連續 N 天" to the section header (omitting any part whose value is null) and SHALL draw an up-arrow marker below the K-line bar on each of the stock's recent signal dates that exists in the bare-K snapshot's OHLCV data. Stocks that are not fan-breakout candidates SHALL render exactly as before. When fan-breakout signals cannot be loaded, the chart view SHALL render all stocks without fan-breakout context and SHALL NOT show an error.

#### Scenario: Candidate shows header context and markers

- **WHEN** stock 2330 is a fan-breakout candidate on the latest fan-breakout date with spread 0.0871, signal type "repeat", consecutive days 4 and recent signal dates `[2026-10-17, 2026-10-22, 2026-10-23]`
- **THEN** its section header shows "發散 +8.7%・再次・連續 4 天" and its K-line panel shows markers on those three dates

#### Scenario: Marker date outside snapshot range

- **WHEN** a recent signal date is not present in the snapshot's OHLCV dates
- **THEN** no marker is drawn for that date and the other markers still render

#### Scenario: Fan-breakout signals unavailable

- **WHEN** loading fan-breakout signals returns an error
- **THEN** the chart view renders every stock with no fan-breakout header context and no markers, and no error message is displayed

### Requirement: Shared scroll viewer preserves bare-K watch page behavior

The scroll chart viewer used by the strategy chart view SHALL be the same component used by the bare-K watch page (`/investment/bare-k/[code]`). On the bare-K watch page, the viewer SHALL keep updating the browser URL to `/investment/bare-k/<code>` as the active section changes, keep the back link to `/investment/bare-k`, and keep showing navigation dots only when there are more than 3 stocks.

#### Scenario: Bare-K page URL sync

- **WHEN** the user scrolls the bare-K watch page so that stock 2454 becomes the active section
- **THEN** the browser URL becomes `/investment/bare-k/2454`

#### Scenario: Strategy chart view does not sync URL

- **WHEN** the active section changes in the strategy chart view
- **THEN** the browser URL stays `/investment/strategy?view=chart`

#### Scenario: Navigation dot threshold

- **WHEN** the viewer has exactly 3 stocks
- **THEN** no navigation dots are rendered; with 4 stocks, 4 dots are rendered
