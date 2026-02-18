
// This file is now a facade for the refactored modular service.
// See src/services/revenueLab/index.ts for the implementation.

export { 
  fetchWinRateFromDB, 
  fetchHeatmapFromDB 
} from './revenueLab';
