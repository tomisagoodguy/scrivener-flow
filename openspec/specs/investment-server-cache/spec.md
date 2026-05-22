# Spec: Investment Server Cache

## Purpose

定義投資模組中 Next.js Server Actions 與頁面的快取策略。透過 `unstable_cache` 包裝全域性市場資料查詢，以及在非 user-specific 投資頁面加入 `revalidate = 3600`，降低 Supabase 查詢負擔並提升頁面回應速度。

---

## Requirements

### Requirement: Server Actions 使用 unstable_cache 包裝
所有查詢全域性市場資料的 Server Actions SHALL 使用 Next.js `unstable_cache` 包裝，revalidate 設為 3600 秒。

#### Scenario: getAdlData 快取
- **WHEN** 任意使用者訪問 `/investment/breadth` 或 `/investment/sectors`
- **THEN** `getAdlData()` 在 1 小時內只查詢 Supabase 一次，後續請求從 cache 讀取

#### Scenario: getBuyingPatternStats 快取
- **WHEN** 任意使用者訪問 `/investment/buying-patterns`
- **THEN** `getBuyingPatternStats()` 在 1 小時內只查詢 Supabase 一次

#### Scenario: 其他 6 個 Server Actions 快取
- **WHEN** `getEtfFrontrunningEvents`、`getEtfSectorActivity`、`getFactorIC`、`getSectorStrength`（5 個函式）、`getStrategySignals`、`getTreemapData` 被呼叫
- **THEN** 每個函式在 1 小時內只查詢 Supabase 一次


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