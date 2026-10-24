## MODIFIED Requirements

### Requirement: Multi-strategy consensus panel display

The strategy page SHALL display a "多策略共選" panel above the strategy cards grid whenever `getStrategySignals()` returns at least two strategies. A stock is a consensus stock when the number of distinct strategies selecting it is greater than or equal to the active threshold (see "Consensus threshold switch"). In the default "latest" mode each strategy contributes the stocks of its own latest signal date (per-strategy latest date, consistent with `strategy-signal-freshness`); strategies are NOT required to share the same date.

Each entry in the panel SHALL show:
- Stock code and name
- Number of strategies that selected the stock (strategy count badge)
- Names of the strategies that selected the stock (strategy name badges)
- Industry/category tag
- ETF holder badges (max 3 visible, overflow as +N) — latest mode only
- Movement label (加碼中 / 減碼中 / 持倉中 / 未持有) based on 00981A diff logs — latest mode only

The panel SHALL be sorted by strategy count descending, then by stock code ascending.

When zero stocks satisfy the active threshold and mode, the panel SHALL still render its header and controls, and SHALL show the text "目前條件下無共選股" instead of the list. When `getStrategySignals()` returns fewer than two strategies, the panel SHALL NOT be rendered.

#### Scenario: Multiple strategies select the same stock on different dates

- **WHEN** stock 3055 is in `capital_layer` latest signals dated 2026-10-10 and in `fund_momentum` latest signals dated 2026-10-22
- **THEN** the panel shows 3055 with a "2 策略" badge and strategy name badges for both strategies

##### Example: sorting by count

| Stock | Strategy Count | Position in panel |
|-------|---------------|-------------------|
| 3055  | 3             | 1st               |
| 2464  | 2             | 2nd               |
| 4127  | 2             | 3rd (alphabetical after 2464) |

#### Scenario: Single qualifying stock

- **WHEN** exactly one stock is selected by two or more strategies
- **THEN** the panel is rendered and lists that one stock

#### Scenario: No cross-strategy stocks

- **WHEN** every strategy selects entirely distinct stock sets
- **THEN** the panel renders its header and controls with the text "目前條件下無共選股"

#### Scenario: Fewer than two strategies

- **WHEN** `getStrategySignals()` returns exactly one strategy
- **THEN** the panel is not rendered and the page layout is unchanged

#### Scenario: Panel only shown in strategy view

- **WHEN** the page is accessed with `view=monitor` or `view=chart`
- **THEN** the multi-strategy consensus panel SHALL NOT appear

### Requirement: Cross-strategy count computed server-side

In latest mode, the page server component SHALL compute the multi-strategy stock list from the existing `StrategySignalsResult` without issuing additional database queries or Server Actions.

The computation SHALL:
1. Iterate all `result.strategies[*].stocks` entries
2. Collect, per `stock_id`, the distinct strategy ids that selected it
3. Collect the `StrategyStock` data (name, industry, etfHolders, movement) from the first occurrence
4. Filter to stocks whose distinct strategy count is greater than or equal to the active threshold
5. Sort by count descending, then stock_id ascending

#### Scenario: Data reuse from existing fetch

- **WHEN** `getStrategySignals()` returns a result with strategies and the panel is in latest mode
- **THEN** the consensus list is derived from that result with no additional Supabase queries

#### Scenario: Threshold applied to count

- **WHEN** the active threshold is 3
- **THEN** a stock selected by exactly 2 strategies is excluded and a stock selected by 3 strategies is included

## ADDED Requirements

### Requirement: Consensus threshold switch

The panel SHALL offer threshold options ≥2, ≥3 and ≥4 as links that set the URL search parameter `cmin` to `2`, `3` or `4` while preserving the other consensus parameters (`cview`, `cwin`). The default threshold SHALL be 2. Any missing or unrecognized `cmin` value SHALL be treated as 2. The active option SHALL be visually highlighted.

#### Scenario: Raising the threshold

- **WHEN** the user clicks "≥3" on `/investment/strategy`
- **THEN** the URL becomes `/investment/strategy?cmin=3` and only stocks with count ≥ 3 are listed

#### Scenario: Invalid threshold value

- **WHEN** the page is opened with `?cmin=9`
- **THEN** the panel behaves as threshold 2 and highlights "≥2"

### Requirement: Per-strategy data date exposure

`StrategyEntry` SHALL carry a `date` field (ISO `YYYY-MM-DD`) holding the signal date used for that strategy. In latest mode the panel SHALL display, beneath its header, each participating strategy's name with its data date. A strategy whose date is older than the top-level `StrategySignalsResult.date` SHALL have its date rendered in a muted style (`text-gray-400`) so stale monthly strategies are distinguishable. The `getStrategySignals` cache key version SHALL be incremented so cached results without `date` are not served.

#### Scenario: Monthly strategy lagging behind

- **WHEN** `low_vol_alpha` has latest date 2026-10-10 and the top-level date is 2026-10-22
- **THEN** the panel shows "低波動 Alpha 年增率選股 10/10" with the date muted, and the 2026-10-22 strategies' dates in normal style

#### Scenario: Explicit date query

- **WHEN** `getStrategySignals('2026-10-22')` is called
- **THEN** every returned `StrategyEntry.date` equals `2026-10-22`
