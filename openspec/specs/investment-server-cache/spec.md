# Spec: Investment Server Cache

## Purpose

定義投資模組中 Next.js Server Actions 與頁面的快取策略。透過 `unstable_cache` 包裝全域性市場資料查詢，以及在非 user-specific 投資頁面加入 `revalidate = 3600`，降低 Supabase 查詢負擔並提升頁面回應速度。

---

## Requirements

### Requirement: Server Actions 使用 unstable_cache 包裝
所有查詢全域性市場資料的 Server Actions SHALL 使用 Next.js `unstable_cache` 包裝，revalidate 設為 3600 秒。每個 `unstable_cache` 呼叫的 key 陣列第一個元素（識別字串）SHALL 帶版號後綴（格式為 `-vN`，N 為正整數，初始版本為 `-v1`），使未來邏輯變更時可透過遞增版號手動使舊 cache 失效。

#### Scenario: getAdlData 快取
- **WHEN** 任意使用者訪問 `/investment/breadth` 或 `/investment/sectors`
- **THEN** `getAdlData()` 在 1 小時內只查詢 Supabase 一次，後續請求從 cache 讀取，且其 cache key 帶版號後綴

#### Scenario: getBuyingPatternStats 快取
- **WHEN** 任意使用者訪問 `/investment/buying-patterns`
- **THEN** `getBuyingPatternStats()` 在 1 小時內只查詢 Supabase 一次，且其 cache key 帶版號後綴

#### Scenario: 其他 Server Actions 快取皆帶版號
- **WHEN** `getEtfFrontrunningEvents`、`getEtfSectorActivity`、`getFactorIC`、`getSectorStrength`（5 個函式）、`getStrategySignals`、`getTreemapData`、`getStreaks`、`getWindowMomentum` 被呼叫
- **THEN** 每個函式在 1 小時內只查詢 Supabase 一次，且其 `unstable_cache` key 陣列第一個元素帶 `-vN` 版號後綴

##### Example: 版號後綴格式

| 函式 | 修改前 key | 修改後 key |
|------|-----------|-----------|
| `getSectorStrength` (主查詢) | `sector-strength` | `sector-strength-v1` |
| `getEtfFrontrunningEvents` | `etf-frontrunning-events` | `etf-frontrunning-events-v1` |
| `getFactorIC` | `factor-ic` | `factor-ic-v1` |
| `getWindowMomentum` | `window-momentum` | `window-momentum-v1` |
| `getSectorStrength`（已帶版號的子查詢） | `sector-stocks-v2` | `sector-stocks-v2`（不變，已符合規範） |


<!-- @trace
source: investment-cache-key-versioning
updated: 2026-09-09
code:
  - src/app/investment/history/page.tsx
  - src/lib/investment/sectorResonanceLayout.ts
  - src/app/actions/ai/generateInvestmentPromptAction.ts
  - src/components/features/investment/SectorResonanceBubbleChart.tsx
  - src/app/actions/ai/optimizationAction.ts
  - src/app/actions/getFactorIC.ts
  - src/lib/investment/holdingsUtils.ts
  - jest.config.js
  - src/app/actions/getSectorResonanceHeat.ts
  - src/app/investment/consensus/page.tsx
  - src/lib/investment/sectorResonanceUtils.ts
  - src/app/actions/getSectorStrength.ts
  - src/app/actions/getStreaks.ts
  - package.json
  - src/app/actions/getBuyingPatternStats.ts
  - src/app/actions/getEtfFrontrunningEvents.ts
  - src/lib/investment/etfPageData.ts
  - src/app/actions/getWindowMomentum.ts
  - src/app/actions/getAdlData.ts
  - src/components/features/investment/EtfHeader.tsx
  - src/app/actions/getEtfSectorActivity.ts
  - src/lib/ai/geminiFallback.ts
  - src/app/investment/sectors/SectorDashboard.tsx
  - src/app/actions/ai/briefingAction.ts
  - src/app/investment/[etf]/page.tsx
tests:
  - src/lib/investment/__tests__/sectorResonanceLayout.test.ts
  - src/__tests__/components/EtfHeader.test.tsx
  - src/lib/ai/__tests__/geminiFallback.test.ts
  - src/lib/investment/__tests__/etfPageData.test.ts
  - src/lib/investment/__tests__/holdingsUtils.test.ts
  - src/lib/investment/__tests__/sectorResonanceUtils.test.ts
  - src/app/actions/__tests__/getSectorResonanceHeat.test.ts
  - src/components/features/investment/__tests__/SectorResonanceBubbleChart.test.tsx
-->

---
### Requirement: etfPageData 核心函式快取
`getHoldings()` 和 `getDiffLogs()` 以及 `equityPageData.ts` 的 `fetchRankingData()` SHALL 使用 `unstable_cache` 包裝。

#### Scenario: ETF 持股頁快取
- **WHEN** 使用者訪問 `/investment/[etf]`（例如 00981A）
- **THEN** 持股資料在 1 小時內只查詢 Supabase 一次


<!-- @trace
source: investment-caching
updated: 2026-05-22
code:
  - src/app/actions/getTreemapData.ts
  - src/app/investment/[etf]/page.tsx
  - src/app/actions/getBuyingPatternStats.ts
  - ETF/strategies/broker_ranked.py
  - ETF/pipeline/steps/sector_strength_step.py
  - src/app/investment/consensus/page.tsx
  - ETF/services/indicators.py
  - src/app/investment/equity/page.tsx
  - src/app/investment/frontrunning/page.tsx
  - src/app/investment/sectors/page.tsx
  - ETF/sync_adl_history.py
  - src/app/actions/getStrategySignals.ts
  - src/lib/investment/etfPageData.ts
  - src/lib/supabase/service.ts
  - ETF/backfill_market_breadth.py
  - src/app/actions/getSectorStrength.ts
  - src/app/actions/getFactorIC.ts
  - src/app/investment/history/page.tsx
  - src/app/investment/page.tsx
  - ETF/services/finlab/facade.py
  - src/app/actions/getAdlData.ts
  - src/lib/investment/equityPageData.ts
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/breadth/page.tsx
  - src/app/investment/buying-patterns/page.tsx
  - ETF/services/finlab/price_service.py
  - src/app/actions/getEtfFrontrunningEvents.ts
-->

---
### Requirement: Investment 頁面 revalidate 設定
所有非 user-specific 的 investment 頁面 SHALL 加入 `export const revalidate = 3600`。

#### Scenario: 頁面靜態快取
- **WHEN** 任意使用者訪問 `/investment`、`/investment/[etf]`、`/investment/breadth`、`/investment/buying-patterns`、`/investment/consensus`、`/investment/equity`、`/investment/frontrunning`、`/investment/history`、`/investment/sectors`
- **THEN** Next.js 在 1 小時內只重新生成頁面 HTML 一次


<!-- @trace
source: investment-caching
updated: 2026-05-22
code:
  - src/app/actions/getTreemapData.ts
  - src/app/investment/[etf]/page.tsx
  - src/app/actions/getBuyingPatternStats.ts
  - ETF/strategies/broker_ranked.py
  - ETF/pipeline/steps/sector_strength_step.py
  - src/app/investment/consensus/page.tsx
  - ETF/services/indicators.py
  - src/app/investment/equity/page.tsx
  - src/app/investment/frontrunning/page.tsx
  - src/app/investment/sectors/page.tsx
  - ETF/sync_adl_history.py
  - src/app/actions/getStrategySignals.ts
  - src/lib/investment/etfPageData.ts
  - src/lib/supabase/service.ts
  - ETF/backfill_market_breadth.py
  - src/app/actions/getSectorStrength.ts
  - src/app/actions/getFactorIC.ts
  - src/app/investment/history/page.tsx
  - src/app/investment/page.tsx
  - ETF/services/finlab/facade.py
  - src/app/actions/getAdlData.ts
  - src/lib/investment/equityPageData.ts
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/breadth/page.tsx
  - src/app/investment/buying-patterns/page.tsx
  - ETF/services/finlab/price_service.py
  - src/app/actions/getEtfFrontrunningEvents.ts
-->

---
### Requirement: User-specific 頁面不加快取
`/investment/watch-list`、`/investment/bare-k`、`/investment/bare-k/[code]` SHALL NOT 加入 `unstable_cache` 或 `revalidate`，保持每次請求從 DB 取得最新的 user-specific 資料。

#### Scenario: 自選股即時更新
- **WHEN** 使用者新增或刪除自選股
- **THEN** `/investment/watch-list` 頁面立即反映最新資料，不受 cache 影響

<!-- @trace
source: investment-caching
updated: 2026-05-22
code:
  - src/app/actions/getTreemapData.ts
  - src/app/investment/[etf]/page.tsx
  - src/app/actions/getBuyingPatternStats.ts
  - ETF/strategies/broker_ranked.py
  - ETF/pipeline/steps/sector_strength_step.py
  - src/app/investment/consensus/page.tsx
  - ETF/services/indicators.py
  - src/app/investment/equity/page.tsx
  - src/app/investment/frontrunning/page.tsx
  - src/app/investment/sectors/page.tsx
  - ETF/sync_adl_history.py
  - src/app/actions/getStrategySignals.ts
  - src/lib/investment/etfPageData.ts
  - src/lib/supabase/service.ts
  - ETF/backfill_market_breadth.py
  - src/app/actions/getSectorStrength.ts
  - src/app/actions/getFactorIC.ts
  - src/app/investment/history/page.tsx
  - src/app/investment/page.tsx
  - ETF/services/finlab/facade.py
  - src/app/actions/getAdlData.ts
  - src/lib/investment/equityPageData.ts
  - src/app/actions/getEtfSectorActivity.ts
  - src/app/investment/breadth/page.tsx
  - src/app/investment/buying-patterns/page.tsx
  - ETF/services/finlab/price_service.py
  - src/app/actions/getEtfFrontrunningEvents.ts
-->