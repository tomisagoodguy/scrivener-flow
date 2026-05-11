## 1. 建立 ETF Drilldown 資料模組

- [x] 1.1 [P] 建立 `src/lib/investment/etfPageData.ts`，加 `import 'server-only'`（資料函式放 `src/lib/investment/` 而非 `src/services/`）；遷移 `getHoldings`（含 price fallback 邏輯）與 `fetchQuantFilters`（含 momentum/it_buy/revenue 計算）及其所有依賴型別
- [x] 1.2 [P] 遷移 `getRankingHistory`、`getEtfNews`、`getDiffLogs`（含 rank 計算與 industry 補全）至 `etfPageData.ts`；確認所有函式均已 export，型別不使用 `any`

## 2. 重構 ETF Drilldown 頁面

- [x] 2.1 重構 `src/app/investment/[etf]/page.tsx`：移除所有 inline async 資料函式定義，改從 `@/lib/investment/etfPageData` import（滿足「ETF drilldown page delegates data fetching to a dedicated module」需求）；確認頁面元件僅含 orchestration 邏輯，≤ 100 行

## 3. 拆分 DrilldownTabs（DrilldownTabs 拆分至 `drilldown/` 子目錄）

- [x] 3.1 [P] 建立 `src/components/features/investment/drilldown/DrilldownTabBar.tsx`：將 `DrilldownTabs.tsx` 內 tab 按鈕陣列定義與 trigger 渲染邏輯遷移至此，≤ 150 行（滿足「DrilldownTabs component is split into container and sub-components」）
- [x] 3.2 [P] 建立 `src/components/features/investment/drilldown/TodayDiffSummary.tsx`：將今日異動摘要卡片（todayDiffs 相關 JSX，約 100 行）遷移至此，≤ 150 行
- [x] 3.3 重構 `DrilldownTabs.tsx`：import `DrilldownTabBar` 與 `TodayDiffSummary`，移除遷移後的內聯程式碼；確認 ≤ 80 行

## 4. 拆分 Equity 頁面 Inline 元件（equity 內聯元件拆至 `equity/` 子目錄，不用 barrel index）

- [x] 4.1 [P] 建立 `src/components/features/investment/equity/HighBadge.tsx`（≤ 30 行）、`HolderPctCell.tsx`（≤ 30 行）、`SortableHeader.tsx`（≤ 40 行）；直接從 `equity/page.tsx` 剪貼對應函式，保留所有 props 型別定義（滿足「Equity page inline components are extracted to dedicated files」）
- [x] 4.2 [P] 建立 `src/components/features/investment/equity/RankingTable.tsx`：從 `equity/page.tsx` 遷移 `RankingTable` 元件，import `HighBadge` 和 `SortableHeader`，≤ 150 行
- [x] 4.3 [P] 建立 `src/components/features/investment/equity/DoubleSignalSection.tsx`：從 `equity/page.tsx` 遷移 `DoubleSignalSection` 元件，import `HighBadge` 和 `HolderPctCell`，≤ 150 行

## 5. 建立 Equity 資料模組

- [x] 5.1 [P] 建立 `src/lib/investment/equityPageData.ts`，加 `import 'server-only'`；遷移 `EquityRow`、`PriceIndicator`、`RankingData`、`SortKey`、`SortDir`、`Tier` 型別及 `fetchPriceIndicators`、`applySortToRows`、`fetchRankingData` 三個函式（滿足「Equity page delegates data fetching to a dedicated module」需求）

## 6. 重構 Equity 頁面

- [x] 6.1 重構 `src/app/investment/equity/page.tsx`：移除所有 inline 元件定義與資料函式，改從 `@/components/features/investment/equity/` 和 `@/lib/investment/equityPageData` import；確認頁面 ≤ 80 行，不含任何 JSX 函式元件定義（滿足「Equity page inline components are extracted」與「Equity page delegates data fetching」）

## 7. 拆分 BareKChart 與 EtfComparePanel

- [x] 7.1 [P] 重構 `src/components/features/investment/BareKChart.tsx`：依「BareKChart 與 EtfComparePanel 各自拆出一個子元件」決策，拆出 legend 與工具列為獨立子元件，確認主元件 ≤ 150 行
- [x] 7.2 [P] 重構 `src/components/features/investment/EtfComparePanel.tsx`：拆出 filter bar 為 `src/components/features/investment/EtfComparePanelFilter.tsx`，確認主元件 ≤ 150 行

## 8. 驗證

- [x] 8.1 執行 `yarn build`，確認無 TypeScript 型別錯誤（特別檢查 server-only import 邊界與跨元件 prop 型別）
- [x] 8.2 確認五個目標檔案行數均達標：`[etf]/page.tsx` ≤ 100 行、`equity/page.tsx` ≤ 80 行、`DrilldownTabs.tsx` ≤ 80 行、`BareKChart.tsx` ≤ 150 行、`EtfComparePanel.tsx` ≤ 150 行
