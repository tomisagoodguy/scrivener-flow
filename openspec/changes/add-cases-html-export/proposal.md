## Why

代書出國或交接時需把目前案件進度交給同事，但現有匯出只有 Excel（需 Excel 軟體、適合再編輯而非閱讀）。同事拿到後常需快速「閱讀」案件狀態、備忘錄與時程，缺一個打開即看、跨平台、可直接用 LINE/Email 傳送的唯讀檔案。

## What Changes

- 在 `/cases` 頁面 header 新增「匯出 HTML」按鈕（與現有「匯出 Excel」並列）。
- 點擊後在瀏覽器端產生單一自包含 `.html` 檔（inline CSS、無外部資源、無側邊欄/導覽列），透過 file-saver 下載。
- HTML 內容涵蓋三個分頁的資料：
  - 承辦中表格：案號、地區、買賣方、價格/銀行、稅單性質、里程碑日期（簽/印/稅/過/交）、未完成待辦、備註。
  - 備忘錄 Memo：以卡片排版呈現各案件備忘內容。
  - 時程 Timeline：以時間序列呈現各案件即將到來的里程碑。
- 沿用 ExportExcelButton 既有資料處理邏輯（里程碑/財務陣列取首筆、標準+自訂待辦過濾、備註 `[[ATTR:...]]` 清理、日期格式化、金額換算萬元）。
- 匯出的資料範圍依目前頁面已篩選/排序後的 `cases`，與 Excel 行為一致。

## Non-Goals

- 不做 PDF 匯出（中文字型與檔案大小成本高，本次只做 HTML）。
- 不做伺服器端產檔或排程寄送，純前端 client-side 產檔下載。
- 不改動現有 Excel 匯出邏輯與資料查詢。
- 不加入互動功能（排序、搜尋）至匯出的 HTML，純唯讀靜態呈現。
- 不處理 E2EE 私密備註的解密匯出，僅匯出畫面上已可見的資料。

## Capabilities

### New Capabilities

- `cases-html-export`: 在案件管理頁產生單一自包含 HTML 檔，含表格、備忘錄、時程三區塊，供唯讀分享。

### Modified Capabilities

(none)

## Impact

- Affected specs: cases-html-export (new)
- Affected code:
  - New:
    - src/components/features/cases/ExportHtmlButton.tsx
    - src/lib/cases/htmlExport.ts
  - Modified:
    - src/app/cases/page.tsx
  - Removed: (none)
