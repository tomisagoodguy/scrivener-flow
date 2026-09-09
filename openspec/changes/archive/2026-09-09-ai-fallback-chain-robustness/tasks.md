## 1. Shared Fallback Helper

- [x] 1.1 Create `src/lib/ai/geminiFallback.ts` exporting `callGeminiWithFallback()` that iterates `MODELS_TO_TRY` from `geminiConfig.ts`, calling each model in order and returning the first successful response, satisfying "Shared Gemini fallback function replaces duplicated loops". Verify with a new unit test (`src/lib/ai/__tests__/geminiFallback.test.ts`) covering: first model succeeds, first fails then second succeeds, all fail.
- [x] 1.2 Add rate-limit vs generic error classification inside `callGeminiWithFallback()`, satisfying "Fallback chain differentiates rate-limit errors from other errors". Verify with unit tests asserting the thrown error (when all models fail) indicates rate-limit exhaustion when the last failure was HTTP 429, and indicates a generic model error otherwise.

## 2. Migrate Existing Actions

- [x] 2.1 Refactor `src/app/actions/ai/briefingAction.ts` to call `callGeminiWithFallback()` and remove its own `for (const modelName of MODELS_TO_TRY)` loop, satisfying "briefingAction delegates to shared helper". Verify by running `yarn tsc --noEmit` and manually triggering the briefing feature in `yarn dev` to confirm it still returns a response.
- [x] 2.2 Refactor `src/app/actions/ai/optimizationAction.ts` to call `callGeminiWithFallback()` for all four optimization types (grammar/expand/summarize/structure) and remove its own loop, satisfying "optimizationAction delegates to shared helper". Verify by running `yarn tsc --noEmit` and manually testing each of the four types in `yarn dev`.
- [x] 2.3 Refactor `src/app/actions/ai/generateInvestmentPromptAction.ts` to call `callGeminiWithFallback()` and remove its own loop (including its `lastError` tracking, now handled by the shared helper), satisfying "generateInvestmentPromptAction delegates to shared helper". Verify by running `yarn tsc --noEmit` and manually testing investment prompt generation in `yarn dev`.
- [x] 2.4 Confirm all three existing AI actions use the shared helper by grepping `src/app/actions/ai/` for `for (const modelName of MODELS_TO_TRY)` and verifying zero matches remain, satisfying "Existing AI actions use the shared helper".

## 3. Documentation and Regression

- [x] 3.1 Update `.claude/rules/ai.md` to document `callGeminiWithFallback()` as the single entry point for the fallback chain and describe the rate-limit vs generic error classification, so future AI features are added via the shared helper per the existing "新增 AI 功能時，必須在 geminiConfig.ts 統一設定" rule. Verify by reading the updated file and confirming it references the new helper location.
- [x] 3.2 Run `yarn test --testPathPatterns ai` and `yarn tsc --noEmit` to confirm no regressions across the three migrated actions.
