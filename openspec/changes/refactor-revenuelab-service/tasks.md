# Tasks: Refactor Revenue Lab Service

## Phase 0: Setup

- [x] Create `src/repositories/` directory if it doesn't exist <!-- id: setup-repo-dir -->
- [x] Create `src/services/revenueLab/calculators/` directory <!-- id: setup-calc-dir -->
- [x] Create `src/services/revenueLab/index.ts` placeholder <!-- id: setup-index -->
- [x] Ensure `src/types/revenuelab.ts` is up to date and imported correctly <!-- id: check-types -->

## Phase 1: Repositories (Data Access)

- [x] Implement `src/repositories/stockRepo.ts`: `fetchStockNames(codes)` <!-- id: stock-repo -->
- [x] Implement `src/repositories/priceRepo.ts`: `fetchPriceData(period)` <!-- id: price-repo -->
- [x] Implement `src/repositories/revenueRepo.ts`: `fetchRevenueData(period, filters)` <!-- id: revenue-repo -->

## Phase 2: Domain Logic Calculators

- [x] Implement `src/services/revenueLab/calculators/winRateCalculator.ts`: `calculateWinRateBuckets(...)` <!-- id: winrate-calc -->
- [x] Implement `src/services/revenueLab/calculators/heatmapCalculator.ts`: `calculateHeatmapCells(...)` <!-- id: heatmap-calc -->

## Phase 3: Integration

- [x] Modify `src/services/revenueLabService.ts` (or replace with `index.ts` content) to use Repositories and Calculators <!-- id: integrate-winrate -->
- [x] Ensure `fetchWinRateFromDB` uses new architecture <!-- id: refactor-winrate-service -->
- [x] Ensure `fetchHeatmapFromDB` uses new architecture <!-- id: refactor-heatmap-service -->

## Phase 4: Verification

- [x] Verify `getWinRateData` action returns correct data <!-- id: verify-winrate -->
- [x] Verify `getHeatmapData` action returns correct data <!-- id: verify-heatmap -->
- [x] Check for type errors (`yarn tsc --noEmit`) <!-- id: type-check --> ✓ 零錯誤（2026-04-13）
