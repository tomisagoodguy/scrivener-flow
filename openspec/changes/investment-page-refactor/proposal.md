## Why

投資模組的兩個 Server Component 頁面（`[etf]/page.tsx` 609 行、`equity/page.tsx` 605 行）將大量資料存取邏輯與 UI 元件混雜在同一檔案，另有三個元件檔案（`DrilldownTabs.tsx` 412 行、`BareKChart.tsx` 362 行、`EtfComparePanel.tsx` 360 行）超出 150 行元件上限，嚴重違反本專案「資料層與顯示層分離」原則，導致程式碼難以閱讀、測試與維護。

## What Changes

- 將 `[etf]/page.tsx` 中的五個 async 資料存取函式（`getHoldings`、`fetchQuantFilters`、`getRankingHistory`、`getEtfNews`、`getDiffLogs`）抽取至 `src/lib/investment/etfPageData.ts`
- 將 `equity/page.tsx` 中的五個內聯 UI 元件（`DoubleSignalSection`、`HighBadge`、`SortableHeader`、`HolderPctCell`、`RankingTable`）拆分至 `src/components/features/investment/equity/` 目錄下的獨立檔案
- 將 `equity/page.tsx` 中的資料存取函式（`fetchPriceIndicators`、`applySortToRows`、`fetchRankingData`）抽取至 `src/lib/investment/equityPageData.ts`
- 將 `DrilldownTabs.tsx` 拆分成容器元件 + tab 子元件
- 將 `BareKChart.tsx` 和 `EtfComparePanel.tsx` 各自拆分成容器 + 子元件
- 重構後每個頁面元件 ≤ 100 行，每個 UI 元件 ≤ 150 行，資料模組無行數限制

## Non-Goals

- 不修改任何 Supabase 查詢邏輯、資料 schema 或業務邏輯
- 不修改路由結構或 URL
- 不調整任何 UI 外觀或互動行為
- `CaseMemoCard.tsx`（533 行）的拆分屬於獨立 change，不在此範圍

## Capabilities

### New Capabilities

- `etf-drilldown-decomposition`：定義 `[etf]/page.tsx` 的結構拆分約束，包含資料模組介面、頁面元件行數上限、依賴邊界
- `equity-page-decomposition`：定義 `equity/page.tsx` 的結構拆分約束，包含內聯元件的拆分規則與資料模組介面

### Modified Capabilities

（無）

## Impact

- Affected code:
  - Modified:
    - src/app/investment/[etf]/page.tsx
    - src/app/investment/equity/page.tsx
    - src/components/features/investment/DrilldownTabs.tsx
    - src/components/features/investment/BareKChart.tsx
    - src/components/features/investment/EtfComparePanel.tsx
  - New:
    - src/lib/investment/etfPageData.ts
    - src/lib/investment/equityPageData.ts
    - src/components/features/investment/equity/DoubleSignalSection.tsx
    - src/components/features/investment/equity/HighBadge.tsx
    - src/components/features/investment/equity/SortableHeader.tsx
    - src/components/features/investment/equity/HolderPctCell.tsx
    - src/components/features/investment/equity/RankingTable.tsx
    - src/components/features/investment/drilldown/ (DrilldownTabs 子元件目錄)
