## Context

前一變更 `cases-export-case-level-assignment-sync` 已在匯出檔的互動層（`src/lib/cases/exportInteractive.ts` + `src/lib/cases/htmlExport.ts`）建立：案件層級指派、承辦人篩選、徽章、逐事件完成打勾、下載已指派版本。時程區由 `buildTimelineSection` 產生靜態 HTML，結構是「日期分組 header（`.timeline-day`，帶 `data-day`）＋ 多個 `.timeline-item`（帶 `data-event-id`、`data-event-date`、`data-case-id`）」，互動層的篩選 `applyFilter()` 以每個項目的 `data-case-id` 對應 `state.assignments[caseId]` 切換 `.timeline-item` 顯示，並用 `refreshDayHeaders()` 隱藏空的日期 header。

目前時程只有條列式（list）：把所有未來事件由近到遠排成一條長清單。交接與週會需要「以週為單位」掌握每天負載，條列式看不出週邊界與每日分布。本變更在時程區加入「條列 / 週曆」檢視切換，並新增週曆／議程式檢視。

約束：維持單一自包含 HTML、無外部資源；JavaScript 關閉時時程區維持現有條列式靜態內容；既有篩選、徽章、完成打勾、當日標示行為一致沿用。

## Goals / Non-Goals

**Goals:**

- 時程區由互動層注入「條列 / 週曆」檢視切換，預設條列式。
- 週曆／議程式檢視：以週為單位（週一為一週起點）的時間軸，逐日一列；每列顯示該日所有事件（沿用 `.timeline-item` 既有圖示／標籤／案號／當事人／內容／完成樣式）。當日（開檔當天本地日期）醒目標示；無事件的日子顯示空列。
- 週曆檢視沿用案件層級承辦人篩選與「承辦：<人名>」徽章：選某人只顯示其案件事件、未指派案件於選特定人員時隱藏；切「全部」還原。
- 逐事件完成打勾（`done[eventId]`）在週曆檢視同樣可用且行為不變。
- JavaScript 關閉時：時程區僅有原條列式靜態內容，無切換鈕、無週曆、無殘留控制項。

**Non-Goals:**

- 不做月曆方格檢視（本次選定週曆／議程式）。
- 不改條列式檢視本身的版面與排序。
- 不新增跨日／多日事件的橫跨顯示；每個事件仍掛在其單一日期。
- 不持久化檢視偏好到 localStorage（檢視選擇為當次有效；完成打勾的 localStorage 快取維持原樣）。
- 不改下載已指派版本的序列化內容（檢視屬於 UI 狀態，不入 `#export-state`）。
- 不回寫 DB／schema、不改 Excel 匯出。

## Decisions

### 週曆資料從現有 DOM 的 `.timeline-item` 重組，不另由 server 產生

週曆檢視由互動層在 runtime 讀取既有 `.timeline-item`（已含 `data-event-date`、`data-case-id`、`data-event-id`）依日期分組重排，動態建立週曆容器；不在 `buildTimelineSection` 多輸出一份週曆靜態 HTML。
**理由**：避免兩份事件 HTML 的重複真相與體積膨脹；JS 關閉時自然只剩條列式靜態內容，符合漸進增強。
**替代方案**：server 端同時輸出條列與週曆兩份 DOM、用 CSS 切換——否決，重複真相且 JS 關閉會殘留空週曆骨架。

### 檢視切換以容器層級顯示切換，週曆容器為注入節點（class `export-ui`）

互動層在時程區 `.timeline-list` 之前注入一個檢視切換列（`export-ui`），並注入一個週曆容器（`export-ui`）。切到「週曆」時隱藏 `.timeline-list`、顯示週曆容器；切回「條列」相反。週曆容器與切換列皆 class `export-ui`，下載已指派版本時連同其他注入節點一併移除，重開後再由腳本重建。
**理由**：沿用既有 `.export-ui` 移除機制，下載檔不殘留 runtime 專屬節點；與現有 toolbar/badges 一致。
**替代方案**：直接改寫 `.timeline-list` 內部 DOM——否決，破壞 JS 關閉時的條列式靜態內容。

### 週曆檢視沿用同一份 `state` 與 `applyFilter`，依事件的 `data-case-id` 連動

週曆中每個事件節點同樣帶 `data-case-id`、`data-event-id`。`applyFilter()` 擴充為同時對條列 `.timeline-item` 與週曆事件節點套用相同的 `isCaseVisible(caseId)` 判斷；切換檢視或變更指派時，當前可見檢視即時反映。完成打勾沿用 `state.done[eventId]`，週曆事件的 checkbox 與條列共用同一 `eventId` 鍵。
**理由**：單一真相（`state`），三區與兩種時程檢視一致；避免各檢視各存一份狀態。
**替代方案**：週曆獨立一套篩選狀態——否決，與案件層級單一真相衝突。

### 週起點為週一，當日以本地開檔日期判定

週分組以週一為一週起點（與台灣週會習慣一致），日期標示沿用既有 `todayKey()`（本地開檔日期，非匯出時固定值）。週曆只顯示「從本週起、涵蓋現有未來事件範圍」的週；事件範圍沿用條列式既有「未來事件」集合，不額外擴增過去週。
**理由**：與條列式同一事件集合，避免兩檢視內容不一致。
**替代方案**：固定顯示前後 N 週——否決，可能出現與條列式不一致的空白範圍。

## Implementation Contract

**Behavior（使用者可觀察）：**

- 時程區出現「條列 / 週曆」切換；預設為條列式，與現況相同。
- 切到「週曆」：時程改以週為單位、逐日一列顯示；每列含當天所有事件，事件呈現（圖示／標籤／案號／當事人／內容／完成樣式）與條列式一致；當日該列醒目標示；無事件的日子為空列。
- 在任一檢視變更指派或點篩選人員時，當前可見檢視只顯示該人案件之事件、未指派案件於選特定人員時隱藏；切「全部」還原。兩種檢視對同一份指派狀態反應一致。
- 在週曆檢視勾選某事件完成，與條列式勾選同一事件等效（共用 `eventId`），完成樣式與 localStorage 快取行為不變。
- JavaScript 關閉：時程區只有原條列式靜態內容，無切換鈕、無週曆容器、無徽章或控制項殘留。

**Interface / data shape：**

- 互動 `<script>` 內新增（內部函式，不對外匯出）：建立檢視切換列與週曆容器、`renderWeekAgenda()`（由 `.timeline-item` 重組）、`setView('list' | 'week')`。
- `applyFilter()` 擴充為同時套用至條列 `.timeline-item` 與週曆事件節點，判斷沿用 `isCaseVisible(caseId)`。
- 週曆事件節點帶 `data-case-id`、`data-event-id`（與條列事件相同鍵空間），完成沿用 `state.done[eventId]`。
- `ExportState` 結構不變（`people` / `assignments` 以 caseId 為鍵 / `done` 以 eventId 為鍵）；檢視選擇不進 `#export-state`、不進 localStorage。
- 切換列、週曆容器與其內注入節點 class 一律含 `export-ui`。

**Failure modes：**

- JavaScript 關閉：如上，僅條列式靜態內容。
- 無未來事件（時程為空）：週曆檢視顯示空狀態或空週列，不丟例外；切換鈕仍可運作或在無事件時可不顯示週曆切換（擇一，於 tasks 決定並測試）。
- `#export-state` 缺失或 localStorage 不可用：沿用前一變更行為（空狀態 / 完成打勾當次有效），週曆檢視不受額外影響。

**Acceptance criteria：**

- `yarn test -- --testPathPatterns=exportInteractive` 與 htmlExport 測試全綠；新增整合測試（jsdom）涵蓋：切到週曆顯示逐日分組、當日列標示、週曆事件沿用承辦人篩選（選人隱藏他人與未指派）、週曆事件完成打勾等效於條列、JS 關閉（不執行腳本）時無 `export-ui` 節點。
- `buildCasesHtml` 測試確認時程區靜態輸出仍為條列式、無外部資源（無 `src="http`、`href="http`、`@import`），週曆相關樣式為 inline CSS。
- `yarn lint` 通過。

**Scope boundaries：**

- In scope：`exportInteractive.ts`（檢視切換、週曆渲染、`applyFilter` 擴充）、`htmlExport.ts`（週曆／議程 inline CSS、必要時的 data 屬性）、對應整合與單元測試。
- Out of scope：月曆方格檢視、條列式版面變更、跨日事件橫跨、檢視偏好持久化、下載序列化內容變更、任何 DB／Excel／伺服器端變更。

## Risks / Trade-offs

- [週曆由 runtime 重組 DOM，事件多時有渲染成本] → 事件集合即現有未來事件（通常數十筆內），單次重排成本可忽略；只在切到週曆或篩選變更時重渲染。
- [前一變更 `cases-export-case-level-assignment-sync` 尚未 archive，其 spec 為本變更 MODIFIED 基準] → archive 順序須前者先行；於 Migration 標明。
- [週曆事件節點與條列事件共用 `eventId`，需避免重複 DOM id 衝突] → 不使用 HTML `id` 屬性綁定，改用 `data-event-id` 與 class 查詢；完成狀態以 `state.done[eventId]` 為唯一真相，渲染時同步兩檢視。
- [無事件日的空列可能拉長頁面] → 僅渲染涵蓋現有未來事件的週範圍，不無限延伸。

## Migration Plan

1. 實作並通過測試後，先 archive 前一變更 `cases-export-case-level-assignment-sync`（本變更 MODIFIED 基準），再 archive 本變更。
2. 無資料庫遷移、無設定變更；功能僅影響匯出檔互動層。
