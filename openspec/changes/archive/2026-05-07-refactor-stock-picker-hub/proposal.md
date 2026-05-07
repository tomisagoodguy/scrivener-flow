## Why

`StockPickerHub.tsx` 目前 673 行，遠超 CLAUDE.md 規定的元件上限 150 行。資料聚合邏輯、排序邏輯、篩選狀態、四個 UI 區塊全混在同一檔案，任何修改都要讀懂整體才能動手，維護成本高且容易引發迴歸。

## What Changes

- 將 `buildUnifiedHoldings()`、`sortHoldings()` 及全部篩選狀態/handlers 抽至 `useStockPickerHub.ts` hook
- 將因子篩選 chip 群（含 `colorMap` IIFE）獨立為 `FactorFilterChips.tsx`（~80 行）
- 將持股表格 thead + row 拆為 `HoldingsTable.tsx`（表頭 + 結構）與 `HoldingsTableRow.tsx`（單行渲染）
- `StockPickerHub.tsx` 主體縮減為搜尋列 + ETF 勾選框 + 組合子元件（≤ 150 行）
- 所有 TypeScript 介面（`HoldingItem`、`EtfData`、`QuantFilter`、`UnifiedHolding` 等）移至 `StockPickerHub.types.ts`

## Non-Goals

- 不修改任何對外 API 或 Props interface（`StockPickerHubProps` 保持不變）
- 不更改篩選邏輯或 UI 行為，視覺結果必須與重構前完全一致
- 不處理 `DrilldownTabs.tsx` 或其他巨石元件（另開 change）

## Capabilities

### New Capabilities

- `stock-picker-hub-decomposition`: 定義 StockPickerHub 元件拆分後的結構要求與模組邊界，確保各子模組職責單一、可獨立測試

### Modified Capabilities

（無，spec-level 行為不變）

## Impact

- Affected specs: `stock-picker-hub-decomposition`（新增）
- Affected code:
  - Modified: `src/components/features/investment/StockPickerHub.tsx`
  - New: `src/hooks/investment/useStockPickerHub.ts`
  - New: `src/components/features/investment/FactorFilterChips.tsx`
  - New: `src/components/features/investment/HoldingsTable.tsx`
  - New: `src/components/features/investment/HoldingsTableRow.tsx`
  - New: `src/components/features/investment/StockPickerHub.types.ts`
