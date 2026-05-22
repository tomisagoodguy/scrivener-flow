## 1. Server Actions — unstable_cache 包裝

- [x] 1.1 `src/app/actions/getAdlData.ts` — 加 `unstable_cache`，key: `['adl-data']`，revalidate: 3600
- [x] 1.2 `src/app/actions/getBuyingPatternStats.ts` — 加 `unstable_cache`，key: `['buying-pattern-stats']`，revalidate: 3600
- [x] 1.3 `src/app/actions/getEtfFrontrunningEvents.ts` — 加 `unstable_cache`，key: `['etf-frontrunning-events']`，revalidate: 3600
- [x] 1.4 `src/app/actions/getEtfSectorActivity.ts` — 加 `unstable_cache`，key: `['etf-sector-activity']`，revalidate: 3600
- [x] 1.5 `src/app/actions/getFactorIC.ts` — 加 `unstable_cache`，key: `['factor-ic']`，revalidate: 3600
- [x] 1.6 `src/app/actions/getSectorStrength.ts` — 5 個 exported 函式各加 `unstable_cache`，key 各自唯一，revalidate: 3600
- [x] 1.7 `src/app/actions/getStrategySignals.ts` — 加 `unstable_cache`，key: `['strategy-signals']`，revalidate: 3600
- [x] 1.8 `src/app/actions/getTreemapData.ts` — 加 `unstable_cache`，key: `['treemap-data']`，revalidate: 3600

## 2. Lib 函式 — unstable_cache 包裝

- [x] 2.1 `src/lib/investment/etfPageData.ts` — `getHoldings()` 加 `unstable_cache`，key 含 etf code 參數，revalidate: 3600
- [x] 2.2 `src/lib/investment/etfPageData.ts` — `getDiffLogs()` 加 `unstable_cache`，key 含 etf code，revalidate: 3600
- [x] 2.3 `src/lib/investment/equityPageData.ts` — `fetchRankingData()` 加 `unstable_cache`，key: `['equity-ranking']`，revalidate: 3600

## 3. 頁面直接查詢 — 移入 cached 函式

- [x] 3.1 `src/app/investment/consensus/page.tsx` — 將直接 Supabase 查詢包入 `unstable_cache`，revalidate: 3600
- [x] 3.2 `src/app/investment/history/page.tsx` — 將直接 Supabase 查詢包入 `unstable_cache`，revalidate: 3600

## 4. 頁面 revalidate 設定

- [x] 4.1 `src/app/investment/page.tsx` — 加 `export const revalidate = 3600`
- [x] 4.2 `src/app/investment/[etf]/page.tsx` — 加 `export const revalidate = 3600`
- [x] 4.3 `src/app/investment/breadth/page.tsx` — 加 `export const revalidate = 3600`
- [x] 4.4 `src/app/investment/buying-patterns/page.tsx` — 加 `export const revalidate = 3600`
- [x] 4.5 `src/app/investment/consensus/page.tsx` — 加 `export const revalidate = 3600`
- [x] 4.6 `src/app/investment/equity/page.tsx` — 加 `export const revalidate = 3600`
- [x] 4.7 `src/app/investment/frontrunning/page.tsx` — 加 `export const revalidate = 3600`
- [x] 4.8 `src/app/investment/history/page.tsx` — 加 `export const revalidate = 3600`
- [x] 4.9 `src/app/investment/sectors/page.tsx` — 加 `export const revalidate = 3600`

## 5. 驗證

- [x] 5.1 `yarn build` 確認無 TypeScript / build 錯誤
