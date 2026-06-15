## 1. 週曆檢視渲染與切換（exportInteractive.ts，TDD）

- [x] 1.1 先在 src/lib/cases/__tests__/exportInteractive.integration.test.ts 補整合測試（jsdom）鎖定需求 Switch the timeline between list and week-agenda views：預設顯示條列式、存在檢視切換控制；切到週曆後出現逐日分組容器，且週曆事件節點帶 data-case-id 與 data-event-id；以 yarn test 驗證（先紅）
- [x] 1.2 在 src/lib/cases/exportInteractive.ts 實作檢視切換列與週曆容器（依設計決策「週曆資料從現有 DOM 的 .timeline-item 重組，不另由 server 產生」與「檢視切換以容器層級顯示切換，週曆容器為注入節點 class export-ui」）：renderWeekAgenda()（由現有 .timeline-item 依 data-event-date 重組為以週一為起點的逐日列，符合決策「週起點為週一，當日以本地開檔日期判定」）、setView('list'|'week')（切換隱藏/顯示 .timeline-list 與週曆容器），使 1.1 測試轉綠（行為：切到週曆顯示逐日事件、JS 關閉時不注入任何節點）

## 2. 週曆連動篩選與完成（exportInteractive.ts）

- [x] 2.1 落實需求 Week-agenda view reuses case assignment filtering and per-event completion（篩選部分）與設計決策「週曆檢視沿用同一份 state 與 applyFilter，依事件的 data-case-id 連動」：擴充 applyFilter() 同時套用至週曆事件節點，沿用 isCaseVisible(caseId)；整合測試驗證週曆檢視下選某人只顯示其案件事件、未指派案件隱藏、切「全部」還原（先紅後綠）
- [x] 2.2 落實需求 Week-agenda view reuses case assignment filtering and per-event completion（完成同步部分）：週曆事件的完成打勾沿用 state.done[eventId]，與條列同一鍵；整合測試驗證從週曆勾選完成→條列同一事件同步完成、completion 樣式與 localStorage 快取行為一致
- [x] 2.3 落實需求 Today is highlighted in the week-agenda view：當日列以 todayKey()（本地開檔日期）判定並加 highlight class；整合測試驗證開檔當日對應的日列被標示、非當日列未標示

## 3. 週曆／議程 inline CSS（htmlExport.ts）

- [x] 3.1 在 src/lib/cases/htmlExport.ts 的 INLINE_CSS 補週曆／議程所需樣式（檢視切換列、週分隔、逐日列、空列、當日列、事件列沿用既有藍色配色），維持 JavaScript 關閉時時程區為原條列式；以 buildCasesHtml 測試確認時程靜態輸出仍為條列、且不含 src="http、href="http、@import

## 4. 驗證

- [x] 4.1 在整合測試補一案：載入 buildCasesHtml 後「不執行互動腳本」即驗證時程區只有條列式靜態內容、無 .export-ui 切換鈕與週曆容器；以 yarn test 驗證
- [x] 4.2 執行 yarn test -- --testPathPatterns="exportInteractive|htmlExport" 全綠，並對修改檔案 yarn lint（eslint）通過
