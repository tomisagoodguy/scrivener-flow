## ADDED Requirements

### Requirement: Disposal badge in ETF holdings list

The ETF holdings list page (`/investment/[etf]`) SHALL display a red "處置中" badge next to the stock name for any holding where `is_disposal = TRUE`.

The badge SHALL be visually distinct (red background or red border) to alert the user without requiring them to click into the stock.

#### Scenario: Disposal stock appears in holdings list

- **WHEN** a user views the ETF holdings page
- **AND** one or more holdings have `is_disposal = TRUE`
- **THEN** those stocks SHALL show a red "處置中" badge inline with their name

#### Scenario: Normal stock shows no badge

- **WHEN** a holding has `is_disposal = FALSE` or `NULL`
- **THEN** no disposal badge SHALL be rendered for that row

### Requirement: Disposal warning on stock detail page

The individual stock detail page (`/investment/stock/[code]`) SHALL display a dismissible warning banner at the top of the page when the stock's most recent `etf_holdings_snapshot` entry has `is_disposal = TRUE`.

#### Scenario: User views disposal stock detail

- **WHEN** a user navigates to a stock detail page for a stock currently under disposal
- **THEN** a warning banner SHALL appear stating the stock is under disposal trading restrictions

#### Scenario: User views normal stock detail

- **WHEN** the stock has no active disposal record
- **THEN** no warning banner SHALL be displayed

### Requirement: TypeScript type includes is_disposal field

The `EtfHoldingSnapshot` TypeScript interface SHALL include an `is_disposal: boolean` field.

#### Scenario: Frontend type reflects database schema

- **WHEN** the frontend fetches `etf_holdings_snapshot` data
- **THEN** the `is_disposal` field SHALL be available and typed as `boolean` (not `boolean | undefined`)
