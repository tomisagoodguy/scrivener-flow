# ai-fallback-shared-helper Specification

## Purpose

TBD - created by archiving change 'ai-fallback-chain-robustness'. Update Purpose after archive.

## Requirements

### Requirement: Shared Gemini fallback function replaces duplicated loops

A single shared function `callGeminiWithFallback()` SHALL implement the model fallback chain (iterating `MODELS_TO_TRY` in order, stopping at the first successful response). `briefingAction.ts`, `optimizationAction.ts`, and `generateInvestmentPromptAction.ts` SHALL each call this shared function instead of implementing their own iteration loop.

#### Scenario: First model succeeds

- **WHEN** `callGeminiWithFallback()` is called and the first model in `MODELS_TO_TRY` returns a successful response
- **THEN** the function returns that response without attempting subsequent models

#### Scenario: First model fails, second succeeds

- **WHEN** the first model throws an exception
- **AND** the second model in `MODELS_TO_TRY` returns a successful response
- **THEN** the function returns the second model's response and does not attempt remaining models

#### Scenario: All models fail

- **WHEN** every model in `MODELS_TO_TRY` throws an exception
- **THEN** the function throws an error whose message reflects the error type of the last attempted model (see "Fallback chain differentiates rate-limit errors from other errors")


<!-- @trace
source: ai-fallback-chain-robustness
updated: 2026-09-09
code:
  - src/app/investment/consensus/page.tsx
  - src/app/actions/ai/optimizationAction.ts
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getStreaks.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/actions/getSectorResonanceHeat.ts
  - src/app/actions/getWindowMomentum.ts
  - jest.config.js
  - src/app/actions/getBuyingPatternStats.ts
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getFactorIC.ts
  - src/app/actions/ai/briefingAction.ts
  - package.json
  - src/app/actions/getEtfFrontrunningEvents.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
  - src/app/actions/getAdlData.ts
  - src/app/investment/[etf]/page.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/lib/ai/geminiFallback.ts
  - src/lib/investment/etfPageData.ts
  - src/lib/investment/holdingsUtils.ts
  - src/app/actions/getEtfSectorActivity.ts
tests:
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/lib/ai/__tests__/geminiFallback.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/__tests__/components/EtfHeader.test.tsx
-->

---
### Requirement: Fallback chain differentiates rate-limit errors from other errors

When a model call fails, `callGeminiWithFallback()` SHALL classify the failure as either a rate-limit error (HTTP status 429, or an error message containing a rate-limit indicator) or a generic model error. Each classified failure SHALL be recorded with its classification before proceeding to the next model. If all models fail, the thrown error SHALL indicate whether the last failure was a rate-limit error or a generic model error.

#### Scenario: Rate-limit error is classified distinctly

- **WHEN** a model call fails with HTTP status 429
- **THEN** the failure is recorded as a rate-limit error, and the chain proceeds to the next model

#### Scenario: Non-rate-limit error is classified distinctly

- **WHEN** a model call fails with any error that is not a 429 status
- **THEN** the failure is recorded as a generic model error, and the chain proceeds to the next model

##### Example: final error reflects last failure type

| Scenario | Last model's failure | Thrown error indicates |
|----------|----------------------|-------------------------|
| All 9 models rate-limited | 429 | rate-limit exhaustion |
| Last model has invalid model name, others rate-limited | generic error (e.g. 404 invalid model) | generic model error |


<!-- @trace
source: ai-fallback-chain-robustness
updated: 2026-09-09
code:
  - src/app/investment/consensus/page.tsx
  - src/app/actions/ai/optimizationAction.ts
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getStreaks.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/actions/getSectorResonanceHeat.ts
  - src/app/actions/getWindowMomentum.ts
  - jest.config.js
  - src/app/actions/getBuyingPatternStats.ts
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getFactorIC.ts
  - src/app/actions/ai/briefingAction.ts
  - package.json
  - src/app/actions/getEtfFrontrunningEvents.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
  - src/app/actions/getAdlData.ts
  - src/app/investment/[etf]/page.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/lib/ai/geminiFallback.ts
  - src/lib/investment/etfPageData.ts
  - src/lib/investment/holdingsUtils.ts
  - src/app/actions/getEtfSectorActivity.ts
tests:
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/lib/ai/__tests__/geminiFallback.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/__tests__/components/EtfHeader.test.tsx
-->

---
### Requirement: Existing AI actions use the shared helper

`briefingAction.ts`, `optimizationAction.ts`, and `generateInvestmentPromptAction.ts` SHALL NOT contain their own `for (const modelName of MODELS_TO_TRY)` loop; each SHALL delegate to `callGeminiWithFallback()`.

#### Scenario: briefingAction delegates to shared helper

- **WHEN** `briefingAction.ts` needs to call Gemini
- **THEN** it calls `callGeminiWithFallback()` rather than iterating `MODELS_TO_TRY` itself

#### Scenario: optimizationAction delegates to shared helper

- **WHEN** `optimizationAction.ts` needs to call Gemini for any of its four optimization types (grammar/expand/summarize/structure)
- **THEN** it calls `callGeminiWithFallback()` rather than iterating `MODELS_TO_TRY` itself

#### Scenario: generateInvestmentPromptAction delegates to shared helper

- **WHEN** `generateInvestmentPromptAction.ts` needs to call Gemini
- **THEN** it calls `callGeminiWithFallback()` rather than iterating `MODELS_TO_TRY` itself

<!-- @trace
source: ai-fallback-chain-robustness
updated: 2026-09-09
code:
  - src/app/investment/consensus/page.tsx
  - src/app/actions/ai/optimizationAction.ts
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/investment/history/page.tsx
  - src/app/actions/getStreaks.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/actions/getSectorResonanceHeat.ts
  - src/app/actions/getWindowMomentum.ts
  - jest.config.js
  - src/app/actions/getBuyingPatternStats.ts
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/getFactorIC.ts
  - src/app/actions/ai/briefingAction.ts
  - package.json
  - src/app/actions/getEtfFrontrunningEvents.ts
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
  - src/app/actions/getAdlData.ts
  - src/app/investment/[etf]/page.tsx
  - src/app/actions/getSectorStrength.ts
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/lib/ai/geminiFallback.ts
  - src/lib/investment/etfPageData.ts
  - src/lib/investment/holdingsUtils.ts
  - src/app/actions/getEtfSectorActivity.ts
tests:
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/lib/ai/__tests__/geminiFallback.test.ts
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/__tests__/components/EtfHeader.test.tsx
-->