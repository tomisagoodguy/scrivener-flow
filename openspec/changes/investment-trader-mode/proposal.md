## Why

投資監控功能已成熟，需要獨立給投資朋友（非代書）使用，並提供沉浸式操盤介面。目前所有頁面都被代書系統的 passphrase gate 擋住，且側欄混雜代書導覽項目，視覺上不像交易終端機。

## What Changes

- `/investment/*` 所有路由設為 **public**（跳過 passphrase gate），任何人拿到網址即可訪問，無需輸入密語
- `/investment/*` 進入「沉浸模式」：`SideNav` 完全隱藏，`main` 的 left padding 歸零，內容全寬展開
- 整個 investment 區域套用**操盤終端機風格**：深黑底色、霓虹色 accent、monospace 數字字體、資料密集排版
- 新增 `src/app/investment/layout.tsx` 作為 investment 專屬 layout，提供深色 trader 主題容器
- investment 頁面的 Supabase 查詢改用 service role client（bypass RLS），確保無 session 時資料仍可正常讀取

## Capabilities

### New Capabilities
- `investment-public-access`: `/investment/*` 移出 AuthGate 保護範圍，任何人可訪問；Supabase 查詢用 service client
- `investment-immersive-layout`: SideNav 在 investment 路由完全隱藏；main 全寬；investment layout.tsx 提供 trader 主題

### Modified Capabilities
- （無 spec-level requirement 變更）

## Impact

- `src/components/shared/AuthGate.tsx` — 新增 `/investment` 至 public routes
- `src/components/layout/SideNav.tsx` — pathname 判斷後 return null
- `src/app/layout.tsx` — main 的 lg:pl-[108px] 改為 conditional
- `src/app/investment/layout.tsx` — 新增，trader 深色主題 wrapper
- `src/app/investment/page.tsx` 及子頁 — `createClient` 改為 service role client（或建立 public 版 helper）
- `src/lib/supabase/` — 可能需要 `publicRead.ts`（service role，唯讀用途）
