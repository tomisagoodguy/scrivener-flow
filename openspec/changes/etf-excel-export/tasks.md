## 1. 共用邏輯抽取

- [x] 1.1 閱讀 `src/app/api/investment/holdings/route.ts`，確認 `buildUnionHoldings` 函式完整邏輯與 Supabase 查詢語句
- [x] 1.2 閱讀 `src/app/investment/page.tsx`，找出 `fetchQuantFilters()` 函式（含 DB 查詢邏輯）
- [x] 1.3 將 Holdings DB 查詢邏輯抽取到 `src/lib/investment/holdingsUtils.ts`（匯出 `fetchUnionHoldings` 函式）
- [x] 1.4 將 `fetchQuantFilters` 抽取到 `src/lib/investment/quantFilters.ts`（匯出給 route 和 page 共用）
- [x] 1.5 更新 `holdings/route.ts` 改 import 自 `holdingsUtils.ts`，確認現有功能不受影響
- [x] 1.6 更新 `investment/page.tsx` 改 import 自 `quantFilters.ts`，確認現有功能不受影響

## 2. Excel 匯出 API

- [x] 2.1 建立 `src/app/api/investment/export-excel/route.ts`（Node.js runtime，不加 Edge）
- [x] 2.2 實作 `GET` handler：呼叫 `fetchUnionHoldings()` 取得 Union Pool 持股
- [x] 2.3 呼叫 `fetchQuantFilters()` 補充量化篩選欄位（momentum_pass、it_buy_10d_pass、rev_ma3_new_high、filter_score）
- [x] 2.4 用 `exceljs` 建立 Workbook，新增「選股策略」Sheet
- [x] 2.5 依六個策略分欄篩選股票代號（全部池、三大全過、雙Filter、動能通過、投信通過、營收新高），以文字格式寫入
- [x] 2.6 新增「完整指標」Sheet，依 filter_score → weight 降序排列，寫入 11 個欄位
- [x] 2.7 設定表頭樣式（bold、灰底 `FFE0E0E0`），對齊 cases ExportExcelButton 風格
- [x] 2.8 回傳 `workbook.xlsx.writeBuffer()` + 正確 Content-Type / Content-Disposition Header

## 3. 前端下載按鈕

- [x] 3.1 建立 `src/components/features/investment/ExcelDownloadButton.tsx`（`"use client"`）
- [x] 3.2 實作 `isExporting` state 控制 Loading 圖示與按鈕禁用
- [x] 3.3 點擊時 `fetch('/api/investment/export-excel')`，用 `URL.createObjectURL` + `<a>` 觸發下載
- [x] 3.4 套用 Glass Input Style（`bg-white/50 backdrop-blur-sm border-gray-200`）
- [x] 3.5 在 `src/app/investment/page.tsx` Header 的按鈕列（L474）插入 `<ExcelDownloadButton />`

## 4. 驗證

- [ ] 4.1 啟動 `yarn dev`，開啟 `/investment` 頁面確認按鈕顯示正確（需瀏覽器手動驗證）
- [ ] 4.2 點擊「⬇ 下載 Excel」，確認瀏覽器下載 `.xlsx` 且檔名含今日日期（需瀏覽器手動驗證）
- [ ] 4.3 開啟 Excel，確認「選股策略」有六欄標題且代號為文字格式（需瀏覽器手動驗證）
- [ ] 4.4 確認「完整指標」有 11 欄且資料依分數降序排列（需瀏覽器手動驗證）
- [ ] 4.5 將「選股策略」Sheet 另存為 `select_stock.xlsx`，確認 Notebook 可正常讀取代號（需瀏覽器手動驗證）
