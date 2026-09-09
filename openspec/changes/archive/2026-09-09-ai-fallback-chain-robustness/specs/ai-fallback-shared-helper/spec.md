## ADDED Requirements

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
