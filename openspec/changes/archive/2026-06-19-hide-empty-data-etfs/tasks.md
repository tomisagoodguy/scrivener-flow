## 1. Active ETF helper

Implements Requirement: Active ETF derivation.

- [x] [P] 1.1 (Requirement: Active ETF derivation) Create `src/lib/investment/activeEtfs.ts` exporting `getActiveEtfCodes(): Promise<string[]>`. It SHALL query `etf_holdings_snapshot` via the server Supabase client for distinct `etf_code` values within `ETF_CODES` that have at least one row, and return that subset of `ETF_CODES` (preserving registry order). Add a doc comment stating this is the single definition of "active ETF" (has ≥1 holding row, equivalent to overview `holdingsCount > 0`), and that `ETF_REGISTRY` / `ETF_CODES` remain unchanged. Verify: a code with no snapshot rows (e.g. 00998A) is absent from the returned array; a code with rows is present.

## 2. Listing surfaces filter (parallel after helper)

Implements Requirement: Listing surfaces hide inactive ETFs.

- [x] [P] 2.1 (Requirement: Listing surfaces hide inactive ETFs) In `src/components/features/investment/EtfOverviewGrid.tsx`, drop cards for ETFs with no data by filtering `stats` to entries where `holdingsCount > 0` before `sortOverviewStats`. Verify: an ETF stat with `holdingsCount === 0` / `dataDate === null` renders no `EtfOverviewCard`; active ETFs still render and ordering is unchanged.

- [x] [P] 2.2 (Requirement: Listing surfaces hide inactive ETFs) In `src/components/features/investment/EtfSelector.tsx`, add optional prop `activeCodes?: string[]`. In drilldown mode, render switcher buttons only for `ETF_REGISTRY` entries whose `code` is in `activeCodes` when the prop is provided; when the prop is omitted, render all entries (unchanged behavior). Verify: passing `activeCodes` without 00998A removes its button; omitting the prop renders every registry button.

- [x] 2.3 (Requirement: Listing surfaces hide inactive ETFs) In `src/app/investment/page.tsx`, call `getActiveEtfCodes()` inside the existing `Promise.all`, build a `Set<string>` of active codes, and use it to (a) filter the "深潛明細" quick-link list (`ETF_REGISTRY.filter(e => activeCodes.has(e.code))`) and (b) filter `etfsForPicker` passed to `StockPickerHub` to active ETFs only. The `EtfOverviewGrid` already self-filters per task 2.1, so pass `overviewStats` unchanged. Verify: with 00998A inactive, no 00998A quick link is rendered and it is absent from `StockPickerHub`.

- [x] 2.4 (Requirement: Listing surfaces hide inactive ETFs) In `src/app/investment/[etf]/page.tsx`, call `getActiveEtfCodes()` (add to the existing `Promise.all` or fetch alongside `getHoldings`) and pass the result to `<EtfSelector currentEtf={etfCode} activeCodes={...} />`. Verify: on a drilldown page the switcher no longer offers 00998A (or any data-less ETF) as a navigation target.

## 3. Verification

Implements Requirement: Registry and direct URL access preserved.

- [x] 3.1 (Requirement: Registry and direct URL access preserved) Run `yarn lint` and `yarn build`; confirm no type or lint errors introduced and that `ETF_REGISTRY` / `ETF_CODES` and pipeline code are untouched. Manually confirm `/investment` shows no empty ETF cards/quick links, the drilldown switcher skips data-less ETFs, and direct navigation to `/investment/00998A` still resolves (route not redirected away solely for being inactive).
