## 1. Dependencies

- [x] 1.1 Run `yarn add d3-force` and `yarn add -D @types/d3-force` so the force-simulation library is available for bubble layout computation. Verify by confirming `d3-force` and `@types/d3-force` appear in `package.json` and `yarn.lock`, and `yarn tsc --noEmit` passes with no missing-type errors.

## 2. Heat Score Derivation

- [x] 2.1 Create `src/lib/investment/sectorResonanceUtils.ts` exporting a pure function that transforms `EtfSectorActivityMap` into a list of `{ category, heatScore, stockCount, etfCount }`, satisfying "Sector resonance heat scores are derived from ETF sector activity". Verify with a unit test (`src/lib/investment/__tests__/sectorResonanceUtils.test.ts`) asserting heat score ordering matches the relative ETF/stock count example (higher counts produce higher heatScore) and that an empty map returns an empty list.
- [x] 2.2 Expose the heat score list from a server action — either extend `src/app/actions/getEtfSectorActivity.ts` to also return heat scores, or add `src/app/actions/getSectorResonanceHeat.ts` calling the new util on top of the existing `EtfSectorActivityMap` fetch. Verify by calling the action in a test or via `yarn dev` and confirming the returned shape matches `{ category, heatScore, stockCount, etfCount }[]`.

## 3. Bubble Chart Component

- [x] 3.1 Create `src/components/features/investment/SectorResonanceBubbleChart.tsx` that runs a `d3-force` simulation (using `forceSimulation`, `forceCollide`, `forceCenter` or equivalent) on the heat score list to compute non-overlapping bubble positions, satisfying "Bubble chart renders force-directed collision layout". Verify with a component test or manual `yarn dev` check confirming no two rendered `<circle>` elements visually overlap for a sample dataset of 8+ categories with varying heat scores.
- [x] 3.2 Map bubble radius to `heatScore` (monotonically increasing) and bubble fill color to heat quartile using a warm-neutral color scale distinct from `text-rose-*`/`text-emerald-*`, satisfying "Higher heat score produces larger bubble" and "Bubble color encodes heat quartile, not gain/loss". Verify by grepping the new component file for `rose` and `emerald` and confirming zero matches, plus a manual visual check in `yarn dev` that the top-quartile category renders visibly larger and more intensely colored than the bottom-quartile category.
- [x] 3.3 Add click handling on each bubble to reveal that category's `stock_codes` and `etf_codes`, satisfying "Clicking a bubble shows category detail". Verify manually in `yarn dev` by clicking a bubble and confirming the stock/ETF list appears.

## 4. Page Integration

- [x] 4.1 Add a view-mode switcher to `src/app/investment/sectors/SectorDashboard.tsx` (or `GroupedSectorView.tsx`) that lets the user select between the existing treemap, the existing supply-chain graph, and the new bubble chart, satisfying "Bubble chart is an additional view mode on the sectors page". Verify manually in `yarn dev` by switching between all three modes on `/investment/sectors` and confirming each renders correctly and the treemap/supply-chain views are unchanged.

## 5. Regression Check

- [x] 5.1 Run `yarn tsc --noEmit` and `yarn test --testPathPatterns sector` to confirm no regressions in existing sector-page tests after integrating the new view mode.
