## Why

使用者每天需手動從網站複製選股代號到本機 `select_stock.xlsx`，再執行 `裸K看盤.ipynb`。  
網站選股池與本機工具脫節，增加人工成本與出錯風險——直接從投資頁面一鍵匯出 Excel 可消除這個瓶頸。

## What Changes

- 新增 API Endpoint `GET /api/investment/export-excel`，回傳 `.xlsx` 二進位檔
- 回傳兩個工作表：「選股策略」（格式相容 select_stock.xlsx）+ 「完整指標」（含所有量化欄位）
- 投資頁面 Header 新增「⬇ 下載 Excel」按鈕，點擊觸發瀏覽器下載

## Capabilities

### New Capabilities
- `etf-excel-download`: 投資選股池 Excel 匯出，包含 API endpoint 和前端下載按鈕

### Modified Capabilities
<!-- 無現有 spec 需要異動 -->

## Impact

**新增檔案**：
- `src/app/api/investment/export-excel/route.ts`

**修改檔案**：
- `src/app/investment/page.tsx`（Header 新增下載按鈕）

**依賴**：
- `exceljs`（已安裝，案件模組已使用）
- 重用現有 Holdings 查詢邏輯（`buildUnionHoldings`）
- 重用現有量化篩選邏輯（`fetchQuantFilters`）
- 重用現有 Filter 定義（`FILTER_DEFINITIONS`、`holdingFilters.ts`）
