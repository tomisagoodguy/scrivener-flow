## Context

投資模組目前有兩個 600+ 行的 Server Component 頁面與三個 350–412 行的 UI 元件，全都混雜資料存取、業務計算與 JSX 渲染，違反本專案的分層架構（Pages → Hooks → Services → Repositories → DB）。主要問題集中在：

- `src/app/investment/[etf]/page.tsx`：頁面模組內直接定義 5 個 async 資料函式（約 330 行）
- `src/app/investment/equity/page.tsx`：頁面模組內同時定義 5 個 UI 元件 + 3 個資料函式（約 470 行是非頁面邏輯）
- `DrilldownTabs.tsx`、`BareKChart.tsx`、`EtfComparePanel.tsx`：元件過大，難以個別測試

## Goals / Non-Goals

**Goals:**

- 每個頁面元件（page.tsx）≤ 100 行（純 orchestration，只做 import + compose）
- 每個 UI 元件 ≤ 150 行
- 資料存取函式集中在 `src/lib/investment/`（server-only）
- equity 頁面的內聯 UI 元件遷移至 `src/components/features/investment/equity/`

**Non-Goals:**

- 不修改 Supabase 查詢邏輯或資料型別
- 不為資料函式加 cache / revalidation 策略（屬獨立議題）
- 不為新檔案增加單元測試（屬獨立 change）

## Decisions

### 資料函式放 `src/lib/investment/` 而非 `src/services/`

`src/services/` 放的是含業務邏輯的服務層（`caseService.ts`、`todoService.ts`）。`[etf]/page.tsx` 的資料函式是純 Supabase 查詢 + 輕量計算，無副作用、無外部 API 呼叫，與 `holdingsUtils.ts`、`etfRegistry.ts` 的定位一致，應放在 `src/lib/investment/`。

Alternative 考慮：放在 `src/app/investment/[etf]/` 目錄下的 `_data.ts`。拒絕原因：Next.js App Router 慣例中底線前綴表示 private route segment，且未來若多頁共用同一資料函式（如 pnl series）會找不到。

### equity 內聯元件拆至 `equity/` 子目錄，不用 barrel index

`DoubleSignalSection`、`HighBadge`、`SortableHeader`、`HolderPctCell`、`RankingTable` 均為 equity 頁面專用元件，應放在 `src/components/features/investment/equity/` 各自獨立檔案。**不建立 `index.ts` barrel**，避免過度工程化；頁面直接 named import。

### DrilldownTabs 拆分至 `drilldown/` 子目錄

`DrilldownTabs.tsx`（412 行）是一個 tab 容器，每個 tab 的內容是透過 props 傳入的 ReactNode（`holdingsContent`、`ledgerContent` 等）。真正的胖邏輯在 tab bar 的渲染與 state 管理。拆分策略：

- `DrilldownTabs.tsx` 保留為 tab 路由容器，≤ 80 行
- `src/components/features/investment/drilldown/DrilldownTabBar.tsx`：tab 列渲染（含 tab 定義與 active 狀態）
- `src/components/features/investment/drilldown/TodayDiffSummary.tsx`：今日異動摘要卡片（目前內嵌在 DrilldownTabs 裡約 150 行）

### BareKChart 與 EtfComparePanel 各自拆出一個子元件

兩者都是圖表容器夾雜 legend / tooltip 定義。拆法：
- `BareKChart.tsx`：保留主圖表邏輯，將 legend 與工具列各自抽出（≤ 150 行 × 2）
- `EtfComparePanel.tsx`：將 filter bar 抽出為 `EtfComparePanelFilter.tsx`

## Risks / Trade-offs

- **伺服器元件邊界**：`src/lib/investment/etfPageData.ts` 只能從 Server Component 或 Server Action 呼叫，若未來有人誤從 Client Component import 會 build error。緩解：在檔案頂端加 `import 'server-only'`（Next.js 伺服器限制標記）
- **DrilldownTabs props 型別**：目前的 `holdingsContent: ReactNode` 等 props 型別定義在 `DrilldownTabs.tsx` 內，拆分後需將介面移至 `drilldown/types.ts` 或 `DrilldownTabs.tsx` 本身仍保留型別定義。選擇後者保持向後相容
- **equity 元件循環依賴**：`RankingTable` 用到 `HighBadge` 和 `SortableHeader`，需確保 import 方向單向（`RankingTable` import 兩者，不反向）
