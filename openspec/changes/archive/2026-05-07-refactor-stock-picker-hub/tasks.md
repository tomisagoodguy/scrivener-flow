## 1. 建立共享型別檔

- [x] 1.1 建立 `src/components/features/investment/StockPickerHub.types.ts`，將 `HoldingItem`、`EtfData`、`QuantFilter`、`StockPickerHubProps`、`UnifiedHolding`、`SortField`、`SortOrder`、`FactorFilter` 以及 `HOLDING_SORT_FIELDS` 常數從 `StockPickerHub.tsx` 搬入（shared types live in a dedicated file）

## 2. 建立 useStockPickerHub hook

- [x] 2.1 建立 `src/hooks/investment/useStockPickerHub.ts`，搬入 `buildUnifiedHoldings()` 純函數（hook encapsulates all state and computation）
- [x] 2.2 搬入 `sortHoldings()` 純函數至同一 hook 檔
- [x] 2.3 在 hook 中宣告 `panelStock`、`searchQuery`、`selectedEtfs`、`activeFactors`、`sortField`、`sortOrder` 六個狀態，以及 `openPanel`、`toggleEtf`、`toggleFactor`、`handleSort` handlers
- [x] 2.4 用 `useMemo` 依序計算 `etfColorMap`、`unifiedHoldings`、`filteredHoldings`、`sortedHoldings`、`activeEtfCodes`，確保 hook 回傳完整介面（hook returns complete interface）

## 3. 建立 FactorFilterChips 元件

- [x] 3.1 建立 `src/components/features/investment/FactorFilterChips.tsx`，接受 `activeFactors: Set<FactorFilter>`、`selectedEtfsSize: number`、`onToggle: (f: FactorFilter) => void`、`onClear: () => void` props（FactorFilterChips is a standalone component）
- [x] 3.2 將原 `StockPickerHub.tsx` 的 `colorMap` 物件與 `renderChip` 函數搬入，不持有任何 state，chip active 狀態完全由 `activeFactors` props 決定（chip reflects active state from props）
- [x] 3.3 根據 `activeFactors.size > 0` 控制清除按鈕顯示（clear button visibility）

## 4. 建立 HoldingsTableRow 元件

- [x] 4.1 建立 `src/components/features/investment/HoldingsTableRow.tsx`，接受 `holding: UnifiedHolding`、`activeEtfCodes: string[]`、`etfColorMap: Record<string,string>`、`selectedEtfsSize: number`、`sortField: SortField`、`sortOrder: SortOrder`、`signals`、`onOpenPanel: (code: string, name: string) => void` props（HoldingsTableRow renders a single holding row）
- [x] 4.2 搬入原 `StockPickerHub.tsx` tbody 中單行 `<tr>` 的全部渲染邏輯，不持有任何 state（no inline state）
- [x] 4.3 確認股名按鈕 onClick 呼叫 `onOpenPanel(code, name)`（panel opens on name click）

## 5. 建立 HoldingsTable 元件

- [x] 5.1 建立 `src/components/features/investment/HoldingsTable.tsx`，接受 `holdings: UnifiedHolding[]`、`activeEtfCodes: string[]`、`etfColorMap: Record<string,string>`、`selectedEtfsSize: number`、`sortField: SortField`、`sortOrder: SortOrder`、`signals`、`onSort: (f: SortField) => void`、`onOpenPanel` props（HoldingsTable renders table structure）
- [x] 5.2 渲染 `<table>`、`<thead>`（含所有可排序 `<th>`），th onClick 呼叫 `onSort(field)`（sort header triggers callback）
- [x] 5.3 渲染 `<tbody>` 並將每個 holding map 至 `<HoldingsTableRow>`，委派行渲染

## 6. 精簡主元件 StockPickerHub

- [x] 6.1 將 `StockPickerHub.tsx` 改為只呼叫 `useStockPickerHub` hook、渲染搜尋列、ETF 勾選框，並組合 `<FactorFilterChips>` 與 `<HoldingsTable>`（StockPickerHub component size limit）
- [x] 6.2 驗證 `StockPickerHub.tsx` 行數 ≤ 150（StockPickerHub component size limit）
- [x] 6.3 刪除 `StockPickerHub.tsx` 內原有的型別宣告、`buildUnifiedHoldings`、`sortHoldings` 定義，改為從 `StockPickerHub.types.ts` import（single import source for types）

## 7. 驗證

- [x] 7.1 執行 `yarn build` 確認無 TypeScript 錯誤
- [x] 7.2 執行 `yarn lint` 確認無 ESLint 警告
- [x] 7.3 在瀏覽器開啟投資儀表板頁，確認篩選、排序、詳情面板行為與重構前完全一致
