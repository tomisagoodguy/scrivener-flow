## Context

投資模組 Server Actions 和 lib 函式每次請求都直接查 Supabase，無任何快取。ETF 資料由 CI 每日 22:00（台灣時間）更新一次，快取 1 小時完全安全。Vercel Fluid Active CPU 月中已達 50%，預計月底超限。

## Goals / Non-Goals

**Goals:**
- 為所有全域性（非 user-specific）的 Server Actions 加入 `unstable_cache`，revalidate = 3600
- 為 `etfPageData.ts`、`equityPageData.ts` 的核心查詢加入 `unstable_cache`
- 為 investment 頁面加入 `export const revalidate = 3600`

**Non-Goals:**
- 不改動 user-specific 頁面（watch-list、bare-k）的快取策略
- 不改動 `revenueLabActions.ts`（已有 `unstable_cache`）
- 不引入 Redis 或外部快取層

## Decisions

**決策 1：使用 `unstable_cache` 而非 `fetch` cache**
- Next.js `unstable_cache` 適用於任意 async 函式（不限於 fetch），可包裝 Supabase 查詢
- 替代方案：`React.cache`（只在單次 request 內去重，不跨請求）→ 不適用
- `unstable_cache` 是目前 App Router 中包裝 DB 查詢的標準做法

**決策 2：revalidate = 3600（1 小時）**
- ETF 資料每日一次更新，1 小時已足夠新鮮
- 替代方案：86400（全天）→ 若 pipeline 失敗補跑，前端可能顯示過期資料，風險較高
- 1 小時是安全與即時性的平衡點

**決策 3：`getStrategySignals()` 保留 `force-dynamic` 頁面但加 action cache**
- 底層 Server Action 加 cache 後，`force-dynamic` 只影響 HTML 不被靜態化，不影響 DB 查詢次數
- 不需要移除 `force-dynamic`

**決策 4：consensus/history 頁面的直接 Supabase 查詢改包 `unstable_cache`**
- 直接在 page.tsx 做 `unstable_cache(() => supabase.from(...), [...], { revalidate: 3600 })`
- 避免為了 cache 額外建立 action 檔（最小變更）

## Risks / Trade-offs

- [Cache key 碰撞] `unstable_cache` 的 keyParts 需要足夠唯一，避免不同查詢使用相同 key → 每個函式使用獨立的 string key（如 `['adl-data']`、`['sector-strength']`）
- [Stale data] Pipeline 失敗時資料不更新，前端仍顯示舊快取 → 已知風險，1 小時 revalidate 可接受；pipeline 失敗時 LINE 會通知
- [User-specific data 誤 cache] watch-list/bare-k 包含 RLS 隔離的 user 資料，若誤加 cache 會讓不同 user 看到相同資料 → 本次明確排除這兩個頁面

## Migration Plan

1. 修改 Server Actions（8 個檔案）— 加 `unstable_cache` 包裝
2. 修改 `etfPageData.ts`、`equityPageData.ts`（2 個 lib 檔）
3. 修改 consensus/history page.tsx（2 個頁面）的直接查詢
4. 為 9 個 investment 頁面加 `export const revalidate = 3600`
5. `yarn build` 確認無型別錯誤

**Rollback**：移除 `unstable_cache` 包裝即可，無資料庫或 schema 變更。
