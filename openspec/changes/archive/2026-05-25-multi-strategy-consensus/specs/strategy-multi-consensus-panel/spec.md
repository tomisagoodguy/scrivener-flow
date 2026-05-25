## ADDED Requirements

### Requirement: Multi-strategy consensus panel display

The strategy page SHALL display a "多策略共選" panel above the strategy cards grid when at least one stock appears in two or more strategies on the same date.

Each entry in the panel SHALL show:
- Stock code and name
- Number of strategies that selected the stock (strategy count badge)
- Industry/category tag
- ETF holder badges (max 3 visible, overflow as +N)
- Movement label (加碼中 / 減碼中 / 持倉中 / 未持有) based on 00981A diff logs

The panel SHALL be sorted by strategy count descending, then by stock code ascending.

The panel SHALL be hidden entirely when no stock qualifies (zero items).

#### Scenario: Multiple strategies select the same stock

- **WHEN** stock 3055 appears in both `capital_layer` and `low_vol_alpha` strategies on the same date
- **THEN** the panel shows 3055 with a "2 策略" badge and is placed above the strategy cards

##### Example: sorting by count

| Stock | Strategy Count | Position in panel |
|-------|---------------|-------------------|
| 3055  | 3             | 1st               |
| 2464  | 2             | 2nd               |
| 4127  | 2             | 3rd (alphabetical after 2464) |

#### Scenario: No cross-strategy stocks

- **WHEN** every strategy selects entirely distinct stock sets
- **THEN** the panel is not rendered and the page layout is unchanged

#### Scenario: Panel only shown in strategy view

- **WHEN** the page is accessed with `view=monitor` or `view=chart`
- **THEN** the multi-strategy consensus panel SHALL NOT appear

### Requirement: Cross-strategy count computed server-side

The page server component SHALL compute the multi-strategy stock list from the existing `StrategySignalsResult` without issuing additional database queries or Server Actions.

The computation SHALL:
1. Iterate all `result.strategies[*].stocks` entries
2. Count occurrences of each `stock_id` across strategies
3. Collect the `StrategyStock` data (name, industry, etfHolders, movement) from the first occurrence
4. Filter to stocks with count ≥ 2
5. Sort by count descending, then stock_id ascending

#### Scenario: Data reuse from existing fetch

- **WHEN** `getStrategySignals()` returns a result with strategies
- **THEN** the consensus list is derived from that result with no additional Supabase queries
