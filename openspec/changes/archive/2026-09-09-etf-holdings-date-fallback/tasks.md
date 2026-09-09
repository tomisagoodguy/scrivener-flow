## 1. Shared Date-Fallback Selection Helper

- [x] 1.1 Extract the candidate-date scan + 0.5 price-coverage threshold logic in `getHoldingsForEtf()` (`src/lib/investment/holdingsUtils.ts`) into a single shared helper function that returns `{ dataDate: string | null, isFallback: boolean }`. Verify via `yarn test --testPathPatterns holdingsUtils` covering: latest date sufficient (isFallback false), latest date insufficient with a valid prior date (isFallback true), and no candidate dates (dataDate null, isFallback false).

## 2. getHoldingsForEtf Return Contract

- [x] 2.1 Update `getHoldingsForEtf()` to include `isFallback: boolean` in its return object, satisfying "getHoldingsForEtf returns explicit fallback flag" and "Shared date-fallback selection helper". Verify with a unit test asserting the field is present and correctly set in both fallback and non-fallback cases (`src/lib/investment/__tests__/holdingsUtils.test.ts` or existing test file).
- [x] 2.2 Propagate `isFallback` through `src/lib/investment/etfPageData.ts` wherever it wraps `getHoldingsForEtf()`, so the value reaches the page-level data object without being dropped. Verify by reading the composed return type and confirming `isFallback` is a top-level field consumed by the page component.

## 3. ETF Holdings Page Fallback Notice

- [x] 3.1 In `src/components/features/investment/EtfHeader.tsx`, render a distinct fallback notice (e.g. "資料已自動回退至最近可用交易日") when `isFallback` is `true`, positioned separately from the existing staleness-day indicator from `etf-data-freshness-indicator`, satisfying "ETF holdings page displays fallback notice". Verify via `src/__tests__/components/EtfHeader.test.tsx`: one test asserting the notice renders when `isFallback` is true regardless of staleness color, and one asserting it does not render when `isFallback` is false.
- [x] 3.2 Wire `isFallback` from `src/app/investment/[etf]/page.tsx` into `EtfHeader` as a prop. Verify by running `yarn dev` and manually confirming the notice appears only for an ETF whose latest snapshot has sparse pricing (or by temporarily forcing `isFallback: true` in a local test render).

## 4. Regression Check

- [x] 4.1 Confirm `getStrategySignals()` and its `strategy-signal-freshness` behavior are unmodified by this change. Verify via `yarn test --testPathPatterns getStrategySignals` passing unchanged.
- [x] 4.2 Run `yarn tsc --noEmit` to confirm the new `isFallback` field does not break existing TypeScript consumers of `getHoldingsForEtf()`'s return type.
