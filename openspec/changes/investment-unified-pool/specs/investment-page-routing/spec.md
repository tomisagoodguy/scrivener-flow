# Spec: investment-page-routing

## MODIFIED Requirements

### Requirement: Investment root redirects to pool page
`/investment` SHALL render the unified pool view directly as a Server Component. It SHALL NOT redirect to any ETF-specific URL.

#### Scenario: Root navigation
- **WHEN** user navigates to `/investment`
- **THEN** the pool page SHALL render immediately (no redirect)

#### Scenario: Legacy query param compatibility
- **WHEN** user navigates to `/investment?etf=00981A`
- **THEN** the page SHALL ignore the `etf` param and render the full pool view
- **THEN** the URL SHALL NOT change (no redirect, param is silently ignored)

### Requirement: ETF segment routes to drilldown page
`/investment/[etf]` SHALL render the ETF-specific drilldown page for valid codes, and redirect to `/investment` for invalid codes.

#### Scenario: Valid ETF drilldown
- **WHEN** user navigates to `/investment/00980A`
- **THEN** the drilldown page for 00980A SHALL render

#### Scenario: Invalid ETF code redirect
- **WHEN** user navigates to `/investment/INVALID`
- **THEN** the page SHALL redirect to `/investment`
