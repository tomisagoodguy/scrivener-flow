## ADDED Requirements

### Requirement: Tab switcher UI on consensus-signal page

The `/investment/consensus-signal` page SHALL render a `全市場 | 自選股` tab bar at the top of the content area.

The active tab SHALL be determined by the `tab` URL query parameter:
- `?tab=market` or absent → 全市場 tab active
- `?tab=watchlist` → 自選股 tab active

#### Scenario: Default tab is 全市場

- **WHEN** a user navigates to `/investment/consensus-signal` without a `tab` query parameter
- **THEN** the 全市場 tab SHALL be highlighted as active
- **THEN** `ConsensusSummaryCards` and `ConsensusTable` SHALL be rendered

#### Scenario: Switching to 自選股 tab

- **WHEN** a user clicks the 自選股 tab button
- **THEN** the browser URL SHALL update to `/investment/consensus-signal?tab=watchlist`
- **THEN** `AccumulationCycleCard`, `EtfFundCrossSignal`, and `FundHealthTable` SHALL be rendered
- **THEN** `ConsensusSummaryCards` and `ConsensusTable` SHALL NOT be rendered

#### Scenario: Switching to 全市場 tab

- **WHEN** a user clicks the 全市場 tab button
- **THEN** the browser URL SHALL update to `/investment/consensus-signal?tab=market`
- **THEN** `ConsensusSummaryCards` and `ConsensusTable` SHALL be rendered

### Requirement: Self-contained TabSwitcher client component

A `TabSwitcher` Client Component SHALL be created at `src/app/investment/consensus-signal/components/TabSwitcher.tsx`.

The component SHALL accept a `currentTab` prop of type `'market' | 'watchlist'` and SHALL use `useRouter` to push tab changes without full page reload.

The component SHALL NOT use `useSearchParams` (per project rule: `useSearchParams` must not appear in global layout components, and must be wrapped in `<Suspense>` if used in a page).

#### Scenario: TabSwitcher renders correct active state

- **WHEN** `currentTab` prop is `'market'`
- **THEN** the 全市場 button SHALL have the active visual style (highlighted)
- **THEN** the 自選股 button SHALL have the inactive visual style

- **WHEN** `currentTab` prop is `'watchlist'`
- **THEN** the 自選股 button SHALL have the active visual style
- **THEN** the 全市場 button SHALL have the inactive visual style

### Requirement: 自選股 tab empty state

When the user has no watch-list stocks, the 自選股 tab SHALL display a prompt directing the user to add stocks.

#### Scenario: Empty watch list on 自選股 tab

- **WHEN** a user navigates to `/investment/consensus-signal?tab=watchlist`
- **THEN** the page SHALL fetch the user's `watch_list` from Supabase
- **WHEN** the watch list is empty
- **THEN** the page SHALL display a message "您的觀察清單尚無股票" and a link to `/investment/bare-k`
- **THEN** `AccumulationCycleCard`, `EtfFundCrossSignal`, and `FundHealthTable` SHALL NOT be rendered

### Requirement: Page heading reflects active tab context

The page heading date indicator SHALL remain visible on both tabs.

#### Scenario: Date shown on both tabs

- **WHEN** the 全市場 tab is active
- **THEN** the data date SHALL be sourced from `getConsensusSignals()` result
- **WHEN** the 自選股 tab is active
- **THEN** the data date SHALL be sourced from `getFundMomentumSignals()` result
