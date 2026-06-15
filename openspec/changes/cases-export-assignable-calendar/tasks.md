## 1. 事件 ID 與初始 state（TDD）

- [x] 1.1 在 src/lib/cases/__tests__/exportInteractive.test.ts 先寫測試，鎖定「指派與完成狀態以穩定事件 ID 為鍵」：里程碑/約客/稅單事件 ID 為 `caseId::fieldKey`、待辦為 `caseId::todo::todoId`
- [x] 1.2 在 src/lib/cases/exportInteractive.ts 實作 `serializeInitialState(events)`，輸出 `{ people: [], assignments: {}, done: {} }` 與上述穩定事件 ID，使 1.1 測試通過
- [x] 1.3 補測試與實作：`serializeInitialState` 對空人員清單、無事件、缺日期事件皆回傳合法 state 且不 throw

## 2. 互動腳本核心（exportInteractive.ts）

- [x] 2.1 撰寫 `buildInteractiveScript(state)` 骨架，落實決策「以漸進增強方式將互動層疊加於既有靜態匯出」：開檔時讀取 `#export-state` JSON hydrate，缺少時退回空 state（需求 Embed an interactive layer into the exported HTML）
- [x] 2.2 落實決策「人員名單可自由新增並併入 state」：每事件指派下拉選單以 `state.people` 為來源，輸入框新增姓名並去重（需求 Assign cases to people via a managed people list）
- [x] 2.3 落實決策「今日焦點與人員篩選為純前端 DOM 切換」：篩選列（全部／各人員）切換事件顯示，依開檔當下本機日期高亮今日分組（需求 Filter the calendar by person and highlight today）
- [x] 2.4 實作完成打勾：狀態寫入該檔 `localStorage`，`localStorage` 不可用時退化為當次 session 有效且不 throw（需求 Toggle completion state per event）
- [x] 2.5 落實決策「「下載已指派版本」以 inline JSON 重新序列化整份檔案」：以最新 state 覆寫 `#export-state` 後序列化 `documentElement.outerHTML`，以 Blob 觸發下載新檔（需求 Persist assignments by downloading an assigned version）

## 3. 注入既有匯出（htmlExport.ts）

- [x] 3.1 在 src/lib/cases/htmlExport.ts 的時程事件渲染加上穩定 `data-event-id`、`data-event-date`、`data-case-id` 屬性，供互動層綁定，且與 exportInteractive 的事件 ID 規則一致
- [x] 3.2 在 `buildCasesHtml()` 於 `</body>` 前注入 `<script type="application/json" id="export-state">` 與 `buildInteractiveScript()`，維持單一自包含 HTML、無外部資源
- [x] 3.3 補互動 UI 所需 inline CSS（篩選列、指派下拉、完成樣式、今日高亮），沿用既有藍色配色與既有三區塊版面不變

## 4. 驗證

- [x] 4.1 補 `buildCasesHtml` 測試：輸出含 `#export-state` 節點與互動 `<script>`，且仍不含 `src="http`、`href="http`、`@import`（自包含不被破壞）
- [x] 4.2 執行 `yarn test -- --testPathPatterns=exportInteractive` 與 htmlExport 測試全綠，並 `yarn lint` 通過
- [x] 4.3 手動驗證流程：瀏覽器開檔→新增人員→指派事件→人員篩選→今日高亮→完成打勾→下載已指派版本→於另一瀏覽器設定重新開檔，確認人員與指派仍在
