## Context

投資頁面已有完整的選股池資料流：`buildUnionHoldings`（DB 查詢 + Union 去重）和 `fetchQuantFilters`（量化指標查詢）。  
目前這兩段邏輯分別散落在 `holdings/route.ts` 和 `investment/page.tsx`，無法直接被新 API 重用。

## Goals / Non-Goals

**Goals:**
- Server-side API 回傳 `.xlsx`，含兩個 Sheet
- 前端一鍵觸發瀏覽器下載，無需彈窗或額外頁面
- Sheet 1 格式與 `select_stock.xlsx` 相容（只有股票代號，無標題列的數字欄）

**Non-Goals:**
- 不支援自訂篩選條件（固定輸出六欄策略）
- 不實作排程匯出或 Email 發送
- 不修改 `fetchQuantFilters` 的計算邏輯

## Decisions

### 1. 共用邏輯抽取為 Server-side utility
`fetchQuantFilters` 目前在 `investment/page.tsx`（Server Component）中定義，是一個 async function。  
由於 `export-excel/route.ts` 是獨立的 Route Handler，無法直接 import Server Component 的函式。

**決策**：將 `fetchQuantFilters` 抽取到 `src/lib/investment/quantFilters.ts`，同時從 `page.tsx` 和新 `route.ts` import。  
`buildUnionHoldings` 已在 `holdings/route.ts` 定義，同樣抽取到 `src/lib/investment/holdingsUtils.ts`。

**備選方案**：從 `export-excel/route.ts` 內部呼叫 `/api/investment/holdings` HTTP endpoint → 拒絕，Server-to-Server HTTP 呼叫在 Vercel 有冷啟動延遲且難以測試。

### 2. 下載按鈕置於 Client Component
`investment/page.tsx` 是 Server Component，無法直接使用 `useState`。  
**決策**：抽取一個小型 `ExcelDownloadButton` Client Component（`"use client"`），內嵌在 page.tsx 的 Header 區域。  
點擊後呼叫 `fetch('/api/investment/export-excel')` 並用 `URL.createObjectURL` 觸發瀏覽器下載。

### 3. Sheet 1 僅寫代號（數字格式）
為相容 Notebook 的 `select_stock.xlsx` 讀取邏輯（`int(cell.value)` 解析），Sheet 1 欄位只放 4 位數代號，不含名稱。  
欄標題：全部池、三大全過、雙Filter、動能通過、投信通過、營收新高。

## Risks / Trade-offs

- **量化指標計算時間**：`fetchQuantFilters` 對所有股票做 DB 查詢，約 50~150 支股票，預估 3~8 秒。  
  → 前端按鈕顯示 Loading 狀態，API 回應時間可接受（非高頻操作）
- **exceljs 在 Edge Runtime 不支援**：Route Handler 必須使用 Node.js runtime（預設），不能加 `export const runtime = 'edge'`

## Migration Plan

無資料遷移。純新增 API + UI 元件，不影響現有功能。
