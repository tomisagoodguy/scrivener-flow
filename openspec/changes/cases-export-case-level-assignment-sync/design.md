## Context

前一變更 `cases-export-assignable-calendar` 已在匯出檔注入互動層（`src/lib/cases/exportInteractive.ts` + `src/lib/cases/htmlExport.ts`）。目前互動只發生在「時程」區：每筆事件有指派下拉、完成打勾，篩選列依「事件層級」指派（`assignments[eventId]`）切換時程事件顯示，並可「下載已指派版本」。承辦中表格（`buildTableSection`）與備忘錄（`buildMemoSection`）仍為純靜態，未帶任何指派資訊，也不會被篩選列連動。

交接情境下，被指派的協助者切到自己時，只有時程被篩選，表格與備忘錄仍是全部案件且無承辦人標記，三區資訊不一致。使用者要求改為「整案指派一個人」，並讓三區同步顯示、同步篩選、且表格可直接指派。

## Goals / Non-Goals

**Goals:**

- 指派以案件為單位（`caseId`），一案一承辦人；時程事件下拉與表格列下拉讀寫同一份 `assignments[caseId]`，改一處三區同步。
- 承辦中表格列與備忘錄卡片顯示承辦人徽章與（表格）指派下拉，並隨篩選列連動只顯示該人案件。
- 維持單一自包含 HTML、無外部資源、JavaScript 關閉時三區仍可閱讀。
- 逐事件完成打勾（`done[eventId]`）行為與 `localStorage` 快取不變。

**Non-Goals:**

- 不做「一案多承辦人」；整案只有一位。
- 不把完成打勾改為案件層級（仍逐事件）。
- 不回寫系統/資料庫，不改 RLS 或 schema，不改 Excel 匯出。
- 不在備忘錄卡片提供指派下拉（備忘錄只顯示徽章；指派入口為時程事件與表格列）。

## Decisions

### 指派鍵改以案件為單位（caseId）

`assignments` 由 `Record<eventId, person>` 改為 `Record<caseId, person>`。`getExportEventId` 仍用於 `done`（完成打勾）的鍵，但指派改用 `caseId`。時程事件、表格列都以各自的 `data-case-id` 讀寫同一鍵。
**替代方案**：保留逐事件指派、表格取「最近未來事件」的承辦人聚合顯示——否決，使用者明確要求整案一人，逐事件多重指派會讓表格/備忘錄歸屬不明。

### 三區塊共用同一份案件指派狀態

互動層維護單一 `state.assignments`（案件層級）。任一處（時程下拉、表格下拉）變更後，呼叫統一的 `applyAssignment(caseId, person)`，同步更新：所有帶該 `data-case-id` 的時程事件下拉值、表格列下拉值、表格列與備忘錄卡片徽章文字，並重跑篩選。
**替代方案**：各區各自存一份狀態再同步——否決，易產生不一致與重複真相。

### 承辦中表格與備忘錄注入承辦人徽章與篩選連動

`buildTableSection` 的每個 `<tr>` 與 `buildMemoSection` 的每張 `.memo-card` 加 `data-case-id`。互動層為表格列注入「承辦：<人名>」徽章儲存格內容或備忘錄卡片徽章節點（class `export-ui`），並在篩選時依 `state.assignments[caseId]` 切換 `<tr>` 與 `.memo-card` 的顯示。
**替代方案**：在匯出時就把徽章烤進靜態 HTML——否決，徽章內容隨指派變動，必須由互動層動態渲染，且 JS 關閉時不應殘留空徽章。

### 承辦中表格列新增承辦人指派下拉

互動層在表格新增一欄「承辦人」，每列注入 `<select>`（選項來自 `state.people`，含「未指派」），onchange 呼叫 `applyAssignment`。下拉與徽章可並存（下拉為輸入、徽章為唯讀提示）或下拉即顯示當前值；採下拉顯示當前值、另在備忘錄用唯讀徽章。
**替代方案**：表格唯讀只顯示徽章、僅時程可指派——否決，使用者勾選了「表格可直接指派」。

### 篩選連動以案件指派為準，逐事件完成打勾維持以 eventId 為鍵

篩選列（全部／各人員）切換時，對時程事件、表格列、備忘錄卡片一律以其 `data-case-id` 對應的 `state.assignments[caseId]` 判斷顯示；未指派案件在選特定人員時隱藏。完成打勾仍讀寫 `state.done[eventId]`，與指派解耦。
**替代方案**：篩選同時看事件完成狀態——否決，超出需求且混淆語意。

### 下載已指派版本序列化案件層級 assignments

「下載已指派版本」流程不變（clone documentElement、移除 `.export-ui` 注入節點、覆寫 `#export-state`、Blob 下載），但寫入的 `assignments` 為案件層級 `{ [caseId]: person }`。重新開檔時 hydrate 後三區依案件指派還原。
**替代方案**：另存一份事件層級對照——否決，與案件層級單一真相衝突。

## Implementation Contract

**Behavior（使用者可觀察）：**

- 在匯出檔中對任一案件指派承辦人（從時程事件下拉或表格列下拉），該案件的所有時程事件下拉、表格列下拉同步顯示該承辦人，且表格列與備忘錄卡片出現「承辦：<人名>」徽章。
- 篩選列點某人員：只顯示指派給該人的案件之表格列、備忘錄卡片與時程事件；點「全部」還原全部。
- 逐事件完成打勾不受指派影響，行為與快取同前一變更。
- 「下載已指派版本」下載的新檔，重新開檔後三區依案件指派還原承辦人與徽章。

**Interface / data shape：**

- `ExportState.assignments` 型別語意改為「鍵=caseId」（`Record<string, string>`）；`done` 維持「鍵=eventId」。
- `serializeInitialState()` 輸出維持 `{ people: [], assignments: {}, done: {} }`（空狀態，語意上 assignments 以 caseId 為鍵）。
- 互動 `<script>` 提供 `applyAssignment(caseId, person)` 統一進入點（內部函式，不對外）。
- `buildTableSection` 的 `<tr>`、`buildMemoSection` 的 `.memo-card` 皆帶 `data-case-id`；時程事件 `.timeline-item` 維持既有 `data-case-id`、`data-event-id`、`data-event-date`。

**Failure modes：**

- JavaScript 關閉：三區為原靜態內容，無下拉、無徽章、無篩選；不得殘留空白徽章或控制項。
- `#export-state` 缺失或解析失敗：退回空狀態（無人員、無指派）。
- `localStorage` 不可用：完成打勾退化為當次有效、不丟例外（同前一變更）。

**Acceptance criteria：**

- `yarn test -- --testPathPatterns=exportInteractive` 與 htmlExport 測試全綠；新增整合測試涵蓋：表格指派→時程同步、篩選同時連動三區、徽章顯示、下載後重開三區還原（案件層級）。
- `buildCasesHtml` 測試確認表格 `<tr>` 與備忘錄 `.memo-card` 帶 `data-case-id`，且仍無外部資源（無 `src="http`、`href="http`、`@import`）。
- `yarn lint` 通過。

**Scope boundaries：**

- In scope：`exportInteractive.ts`、`htmlExport.ts`（table/memo 加 `data-case-id`、互動層注入表格指派欄/徽章/篩選連動）、對應測試。
- Out of scope：備忘錄卡片內提供指派下拉、一案多承辦人、完成打勾改案件層級、任何 DB/Excel/伺服器端變更。

## Risks / Trade-offs

- [既有逐事件指派狀態語意改變（事件→案件）] → 此功能狀態僅存於匯出檔內、未進 DB；舊匯出檔以事件鍵存的 `assignments` 在新版會被視為未知鍵而忽略（不顯示），屬可接受；新匯出檔一律案件層級。
- [前一變更 `cases-export-assignable-calendar` 尚未 archive，其 spec 為本變更 MODIFIED 的基準] → archive 順序須前者先行；於 Migration/Open Questions 標明，apply 完成後先 archive 前者再 archive 本變更。
- [表格新增「承辦人」欄改變表格欄數] → 欄位由互動層動態注入（class `export-ui`），JS 關閉時表格維持原欄位；下載已指派版本前移除注入節點，避免欄數殘留。
- [備忘錄只顯示徽章、無下拉] → 指派入口集中於時程與表格，符合 Non-Goals；若日後要備忘錄可指派再另開變更。
