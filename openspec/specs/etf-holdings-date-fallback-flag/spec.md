# etf-holdings-date-fallback-flag Specification

## Purpose

TBD - created by archiving change 'etf-holdings-date-fallback'. Update Purpose after archive.

## Requirements

### Requirement: getHoldingsForEtf returns explicit fallback flag

`getHoldingsForEtf()` SHALL return an `isFallback: boolean` field alongside `holdings` and `dataDate`. The field SHALL be `true` when the selected `data_date` is not the most recent candidate date available for that ETF code, and SHALL be `false` when the most recent candidate date is used.

#### Scenario: Latest date has sufficient price coverage

- **WHEN** `getHoldingsForEtf(etfCode)` is called and the most recent candidate `data_date` has a valid price ratio greater than 0.5
- **THEN** the function returns `holdings` for that date with `isFallback: false`

#### Scenario: Latest date has insufficient price coverage, falls back to prior date

- **WHEN** the most recent candidate `data_date` has a valid price ratio of 0.5 or less
- **AND** a prior candidate `data_date` exists with sufficient price coverage
- **THEN** the function returns `holdings` for the prior date with `isFallback: true`

##### Example: two candidate dates, latest is stale

- **GIVEN** candidate dates `2026-07-10` (valid price ratio 0.3) and `2026-07-09` (valid price ratio 0.9)
- **WHEN** `getHoldingsForEtf('00981A')` is called
- **THEN** the function returns holdings for `2026-07-09` with `dataDate: '2026-07-09'` and `isFallback: true`

#### Scenario: No candidate dates exist

- **WHEN** no `data_date` rows exist for the ETF code
- **THEN** the function returns `{ holdings: [], dataDate: null, isFallback: false }`


<!-- @trace
source: etf-holdings-date-fallback
updated: 2026-09-09
code:
  - src/lib/investment/etfPageData.ts
  - src/app/actions/getEtfFrontrunningEvents.ts
  - package.json
  - src/lib/investment/holdingsUtils.ts
  - src/app/actions/ai/optimizationAction.ts
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getAdlData.ts
  - src/app/actions/getSectorResonanceHeat.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/app/actions/ai/briefingAction.ts
  - src/app/actions/getStreaks.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getBuyingPatternStats.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/consensus/page.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/actions/getFactorIC.ts
  - jest.config.js
  - src/lib/ai/geminiFallback.ts
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/actions/getWindowMomentum.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
tests:
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
  - src/__tests__/components/EtfHeader.test.tsx
  - src/lib/ai/__tests__/geminiFallback.test.ts
-->

---
### Requirement: Shared date-fallback selection helper

The candidate-date selection logic (fetch recent candidate dates, evaluate price coverage against the 0.5 threshold, select the first sufficiently-covered date) SHALL be implemented as a single shared helper function used by `getHoldingsForEtf()`, rather than duplicated inline logic.

#### Scenario: Helper is reused

- **WHEN** `getHoldingsForEtf()` needs to select a usable data date
- **THEN** it SHALL call the shared helper rather than re-implementing the candidate-scan loop


<!-- @trace
source: etf-holdings-date-fallback
updated: 2026-09-09
code:
  - src/lib/investment/etfPageData.ts
  - src/app/actions/getEtfFrontrunningEvents.ts
  - package.json
  - src/lib/investment/holdingsUtils.ts
  - src/app/actions/ai/optimizationAction.ts
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getAdlData.ts
  - src/app/actions/getSectorResonanceHeat.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/app/actions/ai/briefingAction.ts
  - src/app/actions/getStreaks.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getBuyingPatternStats.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/consensus/page.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/actions/getFactorIC.ts
  - jest.config.js
  - src/lib/ai/geminiFallback.ts
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/actions/getWindowMomentum.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
tests:
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
  - src/__tests__/components/EtfHeader.test.tsx
  - src/lib/ai/__tests__/geminiFallback.test.ts
-->

---
### Requirement: ETF holdings page displays fallback notice

The ETF holdings page SHALL display a distinct notice when `isFallback` is `true`, separate from the existing staleness-day indicator defined in `etf-data-freshness-indicator`. The notice SHALL communicate that the system automatically switched to an earlier trading date due to insufficient data on the latest date.

#### Scenario: Fallback notice shown alongside fresh-looking date

- **WHEN** `isFallback` is `true` and the resulting `dataDate` is within 2 trading days of today (so the staleness indicator would otherwise show neutral style)
- **THEN** the page SHALL still show the fallback notice, independent of the staleness indicator's neutral/warning state

#### Scenario: No fallback notice when isFallback is false

- **WHEN** `isFallback` is `false`
- **THEN** the page SHALL NOT display the fallback notice

<!-- @trace
source: etf-holdings-date-fallback
updated: 2026-09-09
code:
  - src/lib/investment/etfPageData.ts
  - src/app/actions/getEtfFrontrunningEvents.ts
  - package.json
  - src/lib/investment/holdingsUtils.ts
  - src/app/actions/ai/optimizationAction.ts
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getAdlData.ts
  - src/app/actions/getSectorResonanceHeat.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/app/actions/ai/briefingAction.ts
  - src/app/actions/getStreaks.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getBuyingPatternStats.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/consensus/page.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/actions/getFactorIC.ts
  - jest.config.js
  - src/lib/ai/geminiFallback.ts
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/actions/getWindowMomentum.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
tests:
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
  - src/__tests__/components/EtfHeader.test.tsx
  - src/lib/ai/__tests__/geminiFallback.test.ts
-->