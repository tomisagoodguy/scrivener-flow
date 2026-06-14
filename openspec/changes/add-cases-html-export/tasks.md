## 1. 資料層：HTML 產生工具

- [ ] 1.1 建立 src/lib/cases/htmlExport.ts，實作 Reuse existing case data normalization rules：抽出 ExportExcelButton 的里程碑/財務陣列取首筆、標準+自訂待辦過濾（去 S_/T_ 前綴、排除 S_權狀印鑑 與 S_稅單、排除數字 key）、備註 [[ATTR:...]] 清理、日期格式化、金額換算萬元，匯出可重用函式。
- [ ] 1.2 在 htmlExport.ts 實作 HTML output escapes user-provided content：提供 escapeHtml() 對所有使用者文字值轉義 < > & " ，並於後續所有區塊套用。
- [ ] 1.3 [P] 在 htmlExport.ts 實作 HTML output contains table, memo, and timeline sections 的「表格」區段產生器：輸出含案號、地區、買賣方、價格/銀行、稅單性質、里程碑日期(簽/印/稅/過/交)、未完成待辦、備註的 HTML table。
- [ ] 1.4 [P] 在 htmlExport.ts 實作 memo 區段產生器：僅輸出備忘內容非空的案件卡片。
- [ ] 1.5 [P] 在 htmlExport.ts 實作 timeline 區段產生器：依各案下一個即將到來的里程碑日期排序，列出案件識別與該里程碑。
- [ ] 1.6 在 htmlExport.ts 組合 buildCasesHtml(cases)：產生單一自包含文件字串（inline CSS、無外部資源、繁中 lang/charset），串接表格、memo、timeline 三區段並加上標題與匯出時間。

## 2. UI 層：匯出按鈕

- [ ] 2.1 建立 src/components/features/cases/ExportHtmlButton.tsx（'use client'），實作 Export cases as a self-contained HTML file：呼叫 buildCasesHtml，以 Blob + file-saver 下載 案件清單_<yyyyMMdd_HHmm>.html；cases 為空時 alert「沒有案件資料可以匯出」不下載。
- [ ] 2.2 於 src/app/cases/page.tsx header 既有 ExportExcelButton 旁加入 ExportHtmlButton，傳入相同已篩選/排序後的 cases。

## 3. 驗證

- [ ] 3.1 yarn lint 與 yarn build 通過，無 any 型別（catch 用 unknown）。
- [ ] 3.2 手動驗證：下載的 .html 離線雙擊開啟可完整呈現繁中與三區段，且含特殊字元(< > & ")的欄位顯示為字面值（驗證 escape）。
