## Context

既有 `src/lib/cases/htmlExport.ts` 的 `buildCasesHtml()` 產生單一自包含 HTML，含三區塊：承辦中表格、備忘錄、時程（時程已是逐日分組的詳細事件列表）。此檔目前**純靜態唯讀**、無 `<script>`、可離線以 `file://` 開啟。

需求情境是「代書出門、把案件交接給協助者」：協助者**沒有系統帳號**，只會收到一份檔案。因此互動能力必須完全內嵌於匯出檔，不得依賴後端、登入或網路。最大難點是**指派狀態要能隨檔案傳遞**——若只存瀏覽器 `localStorage`，把檔案寄給協助者後對方會看到空白指派。

## Goals / Non-Goals

**Goals:**

- 匯出檔可在瀏覽器內指派承辦人、依人員篩選、標示今日焦點、勾選完成。
- 指派與人員名單可透過「下載已指派版本」**寫入新檔**，使狀態隨檔案傳遞。
- 維持單一自包含 HTML、inline 資源、`file://` 可開、離線可用。
- 既有三區塊的版面與資料不變，互動層為加值疊加（漸進增強）。

**Non-Goals:**

- 不回寫系統/資料庫，不做跨檔案狀態合併同步。
- 不新增帳號/團隊模型，不改 RLS 或 schema。
- 不改 Excel 匯出。

## Decisions

### 以漸進增強方式將互動層疊加於既有靜態匯出

新增 `src/lib/cases/exportInteractive.ts`，匯出兩個純函式：`buildInteractiveScript(state)`（產生內嵌 `<script>` 字串）與 `serializeInitialState(events)`（把事件清單轉為初始 state JSON）。`buildCasesHtml()` 在時程區塊渲染後，於 `</body>` 前注入該 `<script>` 與一個 `<script type="application/json" id="export-state">` 狀態節點。靜態 HTML 在無 JS 環境仍可閱讀；JS 載入後才接管互動。
**替代方案**：直接在 `htmlExport.ts` 內聯所有邏輯——否決，會讓該檔過大且難測試（違反元件/檔案大小規範）。

### 指派與完成狀態以穩定事件 ID 為鍵

每筆時程事件產生穩定 ID `${caseId}::${fieldKey}`（待辦為 `${caseId}::todo::${todoId}`），與畫面 `useTimelineHub` 的 `id` 規則一致。state 結構為 `{ people: string[], assignments: Record<eventId, person>, done: Record<eventId, boolean> }`。以穩定 ID 為鍵可確保「下載已指派版本」後重新開檔仍能對應回同一事件。
**替代方案**：以陣列索引為鍵——否決，事件順序或資料變動會錯位。

### 「下載已指派版本」以 inline JSON 重新序列化整份檔案

互動層維護的 state 變更時更新記憶體物件；按「📥 下載已指派版本」時，讀取目前 `document` 的 outerHTML，將 `#export-state` 節點內容替換為最新 state JSON，再以 `Blob` 觸發下載新 `.html`。開檔時 `buildInteractiveScript` 先讀 `#export-state` 內容 hydrate；若不存在則用空 state。如此指派狀態隨檔案傳遞，協助者開檔即見指派。
**替代方案**：僅用 `localStorage`——否決，狀態不隨檔案走，違反核心需求。

### 人員名單可自由新增並併入 state

提供輸入框新增承辦人姓名（存入 `state.people`，去重）；指派下拉選單以 `state.people` 為來源。無預設帳號清單，符合「協助者多無帳號」情境。
**替代方案**：固定人員清單——否決，交接對象因人而異。

### 今日焦點與人員篩選為純前端 DOM 切換

篩選列（`全部 / <people>`）與「今日」高亮以 JS 切換事件列的顯示/樣式，不重抓資料。「今日」依開檔當下的本機日期比對事件日期分組標題。
**替代方案**：匯出時固定計算今日——否決，協助者隔天開檔會看到過期的「今日」。

## Risks / Trade-offs

- [協助者各自打勾的完成狀態不會合併回代書端] → 明確為單向交接情境的接受範圍；文件與 UI 提示「此為交接檔，完成狀態僅存本機」。
- [`file://` 下 `localStorage` 在部分瀏覽器受限] → 核心指派狀態靠 inline JSON（隨檔案）而非 `localStorage`，`localStorage` 僅作完成打勾的次要快取，受限時退化為僅當次有效。
- [內嵌 JS 使檔案略增大且需信任來源] → 不引用任何外部資源，CSP/離線友善；JS 體積小（無框架，原生 DOM）。
- [outerHTML 重新序列化可能含使用者編輯殘留] → 下載前以最新 state 覆寫 `#export-state`，並只序列化 `document.documentElement.outerHTML`，不混入執行期暫存。
