## 1. Public Access — AuthGate

- [x] 1.1 修改 `src/components/shared/AuthGate.tsx`：在 `isPublicRoute` 判斷加入 `pathname.startsWith('/investment')`

## 2. Supabase Client — 改用 getServiceClient()

- [x] 2.1 `src/app/investment/page.tsx` — server client 保持原樣（無 session 時自動 fallback anon key）
- [x] 2.2 `src/app/investment/[etf]/page.tsx` — 同上（不需要換 service client）
- [x] 2.3 `src/app/investment/bare-k/page.tsx` — 跳過（auth-required，watch_list 個人資料）
- [x] 2.4 `src/app/investment/bare-k/[code]/page.tsx` — 跳過（auth-required）
- [x] 2.5 `src/app/investment/compare/page.tsx` — 保持 server client
- [x] 2.6 `src/app/investment/consensus/page.tsx` — 保持 server client
- [x] 2.7 `src/app/investment/history/page.tsx` — 保持 server client
- [x] 2.8 `src/app/investment/revenue-lab/page.tsx` — 保持 server client
- [x] 2.9 `src/app/investment/watch-list/page.tsx` — 跳過（auth-required，watch_list 個人資料）

## 3. Immersive Layout — SideNav & Main

- [x] 3.1 修改 `src/components/layout/SideNav.tsx`：pathname 以 `/investment` 開頭時 `return null`
- [x] 3.2 新增 `src/components/layout/MainWrapper.tsx`：client component，pathname 判斷動態移除 `lg:pl-[108px]`
- [x] 3.3 新增 `src/components/layout/HeaderWrapper.tsx`：client component，pathname 判斷動態隱藏 Header
- [x] 3.4 修改 `src/app/layout.tsx`：`<main>` 改用 `<MainWrapper>`；`<Header>` 改用 `<HeaderWrapper>`

## 4. Trader Theme — Investment Layout

- [x] 4.1 新增 `src/app/investment/layout.tsx`：深黑底色、霓虹 accent CSS variables、trader 容器樣式
- [x] 4.2 在 investment layout 加入極簡頂部 nav bar（顯示返回代書系統連結 + 資料日期徽章）

## 5. 驗證

- [x] 5.1 本地測試：未登入瀏覽器直接訪問 `/investment`，確認無 passphrase gate
- [x] 5.2 server client 無 session 時 fallback anon key，ETF 資料正常讀取（server client 設計如此）
- [x] 5.3 SideNav 僅在 `/investment*` 返回 null，其他路由正常顯示
- [x] 5.4 `yarn build` 通過，無 TypeScript 錯誤
