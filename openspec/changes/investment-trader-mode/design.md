## Context

目前 `/investment/*` 的所有頁面都被 `AuthGateProvider` 的 passphrase gate 擋住，且共用代書系統的 `SideNav`（顯示「案件管理」、「代償資料」等選項）。視覺上是代書系統風格，不適合投資朋友使用或操盤情境。

Supabase `service.ts` 使用 anon key，服務端說明「公開資料表不需要 service role key」，表示 ETF 相關資料表（`etf_holdings_snapshot`、`etf_diff_logs` 等）RLS 政策允許 anon 讀取。

## Goals / Non-Goals

**Goals:**
- `/investment/*` 任何人拿到 URL 即可訪問（無 passphrase，無登入需求）
- investment 區域完全隱藏 SideNav，main 全寬無左 padding
- 整個 investment 區域套用深色 trader 終端機主題
- Header 在 investment 頁也隱藏（沉浸模式）

**Non-Goals:**
- 不做用戶專屬投資組合功能（那需要 auth）
- 不改 `/investment/*` 以外的任何頁面
- 不引入新的認證機制或 magic link

## Decisions

### 1. Public access：AuthGate 加白名單

在 `AuthGateProvider` 的 `isPublicRoute` 判斷加入 `pathname.startsWith('/investment')`。

> 替代方案：在 Next.js middleware 層攔截 → 更複雜，且 AuthGate 本身就是 client-side gate，修改它最直接。

### 2. Supabase 查詢：改用 `getServiceClient()`

investment `page.tsx` 及子頁目前用 `createClient()` from server（依賴 cookie session）。無 session 時會 fallback 到 anon 但可能有 cookie 讀取錯誤。改為直接呼叫 `getServiceClient()`（已是 anon key，無 cookie 依賴），更乾淨。

> 替代方案：用 SUPABASE_SERVICE_ROLE_KEY bypass RLS → 過度授權，ETF 資料是公開讀取不需要。

### 3. SideNav 隱藏：pathname check + return null

`SideNav` 加 `usePathname()`，當 `pathname.startsWith('/investment')` 時 `return null`。

### 4. Main 全寬：MainWrapper 客戶端元件

Root `layout.tsx` 的 `<main lg:pl-[108px]>` 目前是靜態 class，server component 無法讀 pathname。
→ 抽出 `MainWrapper` client component，讀 pathname 後動態決定是否加 `lg:pl-[108px]`。

### 5. Header 隱藏：HeaderWrapper client component

同上，Header 也在 root layout 內，用同樣方式包裝，investment 頁不渲染 Header。

### 6. Trader 主題：investment/layout.tsx

新增 `src/app/investment/layout.tsx`，提供：
- 全螢幕深黑底色 `bg-[#070b14]`
- 覆蓋 root layout 的裝飾背景（pointer-events-none 的 blob）
- 提供 CSS variables：`--trader-green: #00ff88`、`--trader-cyan: #00d4ff`
- 套用 `font-mono` 給數字區域

## Risks / Trade-offs

- [風險] ETF 資料表若 RLS 未允許 anon read → 查詢回空值  
  → 緩解：本地測試確認 `getServiceClient()` 能讀到資料
- [風險] investment 子頁（bare-k、stock/[code] 等）各自有 `createClient`，需逐一替換  
  → 緩解：grep 全部 import，tasks 逐頁處理
