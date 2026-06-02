## 1. 建立 TabSwitcher Client Component

- [x] 1.1 在 `src/app/investment/consensus-signal/components/TabSwitcher.tsx` 建立 TabSwitcher client component，接受 `currentTab: 'market' | 'watchlist'` prop，使用 `useRouter` 切換 tab，實作 tab switcher UI（對應 spec: Tab switcher UI on consensus-signal page、Self-contained TabSwitcher client component）

## 2. 改造 consensus-signal page

- [x] 2.1 修改 `src/app/investment/consensus-signal/page.tsx`：讀取 `searchParams.tab` 實作 Tab 狀態用 URL query param (`?tab=`) 管理，並維持 page 維持 server component，tab 切換用獨立 client component 架構；當 `tab=watchlist` 時並行呼叫 `getFundMomentumSignals(watchListCodes)` 取得自選股資料
- [x] 2.2 [P] 在 `page.tsx` 渲染 `<TabSwitcher currentTab={tab} />`，並根據 `tab` 值條件渲染：`tab=market` → `ConsensusSummaryCards + ConsensusTable`；`tab=watchlist` → `AccumulationCycleCard + EtfFundCrossSignal + FundHealthTable`（對應 spec: Tab switcher UI on consensus-signal page）
- [x] 2.3 [P] 在 `page.tsx` 處理自選股 tab 的空觀察清單狀態：顯示引導訊息並連結至 `/investment/bare-k`（對應 spec: 自選股 tab empty state）
- [x] 2.4 [P] 更新 `page.tsx` 頁面標題區域：資料日期根據 active tab 顯示對應 Action 的日期（對應 spec: Page heading reflects active tab context）

## 3. 改造 fund-tracker page（重導向）

- [x] 3.1 修改 `src/app/investment/fund-tracker/page.tsx`：移除現有渲染邏輯，改用 Next.js `redirect('/investment/consensus-signal?tab=watchlist')` 實作 server-side 重導向（對應 spec: Fund tracker page route、design: fund-tracker 路由改為 Client-side 重導向）

## 4. 更新側邊導航

- [x] 4.1 找到投資模組導航設定檔（`src/app/investment/layout.tsx` 或 `src/components/layout/SideNav.tsx`），將「投信追蹤」連結目標從 `/investment/fund-tracker` 改為 `/investment/consensus-signal?tab=watchlist`，並視版面調整 label 或合併導航項目（對應 spec: Navigation entry）
