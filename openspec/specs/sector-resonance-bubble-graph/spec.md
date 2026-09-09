# sector-resonance-bubble-graph Specification

## Purpose

TBD - created by archiving change 'sector-resonance-bubble-graph'. Update Purpose after archive.

## Requirements

### Requirement: Sector resonance heat scores are derived from ETF sector activity

A function SHALL derive a `heatScore` for each sector category from `EtfSectorActivityMap`, computed from the number of distinct ETFs (`etf_codes.length`) and distinct stocks (`stock_codes.length`) active in that category. The output SHALL be a list of `{ category: string, heatScore: number, stockCount: number, etfCount: number }` entries, one per category present in the input map.

#### Scenario: Category with high ETF and stock overlap has higher heat score

- **WHEN** category A has 5 ETFs and 12 stocks, and category B has 2 ETFs and 3 stocks
- **THEN** category A's `heatScore` is greater than category B's `heatScore`

##### Example: heat score ordering

| Category | etf_codes | stock_codes | heatScore (relative) |
|----------|-----------|--------------|------------------------|
| AI 伺服器 | 6 | 18 | highest |
| 航運 | 3 | 7 | medium |
| 傳產 | 1 | 2 | lowest |

#### Scenario: Empty activity map produces empty result

- **WHEN** `EtfSectorActivityMap` has no categories
- **THEN** the function returns an empty list


<!-- @trace
source: sector-resonance-bubble-graph
updated: 2026-09-09
code:
  - src/app/actions/ai/optimizationAction.ts
  - src/lib/investment/etfPageData.ts
  - src/app/actions/getBuyingPatternStats.ts
  - src/app/actions/getWindowMomentum.ts
  - src/lib/ai/geminiFallback.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
  - src/app/actions/getEtfFrontrunningEvents.ts
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getStreaks.ts
  - src/lib/investment/holdingsUtils.ts
  - package.json
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/consensus/page.tsx
  - jest.config.js
  - src/app/actions/ai/briefingAction.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/getAdlData.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/investment/history/page.tsx
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/actions/getFactorIC.ts
  - src/app/actions/getSectorResonanceHeat.ts
tests:
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/__tests__/components/EtfHeader.test.tsx
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/lib/ai/__tests__/geminiFallback.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
-->

---
### Requirement: Bubble chart renders force-directed collision layout

`SectorResonanceBubbleChart` SHALL use `d3-force` to compute non-overlapping bubble positions for each category, where bubble radius is a monotonically increasing function of `heatScore`. The chart SHALL render as SVG.

#### Scenario: Bubbles do not overlap

- **WHEN** the chart renders N category bubbles with varying `heatScore` values
- **THEN** the force simulation converges to a layout where no two bubble circles overlap (collision radius respected)

#### Scenario: Higher heat score produces larger bubble

- **WHEN** category A has a higher `heatScore` than category B
- **THEN** category A's rendered bubble radius is greater than category B's


<!-- @trace
source: sector-resonance-bubble-graph
updated: 2026-09-09
code:
  - src/app/actions/ai/optimizationAction.ts
  - src/lib/investment/etfPageData.ts
  - src/app/actions/getBuyingPatternStats.ts
  - src/app/actions/getWindowMomentum.ts
  - src/lib/ai/geminiFallback.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
  - src/app/actions/getEtfFrontrunningEvents.ts
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getStreaks.ts
  - src/lib/investment/holdingsUtils.ts
  - package.json
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/consensus/page.tsx
  - jest.config.js
  - src/app/actions/ai/briefingAction.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/getAdlData.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/investment/history/page.tsx
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/actions/getFactorIC.ts
  - src/app/actions/getSectorResonanceHeat.ts
tests:
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/__tests__/components/EtfHeader.test.tsx
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/lib/ai/__tests__/geminiFallback.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
-->

---
### Requirement: Bubble color encodes heat quartile, not gain/loss

Bubble fill color SHALL be determined by which quartile of the heat score distribution the category falls into, using a warm-neutral color scale. Bubble color SHALL NOT use the `text-rose-*` / `text-emerald-*` (red-rise/green-fall) convention reserved for price gain/loss elsewhere in the investment module.

#### Scenario: Top-quartile category gets the most intense color

- **WHEN** a category's `heatScore` falls in the top quartile of all categories shown
- **THEN** its bubble uses the most intense step of the warm-neutral color scale

#### Scenario: Color scale is distinct from gain/loss colors

- **WHEN** the bubble chart is rendered anywhere in the investment module
- **THEN** no bubble uses `text-rose-*` or `text-emerald-*` classes or their equivalent hex values as its fill color


<!-- @trace
source: sector-resonance-bubble-graph
updated: 2026-09-09
code:
  - src/app/actions/ai/optimizationAction.ts
  - src/lib/investment/etfPageData.ts
  - src/app/actions/getBuyingPatternStats.ts
  - src/app/actions/getWindowMomentum.ts
  - src/lib/ai/geminiFallback.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
  - src/app/actions/getEtfFrontrunningEvents.ts
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getStreaks.ts
  - src/lib/investment/holdingsUtils.ts
  - package.json
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/consensus/page.tsx
  - jest.config.js
  - src/app/actions/ai/briefingAction.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/getAdlData.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/investment/history/page.tsx
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/actions/getFactorIC.ts
  - src/app/actions/getSectorResonanceHeat.ts
tests:
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/__tests__/components/EtfHeader.test.tsx
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/lib/ai/__tests__/geminiFallback.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
-->

---
### Requirement: Clicking a bubble shows category detail

`SectorResonanceBubbleChart` SHALL support clicking a bubble to reveal the category's `stock_codes` and `etf_codes` lists.

#### Scenario: Click reveals detail

- **WHEN** a user clicks a category bubble
- **THEN** the component displays that category's stock codes and ETF codes


<!-- @trace
source: sector-resonance-bubble-graph
updated: 2026-09-09
code:
  - src/app/actions/ai/optimizationAction.ts
  - src/lib/investment/etfPageData.ts
  - src/app/actions/getBuyingPatternStats.ts
  - src/app/actions/getWindowMomentum.ts
  - src/lib/ai/geminiFallback.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
  - src/app/actions/getEtfFrontrunningEvents.ts
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getStreaks.ts
  - src/lib/investment/holdingsUtils.ts
  - package.json
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/consensus/page.tsx
  - jest.config.js
  - src/app/actions/ai/briefingAction.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/getAdlData.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/investment/history/page.tsx
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/actions/getFactorIC.ts
  - src/app/actions/getSectorResonanceHeat.ts
tests:
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/__tests__/components/EtfHeader.test.tsx
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/lib/ai/__tests__/geminiFallback.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
-->

---
### Requirement: Bubble chart is an additional view mode on the sectors page

The `/investment/sectors` page SHALL offer the bubble chart as a selectable view mode alongside the existing treemap (`SectorTreemap`) and supply-chain graph (`SupplyChainGraph`), without removing either existing view.

#### Scenario: User switches to bubble view

- **WHEN** a user selects the bubble chart view mode on `/investment/sectors`
- **THEN** the treemap and supply-chain graph views remain available as alternate selectable modes

<!-- @trace
source: sector-resonance-bubble-graph
updated: 2026-09-09
code:
  - src/app/actions/ai/optimizationAction.ts
  - src/lib/investment/etfPageData.ts
  - src/app/actions/getBuyingPatternStats.ts
  - src/app/actions/getWindowMomentum.ts
  - src/lib/ai/geminiFallback.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
  - src/app/actions/getEtfFrontrunningEvents.ts
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getStreaks.ts
  - src/lib/investment/holdingsUtils.ts
  - package.json
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/consensus/page.tsx
  - jest.config.js
  - src/app/actions/ai/briefingAction.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/getAdlData.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/investment/history/page.tsx
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/actions/getFactorIC.ts
  - src/app/actions/getSectorResonanceHeat.ts
tests:
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/__tests__/components/EtfHeader.test.tsx
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/lib/ai/__tests__/geminiFallback.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
-->