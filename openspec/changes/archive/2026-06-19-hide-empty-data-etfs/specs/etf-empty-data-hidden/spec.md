## ADDED Requirements

### Requirement: Active ETF derivation

The system SHALL provide a single helper that derives the set of "active" ETF codes — ETFs that currently have holdings data — from runtime data rather than a hardcoded list. An ETF SHALL be considered active when it has at least one holding row on its latest disclosure date (`holdingsCount > 0`, equivalently a non-null `dataDate` with non-empty holdings). The helper SHALL NOT remove any code from `ETF_REGISTRY` or `ETF_CODES`; those remain the registry single source of truth.

#### Scenario: ETF with holdings is active

- **WHEN** an ETF code has one or more rows in `etf_holdings_snapshot` on its latest disclosure date
- **THEN** the helper SHALL include that code in the active set

#### Scenario: ETF without holdings is inactive

- **WHEN** an ETF code (e.g. 00998A) has zero holding rows on any date
- **THEN** the helper SHALL exclude that code from the active set

#### Scenario: Scraper recovery auto-restores ETF

- **WHEN** a previously data-less ETF gains holdings rows after its scraper is fixed
- **THEN** the helper SHALL include it in the active set on the next render with no code change

### Requirement: Listing surfaces hide inactive ETFs

Every ETF listing and navigation surface in the investment module SHALL render only active ETFs. This applies to: the `/investment` "深潛明細" quick-link list, the `EtfOverviewGrid` cards, the `StockPickerHub` ETF source, and the `EtfSelector` drilldown switcher. An inactive ETF SHALL NOT appear as a card, quick link, or switcher button.

#### Scenario: Empty ETF absent from overview grid

- **WHEN** the `/investment` page renders with an inactive ETF in the registry
- **THEN** no overview card SHALL be rendered for that ETF

#### Scenario: Empty ETF absent from quick links

- **WHEN** the `/investment` page renders the "深潛明細" quick-link row
- **THEN** the inactive ETF SHALL NOT produce a quick-link entry

#### Scenario: Switcher skips empty ETF as next target

- **WHEN** a user views a drilldown page and the `EtfSelector` renders its switcher buttons
- **THEN** the switcher SHALL only render buttons for active ETFs, so navigating to the "next target" never lands on a data-less ETF

### Requirement: Registry and direct URL access preserved

Hiding inactive ETFs from listing surfaces SHALL NOT alter `ETF_REGISTRY`, `ETF_CODES`, pipeline scraping, or diff computation. A data-less ETF SHALL remain reachable by direct URL (`/investment/<code>`); only listing and navigation surfaces hide it.

#### Scenario: Direct URL still resolves

- **WHEN** a user navigates directly to `/investment/00998A` while 00998A is inactive
- **THEN** the drilldown route SHALL still resolve (not redirect away solely due to being inactive)

#### Scenario: Pipeline unaffected

- **WHEN** the ETF pipeline runs
- **THEN** it SHALL continue to attempt scraping for every code in `ETF_CODES`, unchanged by this filtering
