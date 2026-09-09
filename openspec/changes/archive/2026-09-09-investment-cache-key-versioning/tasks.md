## 1. Add Version Suffix to Unversioned Cache Keys

- [x] 1.1 Update `src/app/actions/getSectorStrength.ts` so the `sector-strength` cache key (line 73) becomes `sector-strength-v1`, satisfying "Server Actions 使用 unstable_cache 包裝" version-suffix rule. Verify by grepping the file for `unstable_cache` and confirming the key string ends in `-v1`, and running `yarn test --testPathPatterns getSectorStrength` (or manual `yarn dev` load of `/investment/sectors`) to confirm no runtime error.
- [x] 1.2 Update `src/app/actions/getEtfSectorActivity.ts` so the `etf-sector-activity` key (line 158) becomes `etf-sector-activity-v1`. Verify by loading `/investment/sectors` in `yarn dev` and confirming the page renders without error.
- [x] 1.3 Update `src/app/actions/getFactorIC.ts` so the `factor-ic` key (line 38) becomes `factor-ic-v1`. Verify by grepping the file to confirm the new key string.
- [x] 1.4 Update `src/app/actions/getEtfFrontrunningEvents.ts` so the `etf-frontrunning-events` key (line 35) becomes `etf-frontrunning-events-v1`. Verify by loading `/investment/frontrunning` in `yarn dev`.
- [x] 1.5 Update `src/app/actions/getBuyingPatternStats.ts` so the `buying-pattern-stats` key (line 20) becomes `buying-pattern-stats-v1`. Verify by loading `/investment/buying-patterns` in `yarn dev`.
- [x] 1.6 Update `src/app/actions/getTreemapData.ts` so its treemap cache key (line 21) becomes version-suffixed (`-v1`). Verify by loading `/investment` (or wherever the treemap widget renders) in `yarn dev`.
- [x] 1.7 Update `src/app/actions/getStreaks.ts` so its streaks cache key (line 39) becomes version-suffixed (`-v1`). Verify by grepping the file to confirm the new key string.
- [x] 1.8 Update `src/app/actions/getWindowMomentum.ts` so the `window-momentum` key (lines 216-219) becomes `window-momentum-v1`. Verify by grepping the file to confirm the new key string.
- [x] 1.9 Update `src/app/actions/getAdlData.ts` so its ADL cache key becomes version-suffixed (`-v1`). Verify by loading `/investment/breadth` in `yarn dev`.
- [x] 1.10 Update `src/app/investment/history/page.tsx` so the `weight-history` (line 30) and `overlap-trend` (line 78) keys become `weight-history-v1` and `overlap-trend-v1`. Verify by loading `/investment/history` in `yarn dev` and confirming both charts render.
- [x] 1.11 Update `src/app/investment/consensus/page.tsx` so the `consensus` (line 110) and `divergence` (line 152) keys become `consensus-v1` and `divergence-v1`. Verify by loading `/investment/consensus` in `yarn dev` and confirming both sections render.

## 2. Regression Check

- [x] 2.1 Run `yarn tsc --noEmit` to confirm no type errors were introduced by the key string changes.
- [x] 2.2 Run `yarn test --testPathPatterns investment` to confirm existing investment-module tests still pass with the renamed cache keys.
