## Context

目前 `/investment/consensus-signal`（全市場共識）與 `/investment/fund-tracker`（自選股投信追蹤）是兩個完全獨立的 Server Component 頁面，各自呼叫不同的 Server Action。兩頁面的資料主軸（ETF 加碼 × 投信買超）高度重疊，使用者需在兩頁間切換才能比對訊號。

## Goals / Non-Goals

**Goals:**

- 在 `/investment/consensus-signal` 加入 `全市場 | 自選股` Tab 切換，整合兩頁功能
- 維持 `/investment/fund-tracker` 路由可用性（重導向，避免 broken link）
- Tab 狀態透過 URL query param 管理，支援直接連結分享

**Non-Goals:**

- 不合併底層 Server Action（兩個 Action 邏輯差異大）
- 不修改元件內部 UI 或資料查詢邏輯
- 不刪除 fund-tracker 相關元件檔案（僅移動使用位置）

## Decisions

### Tab 狀態用 URL query param (`?tab=`) 管理

使用 `?tab=market`（預設）與 `?tab=watchlist` 控制顯示的 Tab。

**理由**：URL param 支援直接連結、瀏覽器上下頁導航，且與 Next.js Server Component `searchParams` 整合最直接，不需要額外的 Client Component 狀態提升。

**替代方案**：React `useState` — 不支援重新整理後保持 Tab；`useSearchParams` Client hook — 需要 `<Suspense>` 包裹且讓頁面退化為 Client Component。

### Page 維持 Server Component，Tab 切換用獨立 Client Component

`consensus-signal/page.tsx` 保持 `async` Server Component，透過 `searchParams.tab` 決定渲染哪組元件。新增 `TabSwitcher.tsx` 作為純 Client Component 負責 tab 按鈕的樣式切換與 `router.push`。

**理由**：Server Component 可以在伺服器端並行呼叫兩個 Action（`getConsensusSignals` + `getFundMomentumSignals`），不需要在客戶端做 loading 狀態管理。

### fund-tracker 路由改為 Client-side 重導向

`/investment/fund-tracker/page.tsx` 改用 Next.js `redirect()` 將所有請求轉至 `/investment/consensus-signal?tab=watchlist`。

**理由**：保留路由相容性，不讓原有書籤失效；`redirect()` 是 Server Component 內建函式，不需要額外元件。

## Risks / Trade-offs

- **`useSearchParams` 邊界**：`TabSwitcher` 使用 `useRouter` 做 push，需確認 layout 層沒有包裹 `useSearchParams`（已知 `components.md` 規則：`useSearchParams` 不可在全域 layout）— 此處只在頁面層使用 `searchParams`（Server），無風險。
- **自選股為空時的 UX**：自選股 Tab 若觀察清單為空，需顯示引導訊息（連結到 `/investment/bare-k`），與現有 fund-tracker 空狀態邏輯一致。
