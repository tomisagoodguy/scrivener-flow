# Spec: ETF Disposal Badge (Frontend)

## Purpose

Surface disposal (分時交易) trading restriction warnings to users in the ETF holdings list and individual stock detail pages, using the `is_disposal` flag persisted by the pipeline.

---

## Requirements

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


<!-- @trace
source: etf-holdings-disposal-marker
updated: 2026-05-24
code:
  - src/app/investment/stock/[code]/page.tsx
  - ETF/pipeline/steps/disposal_detect_step.py
  - ETF/pipeline/steps/__init__.py
  - src/components/features/investment/HoldingRow.tsx
  - ETF/pipeline/orchestrator.py
  - src/types/investment.ts
  - supabase/migrations/20260524000000_add_disposal_flag.sql
  - src/app/investment/revenue-lab/page.tsx
  - tsconfig.tsbuildinfo
  - src/types/supabase.ts
tests:
  - src/__tests__/components/EtfBuyDonutChart.test.tsx
  - src/__tests__/hooks/useHoldingsFilter.test.ts
-->

---
### Requirement: Disposal warning on stock detail page

The individual stock detail page (`/investment/stock/[code]`) SHALL display a dismissible warning banner at the top of the page when the stock's most recent `etf_holdings_snapshot` entry has `is_disposal = TRUE`.

#### Scenario: User views disposal stock detail

- **WHEN** a user navigates to a stock detail page for a stock currently under disposal
- **THEN** a warning banner SHALL appear stating the stock is under disposal trading restrictions

#### Scenario: User views normal stock detail

- **WHEN** the stock has no active disposal record
- **THEN** no warning banner SHALL be displayed


<!-- @trace
source: etf-holdings-disposal-marker
updated: 2026-05-24
code:
  - src/app/investment/stock/[code]/page.tsx
  - ETF/pipeline/steps/disposal_detect_step.py
  - ETF/pipeline/steps/__init__.py
  - src/components/features/investment/HoldingRow.tsx
  - ETF/pipeline/orchestrator.py
  - src/types/investment.ts
  - supabase/migrations/20260524000000_add_disposal_flag.sql
  - src/app/investment/revenue-lab/page.tsx
  - tsconfig.tsbuildinfo
  - src/types/supabase.ts
tests:
  - src/__tests__/components/EtfBuyDonutChart.test.tsx
  - src/__tests__/hooks/useHoldingsFilter.test.ts
-->

---
### Requirement: TypeScript type includes is_disposal field

The `EtfHoldingSnapshot` TypeScript interface SHALL include an `is_disposal: boolean` field.

#### Scenario: Frontend type reflects database schema

- **WHEN** the frontend fetches `etf_holdings_snapshot` data
- **THEN** the `is_disposal` field SHALL be available and typed as `boolean` (not `boolean | undefined`)

<!-- @trace
source: etf-holdings-disposal-marker
updated: 2026-05-24
code:
  - src/app/investment/stock/[code]/page.tsx
  - ETF/pipeline/steps/disposal_detect_step.py
  - ETF/pipeline/steps/__init__.py
  - src/components/features/investment/HoldingRow.tsx
  - ETF/pipeline/orchestrator.py
  - src/types/investment.ts
  - supabase/migrations/20260524000000_add_disposal_flag.sql
  - src/app/investment/revenue-lab/page.tsx
  - tsconfig.tsbuildinfo
  - src/types/supabase.ts
tests:
  - src/__tests__/components/EtfBuyDonutChart.test.tsx
  - src/__tests__/hooks/useHoldingsFilter.test.ts
-->