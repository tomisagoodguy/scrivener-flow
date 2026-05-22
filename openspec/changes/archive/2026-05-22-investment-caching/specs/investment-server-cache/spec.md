## ADDED Requirements

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

### Requirement: etfPageData 核心函式快取
`getHoldings()` 和 `getDiffLogs()` 以及 `equityPageData.ts` 的 `fetchRankingData()` SHALL 使用 `unstable_cache` 包裝。

#### Scenario: ETF 持股頁快取
- **WHEN** 使用者訪問 `/investment/[etf]`（例如 00981A）
- **THEN** 持股資料在 1 小時內只查詢 Supabase 一次

### Requirement: Investment 頁面 revalidate 設定
所有非 user-specific 的 investment 頁面 SHALL 加入 `export const revalidate = 3600`。

#### Scenario: 頁面靜態快取
- **WHEN** 任意使用者訪問 `/investment`、`/investment/[etf]`、`/investment/breadth`、`/investment/buying-patterns`、`/investment/consensus`、`/investment/equity`、`/investment/frontrunning`、`/investment/history`、`/investment/sectors`
- **THEN** Next.js 在 1 小時內只重新生成頁面 HTML 一次

### Requirement: User-specific 頁面不加快取
`/investment/watch-list`、`/investment/bare-k`、`/investment/bare-k/[code]` SHALL NOT 加入 `unstable_cache` 或 `revalidate`，保持每次請求從 DB 取得最新的 user-specific 資料。

#### Scenario: 自選股即時更新
- **WHEN** 使用者新增或刪除自選股
- **THEN** `/investment/watch-list` 頁面立即反映最新資料，不受 cache 影響
