## Why

投資模組的 11 個 Server Actions 和 12 個頁面完全無快取，每次訪問都直接打 Supabase。ETF 資料每日 22:00 才更新一次，但伺服器每次請求都重新查詢，造成 Vercel Fluid Active CPU 使用率在月中已達 50%（4 小時中的 2 小時）。

## What Changes

- 為 11 個 Server Actions 加入 `unstable_cache` 包裝（revalidate = 3600 秒）
- 為 `etfPageData.ts` 和 `equityPageData.ts` 的核心查詢函式加入 `unstable_cache`
- 為 12 個 investment 頁面加入 `export const revalidate = 3600`（user-specific 頁面除外）
- `/investment/strategy` 已有 `force-dynamic`，保留不動（底層 action 加 cache 即可）

## Capabilities

### New Capabilities
- `investment-server-cache`: Server Actions 與 lib 函式的 unstable_cache 包裝，統一 revalidate 策略

### Modified Capabilities
（無 spec-level 行為變更，只有實作細節）

## Impact

**受影響的檔案：**
- `src/app/actions/` 下所有 8 個 action 檔
- `src/lib/investment/etfPageData.ts`
- `src/lib/investment/equityPageData.ts`
- `src/app/investment/` 下所有 page.tsx（除 watch-list、bare-k 的 user-specific 頁面）
- `src/app/investment/consensus/page.tsx`（直接 Supabase 查詢移至 cached function）
- `src/app/investment/history/page.tsx`（同上）

**不受影響：**
- `src/app/investment/watch-list/page.tsx`（user-specific，RLS 隔離）
- `src/app/investment/bare-k/page.tsx`（user-specific）
- `src/app/investment/bare-k/[code]/page.tsx`（user-specific）
