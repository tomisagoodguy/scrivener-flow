## ADDED Requirements

### Requirement: Strategy signal page at /investment/strategy

The frontend SHALL expose a route `/investment/strategy` that displays today's selected stocks grouped by strategy. The page SHALL be a Next.js Server Component using the `server` Supabase client (RLS-gated, user-scoped).

#### Scenario: Page loads with today's signals

- **WHEN** an authenticated user navigates to `/investment/strategy`
- **THEN** the page displays each strategy as a card with its description and the list of stocks it selected today

#### Scenario: No signals for today

- **WHEN** the pipeline has not yet run for today's date
- **THEN** the page displays the most recent available date's signals and shows a label indicating the data date

### Requirement: Per-stock 00981A movement annotation

For each stock displayed in a strategy card, the page SHALL show one of four 00981A movement labels derived from `etf_holdings_snapshot` and `etf_diff_logs` (last 7 calendar days):

| Label | Condition |
|-------|-----------|
| `adding` | BUY or IN event in last 7 days with `diff_weight > 0` |
| `reducing` | SELL or OUT event in last 7 days with `diff_weight < 0` |
| `holding` | Present in `etf_holdings_snapshot` with no recent diff event |
| `none` | Not present in `etf_holdings_snapshot` |

#### Scenario: Stock with recent buy event

- **WHEN** stock 2330 has a BUY event in `etf_diff_logs` within the last 7 days with `diff_weight = 0.12`
- **THEN** the label shown next to 2330 is `adding`

#### Scenario: Stock not held by 00981A

- **WHEN** a stock selected by a strategy has no row in `etf_holdings_snapshot` for ETF 00981A
- **THEN** the label shown is `none`

### Requirement: getStrategySignals Server Action aggregates signals and ETF movement

The Server Action `getStrategySignals(date?: string)` SHALL:
1. Query `strategy_signals` for the given date (default: most recent date with data)
2. For each distinct stock_id, query `etf_holdings_snapshot` (00981A) and `etf_diff_logs` (last 7 days, 00981A)
3. Return a typed array grouped by `strategy_id`, each entry containing stock list with `movement` label

The action SHALL NOT return raw `etf_diff_logs` rows to the client — only the derived `movement` label.

#### Scenario: Server Action returns grouped structure

- **WHEN** `getStrategySignals()` is called
- **THEN** it returns `{ date: string, strategies: { id: string, description: string, stocks: { stock_id: string, score: number | null, movement: 'adding' | 'reducing' | 'holding' | 'none' }[] }[] }`

### Requirement: Monthly revenue condition data-freshness notice

The page SHALL display a notice stating: "營收條件以最新公告月份為準，月中換股前後數日可能存在滯後" to inform users that monthly revenue conditions reflect the most recently announced month and may lag mid-month.

#### Scenario: Notice always visible

- **WHEN** the strategy signal page is loaded at any time during the month
- **THEN** the data-freshness notice is visible without user interaction
