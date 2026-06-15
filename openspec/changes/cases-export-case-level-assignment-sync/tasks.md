## 1. 指派模型改為案件層級（TDD）

- [x] 1.1 先在 src/lib/cases/__tests__/exportInteractive.test.ts 補測試，鎖定決策「指派鍵改以案件為單位（caseId）」：serializeInitialState 仍輸出空 { people, assignments, done }，且明確區分 assignments 以 caseId 為鍵、done 以 eventId 為鍵；以 yarn test 驗證（先紅）
- [x] 1.2 在 src/lib/cases/exportInteractive.ts 落實「指派鍵改以案件為單位（caseId）」：更新 ExportState 型別語意與註解（assignments: Record<caseId, person>），使 1.1 測試通過（轉綠）

## 2. 互動腳本三區同步（exportInteractive.ts）

- [x] 2.1 落實決策「三區塊共用同一份案件指派狀態」與需求 Assign cases to people via a managed people list：新增內部 applyAssignment(caseId, person) 統一進入點，變更後同步更新該案所有時程事件下拉值、表格列下拉值與徽章；以整合測試（時程指派→表格/備忘錄同步）驗證
- [x] 2.2 落實決策「承辦中表格列新增承辦人指派下拉」與需求 Assign cases to people via a managed people list：互動層為每個表格列注入 <select>（來源 state.people，含「未指派」），onchange 呼叫 applyAssignment；整合測試驗證從表格下拉可指派整案且時程同步
- [x] 2.3 落實決策「承辦中表格與備忘錄注入承辦人徽章與篩選連動」與需求 Reflect case assignment across all export sections：為表格列與備忘錄卡片注入「承辦：<人名>」徽章（class export-ui），未指派不顯示，指派變更時即時更新；整合測試驗證徽章顯示、隱藏與跨區同步
- [x] 2.4 落實決策「篩選連動以案件指派為準，逐事件完成打勾維持以 eventId 為鍵」與需求 Filter the calendar by person and highlight today：篩選列依 state.assignments[caseId] 同時切換時程事件、表格列、備忘錄卡片顯示，未指派案件於選特定人員時隱藏，完成打勾仍以 eventId 為鍵；整合測試驗證三區連動
- [x] 2.5 落實決策「下載已指派版本序列化案件層級 assignments」與需求 Persist assignments by downloading an assigned version：下載流程序列化 { [caseId]: person }，重新開檔後三區依案件還原承辦人與徽章；整合測試驗證下載→重開三區還原

## 3. 注入表格與備忘錄資料屬性與樣式（htmlExport.ts）

- [x] 3.1 [P] 在 buildTableSection 的每個 <tr> 加 data-case-id，供互動層綁定（需求 Reflect case assignment across all export sections）；以 buildCasesHtml 測試驗證表格列含 data-case-id
- [x] 3.2 [P] 在 buildMemoSection 的每張 .memo-card 加 data-case-id，供互動層綁定（需求 Reflect case assignment across all export sections）；以 buildCasesHtml 測試驗證 memo-card 含 data-case-id
- [x] 3.3 補互動 UI 所需 inline CSS（表格承辦人下拉、表格與備忘錄徽章、隱藏列/卡片樣式），沿用既有藍色配色，維持 JavaScript 關閉時三區原樣；以 buildCasesHtml 測試確認仍無外部資源

## 4. 驗證

- [x] 4.1 更新/補 buildCasesHtml 測試：輸出含表格與 memo 的 data-case-id、互動 <script> 與 #export-state，且仍不含 src="http、href="http、@import；yarn test 全綠
- [x] 4.2 執行 yarn test -- --testPathPatterns=exportInteractive 與 htmlExport 測試全綠，並 yarn lint 通過
- [x] 4.3 更新整合測試（jsdom）涵蓋完整流程：表格指派→時程＋備忘錄徽章同步→篩選連動三區→未指派隱藏→下載已指派版本→重開三區依案件還原；以 yarn test 驗證全綠
