## Why

盤點全專案 `unstable_cache` 使用位置後發現：部分 Server Actions 的 cache key 已採用版號慣例（例如 `sector-stocks-v2`、`strategy-signals-v3`、`strategy-analytics-v2`），但另一部分完全沒有版號（例如 `sector-strength`、`etf-frontrunning-events`、`weight-history`、`overlap-trend`、`consensus`、`divergence`、`buying-pattern-stats`、`window-momentum`）。CLAUDE.md 已記載「cache key 加版本號是最簡單可靠的手動 invalidation 方式」這一慣例，但目前只有部分函式遵守。

風險是：當這些函式底層查詢的資料表 schema 或聚合邏輯變更時，若忘記手動改 key，Next.js Data Cache 會在 1 小時 revalidate 週期內持續回傳依舊邏輯算出的 stale 結果，且因為 key 沒有版號可改，開發者甚至沒有「加版號讓舊 key 自然失效」這個退路可用，只能等待自然 revalidate 或手動清 cache。此為既有 `investment-server-cache` spec 已規範「SHALL 使用 unstable_cache 包裝」但未規範 key 命名慣例的缺口，本變更是對該 spec 新增一條 key 版號規範的 MODIFIED Requirement。

（註：此變更範圍已依實地盤點結果從原先設想的「修復 Vercel serverless 冷啟動快取失效」調整為「key 版號治理」——經確認 `unstable_cache` 底層為 Next.js Data Cache，本身不受 function 冷啟動影響，原假設的冷啟動 bug 不存在。）

## What Changes

- 對既有 `investment-server-cache` spec 新增一條規範：所有 `unstable_cache` 呼叫的 key 陣列第一個元素（識別字串）SHALL 帶版號後綴（`-vN`），初始版本可以是 `-v1`。
- 修改以下目前無版號的 cache key，補上 `-v1` 後綴：
  - `src/app/actions/getSectorStrength.ts:73` 的 `sector-strength`
  - `src/app/actions/getEtfSectorActivity.ts:158` 的 `etf-sector-activity`
  - `src/app/actions/getFactorIC.ts:38` 的 `factor-ic`
  - `src/app/actions/getEtfFrontrunningEvents.ts:35` 的 `etf-frontrunning-events`
  - `src/app/actions/getBuyingPatternStats.ts:20` 的 `buying-pattern-stats`
  - `src/app/actions/getTreemapData.ts:21` 的 treemap key
  - `src/app/actions/getStreaks.ts:39` 的 streaks key
  - `src/app/actions/getWindowMomentum.ts:216-219` 的 `window-momentum`
  - `src/app/investment/history/page.tsx:30,78` 的 `weight-history`、`overlap-trend`
  - `src/app/investment/consensus/page.tsx:110,152` 的 `consensus`、`divergence`
  - `src/app/actions/getAdlData.ts` 的 ADL key
- 已帶版號的 key（`sector-stocks-v2`、`strategy-signals-v3` 等）維持不變，不強制統一版號數字，只要求「有版號」這個格式規範。

## Non-Goals

- 不變更任何 `unstable_cache` 的 `revalidate` 秒數（維持既有 3600 秒）。
- 不引入新的快取層（例如 Supabase table cache 或 Redis）；本變更純粹是 key 命名慣例治理，`investment-server-cache` spec 已確認現行 `unstable_cache` 機制在 Vercel 上運作正常，不需要換掉。
- 不處理本次盤點中「module-level 直接呼叫 `unstable_cache`」（`getAdlData`、`getBuyingPatternStats`、`getTreemapData`、`getStreaks`、`getEtfFrontrunningEvents`）與「函式內動態建立」兩種寫法不一致的問題，此為另一個獨立的程式碼風格議題，不在本次版號治理範圍內。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `investment-server-cache`: 新增「所有 unstable_cache key SHALL 帶版號後綴」的規範，並列出目前需要補上版號的具體函式清單。

## Impact

- Affected specs: `investment-server-cache`（新增一條 MODIFIED Requirement）
- Affected code:
  - Modified: `src/app/actions/getSectorStrength.ts`
  - Modified: `src/app/actions/getEtfSectorActivity.ts`
  - Modified: `src/app/actions/getFactorIC.ts`
  - Modified: `src/app/actions/getEtfFrontrunningEvents.ts`
  - Modified: `src/app/actions/getBuyingPatternStats.ts`
  - Modified: `src/app/actions/getTreemapData.ts`
  - Modified: `src/app/actions/getStreaks.ts`
  - Modified: `src/app/actions/getWindowMomentum.ts`
  - Modified: `src/app/actions/getAdlData.ts`
  - Modified: `src/app/investment/history/page.tsx`
  - Modified: `src/app/investment/consensus/page.tsx`
