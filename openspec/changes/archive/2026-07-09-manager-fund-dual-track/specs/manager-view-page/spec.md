## ADDED Requirements

### Requirement: Manager dual-track page

The system SHALL provide a Server Component page at `/investment/manager` that lists all managers from `fund_manager_map` (valid_to IS NULL) as cards. Selecting a manager SHALL display four panels: (a) the manager's ETF latest Top 20 holdings from `etf_holdings_snapshot`, (b) the manager's funds' latest monthly Top 10 from `fund_holdings_monthly`, (c) a dual-track gap table listing stocks present on one track but absent on the other, and (d) the manager's related `fund_signals` for the most recent 3 periods. Data access SHALL go through a Server Action `getManagerDualTrack(manager)` using the server Supabase client, with its return type exported from the action file.

#### Scenario: Manager with both tracks

- **WHEN** a user opens the panel for a manager who has both an ETF and at least one fund mapped
- **THEN** all four panels render, and the gap table marks each stock as fund-only or etf-only

#### Scenario: Manager with fund data not yet synced

- **WHEN** a manager's funds have no rows in `fund_holdings_monthly` for the latest month
- **THEN** the fund panel shows an explicit empty state naming the missing month instead of rendering blank

### Requirement: Signal caliber disclosure

The page SHALL visually distinguish and label the two signal calibers: ETF-only signals from `etf_signals` as daily-frequency approximations, and fund signals from `fund_signals` as monthly-frequency true dual-track signals. Taiwan market color convention MUST be followed (rose for increases, emerald for decreases).

#### Scenario: Labels visible

- **WHEN** the manager panel shows any signal badge
- **THEN** the badge carries a caliber label (日頻近似 or 月頻雙軌) so the two families cannot be confused
