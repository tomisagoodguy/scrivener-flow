# Tasks: Refactor Revenue Lab Service

## Phase 0: Setup

- [ ] Create `src/repositories/` directory if it doesn't exist <!-- id: setup-repo-dir -->
- [ ] Create `src/services/revenueLab/calculators/` directory <!-- id: setup-calc-dir -->
- [ ] Create `src/services/revenueLab/index.ts` placeholder <!-- id: setup-index -->
- [ ] Ensure `src/types/revenuelab.ts` is up to date and imported correctly <!-- id: check-types -->

## Phase 1: Repositories (Data Access)

- [ ] Implement `src/repositories/stockRepo.ts`: `fetchStockNames(codes)` <!-- id: stock-repo -->
- [ ] Implement `src/repositories/priceRepo.ts`: `fetchPriceData(period)` <!-- id: price-repo -->
- [ ] Implement `src/repositories/revenueRepo.ts`: `fetchRevenueData(period, filters)` <!-- id: revenue-repo -->

## Phase 2: Domain Logic Calculators

- [ ] Implement `src/services/revenueLab/calculators/winRateCalculator.ts`: `calculateWinRateBuckets(...)` <!-- id: winrate-calc -->
- [ ] Implement `src/services/revenueLab/calculators/heatmapCalculator.ts`: `calculateHeatmapCells(...)` <!-- id: heatmap-calc -->

## Phase 3: Integration

- [ ] Modify `src/services/revenueLabService.ts` (or replace with `index.ts` content) to use Repositories and Calculators <!-- id: integrate-winrate -->
- [ ] Ensure `fetchWinRateFromDB` uses new architecture <!-- id: refactor-winrate-service -->
- [ ] Ensure `fetchHeatmapFromDB` uses new architecture <!-- id: refactor-heatmap-service -->

## Phase 4: Verification

- [ ] Verify `getWinRateData` action returns correct data <!-- id: verify-winrate -->
- [ ] Verify `getHeatmapData` action returns correct data <!-- id: verify-heatmap -->
- [ ] Check for type errors (`yarn tsc --noEmit`) <!-- id: type-check -->
