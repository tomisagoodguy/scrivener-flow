## 1. 紙本列印樣式（htmlExport.ts，TDD）

- [x] 1.1 先在 src/lib/cases/__tests__/htmlExport.test.ts 的 buildCasesHtml describe 補單元測試（先紅），鎖定需求 Exported HTML provides a print layout for paper：斷言 buildCasesHtml 輸出含 `@media print`、含隱藏互動層規則（`@media print` 內 `.export-ui` 搭配 `display: none`）、含 `break-inside: avoid`、含 `print-color-adjust`（含 `-webkit-print-color-adjust`）、含表頭重複 `table-header-group`，且仍自包含（無 `src="http`、`href="http`、`@import`）；以 yarn test 驗證為紅
- [x] 1.2 依設計決策「列印樣式以 INLINE_CSS 末端的 @media print 區塊實作」「列印時以 .export-ui 一鍵隱藏所有互動節點」「大面積底色改邊框+粗體，關鍵小標示用 print-color-adjust 保留底色」「用 break-inside: avoid 與 thead 重複表頭控制分頁」，在 src/lib/cases/htmlExport.ts 的 INLINE_CSS 末端追加 `@media print` 區塊：`.export-ui { display:none !important }`、`@page { margin }` 與 `body { padding:0 }` 重置、`th`/`.timeline-day`/`.memo-card`/`.timeline-list` 去底色去陰影改邊框+粗體、`.timeline-day-today`/`.memo-warning` 加 `print-color-adjust: exact`（含 `-webkit-` 前綴）保留底色、`.section`/`.timeline-day`/`.memo-card`/`tr` 加 `break-inside: avoid`、`thead { display: table-header-group }`，使 1.1 測試轉綠（不改螢幕樣式與互動腳本）

## 2. 驗證

- [x] 2.1 執行 yarn test -- --testPathPatterns="htmlExport|exportInteractive" 全綠（確認螢幕行為與互動無回歸），並對 src/lib/cases/htmlExport.ts 與 src/lib/cases/__tests__/htmlExport.test.ts 執行 yarn eslint 通過
