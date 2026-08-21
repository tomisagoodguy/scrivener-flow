## Why

`/investment` 首頁的 ETF 持股重疊比較（[EtfComparePanel.tsx](src/components/features/investment/EtfComparePanel.tsx)）目前只有「按 ETF 分組」的卡片視圖：每支 ETF 一張卡，卡內列出持股並標記該股被幾支 ETF 共同持有。當使用者想反過來問「哪些個股被最多 ETF 共同看好、合計權重多少」時，必須在多張卡片之間手動比對，效率低。參考同類公開追蹤器（simon99 active-etf-tracker 的 overlap 頁面）採用「按個股分組」的單一表格呈現同一份重疊資料，資訊密度更高、更適合快速掃描重疊股清單。本專案的重疊資料（`stockEtfMap`、`allHoldings`）在 [page.tsx](src/app/investment/page.tsx:106) 的 `getCompareData()` 已完整計算，僅缺一個以個股為列的呈現層。

## What Changes

- 在 `/investment` 首頁既有的 ETF 持股比較區塊新增一個可切換的 Tab：「卡片視圖（按 ETF）」與「表格視圖（按個股）」，預設維持現有卡片視圖，不影響既有使用習慣。
- 新增「按個股分組」表格元件：每列一檔股票，欄位為股票代碼、股票名稱、持有 ETF 家數、覆蓋率%（持有家數 ÷ 目前有資料的 ETF 總數）、持有清單（列出各 ETF code，含連結至各 ETF 詳情頁的 tooltip 或 badge）、平均權重（該股在持有它的各 ETF 中權重的算術平均）、合計權重（該股在持有它的各 ETF 中權重的加總）。
- 表格預設依「持有 ETF 家數」由高到低排序，並支援使用者點擊欄位標題切換排序（家數 / 覆蓋率 / 平均權重 / 合計權重）。
- 僅新增衍生的顯示層邏輯（分組、排序、平均/加總計算），不新增資料表、不修改 `getCompareData()` 現有回傳結構之外的資料抓取邏輯——新表格所需資料完全由現有 `EtfData[]`（含 `HoldingItem.in_etfs`、`weight`）在前端衍生計算得出。

## Non-Goals (optional)

- 不做矩陣/熱力圖式的兩兩 ETF 重疊比對（simon99 頁面也沒有這種呈現，此次僅做個股分組表格）。
- 不新增互動篩選/搜尋框（如關鍵字篩股票、依產業篩選），僅做基本欄位排序。
- 不修改既有卡片視圖（`EtfCard`、`OverlapSummary`、`OverlapLegend`）的行為或版面。
- 不新增資料庫欄位或後端計算步驟（`overlap_compute_step.py` 不變動），所有新欄位（覆蓋率%、平均權重、合計權重）皆為前端由既有 `EtfData[]` 衍生計算。

## Capabilities

### New Capabilities

- `etf-overlap-stock-table`: ETF 持股重疊比較的「按個股分組」表格視圖，含 Tab 切換、欄位排序、覆蓋率與合計權重計算。

### Modified Capabilities

(none)

## Impact

- Affected specs: `etf-overlap-stock-table`（新增）
- Affected code:
  - New:
    - `src/components/features/investment/EtfOverlapStockTable.tsx`（按個股分組的表格元件，含排序邏輯）
    - `src/components/features/investment/EtfCompareViewTabs.tsx`（卡片視圖／表格視圖 Tab 切換容器）
  - Modified:
    - `src/app/investment/page.tsx`（將現有 `<EtfComparePanel etfs={compareData.etfs} overlap={compareData.overlap} />` 呼叫改為透過新的 `EtfCompareViewTabs` 包裹，傳入相同的 `compareData.etfs` 與 `compareData.overlap`）
    - `src/components/features/investment/EtfComparePanelUtils.ts`（新增供表格視圖共用的個股分組/排序 helper function，供 `EtfOverlapStockTable.tsx` 匯入）
