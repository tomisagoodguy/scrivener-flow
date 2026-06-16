## 1. localStorage 高亮 collector（htmlExport.ts，TDD）

- [x] 1.1 先在 src/lib/cases/__tests__/htmlExport.test.ts 補單元測試（先紅），鎖定設計決策「localStorage 讀取集中在可注入的 collector，於匯出按鈕呼叫」與「高亮狀態以 caseId→token 陣列的純資料 map 傳入匯出」：對 `collectCaseHighlights(cases, read)` 注入假 `read`（讓 `highlight_<caseId>_印`、`highlight_<caseId>_tax_type` 回傳 `'true'`，其餘回傳 null），斷言回傳 `CaseHighlightMap`（`Record<string, string[]>`）中該 caseId 的 token 陣列含 `印` 與 `tax_type`、不含未設定的 token；另斷言未注入 read（非瀏覽器）時回傳 `{}` 不報錯；以 yarn test 驗證為紅
- [x] 1.2 依上述兩個設計決策，在 src/lib/cases/htmlExport.ts 實作並 export `CaseHighlightMap = Record<string, string[]>` 型別與 `collectCaseHighlights(cases: DemoCase[], read?: (key: string) => string | null): CaseHighlightMap`：逐案檢查 token `簽`/`印`/`稅`/`過`/`交`/`tax_type`/`pre_fee` 對應的 `highlight_<caseId>_<token>` 是否為 `'true'`；`read` 預設為以 `typeof window !== 'undefined'` 守衛的 `localStorage.getItem`，非瀏覽器回傳 `{}`；使 1.1 測試轉綠

## 2. 表格里程碑/稅單/預收 token 上色（htmlExport.ts，TDD）

- [x] 2.1 先在 htmlExport.test.ts 補測試（先紅），鎖定設計決策「表格里程碑欄拆成可個別上色的 token，稅單欄附預收規費 token」：給定某案 `highlights` 含 `印`、`tax_type`、`pre_fee`，斷言 `buildTableSection(cases, highlights)`（a）里程碑日期欄含個別 `.ms-token`，其中 `印` token 帶 `export-hl`、其他里程碑 token 不帶；（b）稅單性質值帶 `export-hl`；（c）有預收規費時，稅單欄出現 `預收` token 並帶 `export-hl`；（d）傳入空 `highlights` 時不含任何 `export-hl`；所有值仍經 escape；以 yarn test 驗證為紅
- [x] 2.2 依設計決策「表格里程碑欄拆成可個別上色的 token，稅單欄附預收規費 token」，修改 src/lib/cases/htmlExport.ts 的 `buildTableSection`（新增 `highlights` 參數，預設 `{}`）：里程碑日期欄改用新 helper 產生每個里程碑的 `<span class="ms-token">…</span>`、被高亮者加 `export-hl`；稅單性質值包成可加 `export-hl` 的 token；有預收規費時於稅單欄附 `預收 N萬` 的 `export-hl`-able token；維持 `escapeHtml`、不改其他欄；使 2.1 測試轉綠

## 3. 時程事件里程碑高亮（htmlExport.ts，TDD）

- [x] 3.1 先在 htmlExport.test.ts 補測試（先紅），鎖定設計決策「時程事件以里程碑欄位鍵對應高亮 token，月曆 chip 由 list item 傳遞」：給定某案 `highlights` 含 `印`，斷言 `buildTimelineSection(cases, now, highlights)` 中對應 `seal_date` 的 `.timeline-item` 同時帶 `export-hl` 與 `data-hl="1"`；非里程碑事件（如待辦）與未高亮里程碑的 `.timeline-item` 皆不帶；空 `highlights` 時無 `export-hl`/`data-hl`；以 yarn test 驗證為紅
- [x] 3.2 依設計決策「時程事件以里程碑欄位鍵對應高亮 token，月曆 chip 由 list item 傳遞」，修改 src/lib/cases/htmlExport.ts 的 `buildTimelineSection`（新增 `highlights` 參數，預設 `{}`）：以里程碑欄位鍵→token 對照（`contract_date`→簽、`seal_date`→印、`tax_payment_date`→稅、`transfer_date`→過、`handover_date`→交）判斷事件是否被高亮，被高亮的 `.timeline-item` 加 `export-hl` class 與 `data-hl="1"` 屬性；非里程碑欄位不上色；不改事件排序、escape 與既有 `data-*`；使 3.1 測試轉綠

## 4. export-hl 樣式與列印保色（htmlExport.ts，TDD）

- [x] 4.1 先在 htmlExport.test.ts 補測試（先紅），鎖定設計決策「共用 `export-hl` 樣式並於列印保留黃底」：斷言 `buildCasesHtml` 輸出的 INLINE_CSS 含 `.export-hl` 規則（amber 黃底）；`@media print` 區塊內 `.export-hl` 具 `print-color-adjust: exact` 與 `-webkit-print-color-adjust`；且 `buildCasesHtml` 仍自包含（無 `src="http`、`href="http`、`@import`）；以 yarn test 驗證為紅
- [x] 4.2 依設計決策「共用 `export-hl` 樣式並於列印保留黃底」，在 src/lib/cases/htmlExport.ts 的 INLINE_CSS 新增 `.export-hl { background: #fde68a; color: #78350f; border-color: #fcd34d; }`（與 `.ms-token` 視需要搭配），並在 `@media print` 將 `.export-hl` 併入既有「關鍵小標示保留底色」群組（與 `.timeline-day-today`、`.memo-warning` 並列）加 `print-color-adjust: exact` 與 `-webkit-` 前綴；使 4.1 測試轉綠

## 5. 月曆 chip 傳遞高亮（exportInteractive.ts，TDD）

- [x] 5.1 先在 src/lib/cases/__tests__/exportInteractive.integration.test.ts 補測試（先紅），鎖定設計決策「時程事件以里程碑欄位鍵對應高亮 token，月曆 chip 由 list item 傳遞」：以一筆其 `.timeline-item` 帶 `data-hl="1"` 的案件建置匯出檔並執行互動層、切到月曆，斷言對應 `.week-event` 帶 `export-hl`；另一筆未帶 `data-hl` 的事件其 `.week-event` 不帶 `export-hl`；以 yarn test 驗證為紅
- [x] 5.2 依設計決策「時程事件以里程碑欄位鍵對應高亮 token，月曆 chip 由 list item 傳遞」，修改 src/lib/cases/exportInteractive.ts 的 `makeWeekEvent`：當來源 `.timeline-item` 具 `data-hl="1"`（或 `export-hl` class）時，為重建的 `.week-event` 加上 `export-hl` class；不改既有 chip 內容（圖示／類別／買賣方名字／完成勾選）與 `data-*`；使 5.1 測試轉綠

## 6. 匯出按鈕串接 collector

- [x] 6.1 依設計決策「localStorage 讀取集中在可注入的 collector，於匯出按鈕呼叫」，修改 src/components/features/cases/ExportHtmlButton.tsx 的 `handleExport`：在呼叫 `buildCasesHtml` 前先 `const highlights = collectCaseHighlights(cases)`，並改為 `buildCasesHtml(cases, new Date(), highlights)`；不改下載流程與錯誤處理；驗收：`yarn build` 型別檢查通過、`yarn eslint src/components/features/cases/ExportHtmlButton.tsx` 通過（collector 對應邏輯由 1.1 單元測試涵蓋，故此處不另立單元測試）

## 7. 驗收與回歸

- [x] 7.1 驗收需求「Exported HTML preserves milestone and field highlight markers（匯出 HTML 保留里程碑與欄位高亮標記）」：執行 yarn test -- --testPathPatterns="htmlExport|exportInteractive" 全綠（確認表格里程碑/稅單/預收上色、時程條列與月曆上色、空 highlights 無回歸、列印保色、既有匯出/互動行為無回歸），並對 src/lib/cases/htmlExport.ts、src/lib/cases/exportInteractive.ts、src/components/features/cases/ExportHtmlButton.tsx 與兩個測試檔執行 yarn eslint 通過
