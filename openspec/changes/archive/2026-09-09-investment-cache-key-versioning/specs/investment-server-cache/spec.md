## MODIFIED Requirements

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
