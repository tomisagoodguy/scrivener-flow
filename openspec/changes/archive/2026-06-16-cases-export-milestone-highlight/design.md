## Context

匯出 HTML 由 `src/lib/cases/htmlExport.ts` 產生靜態三區（表格、備忘錄、時程），由 client 端的 `src/components/features/cases/ExportHtmlButton.tsx` 透過點擊呼叫 `buildCasesHtml(cases)` 後下載。主 App `/cases` 表格中，里程碑（簽印稅過交）以 `src/components/shared/ExcelStep.tsx` 渲染、稅單性質與預收規費以 `src/components/shared/HighlightableValue.tsx` 渲染；兩者點擊都會切換黃底（`bg-amber-200 text-amber-900 border-amber-300`），狀態寫入 localStorage：

- 里程碑：`highlight_<caseId>_<簽|印|稅|過|交>`（label 為單一中文字，與 `htmlExport.ts` 的 `MILESTONE_STEPS` label 相同）
- 稅單性質：`highlight_<caseId>_tax_type`
- 預收規費：`highlight_<caseId>_pre_fee`

匯出當下在瀏覽器執行，故讀得到這些 localStorage。目前匯出檔完全不帶高亮：表格 里程碑日期欄是 `buildMilestoneDates` 串接的單一字串（無法個別上色）、稅單性質欄只顯示 `taxType`（未顯示預收規費）、時程事件無高亮樣式。月曆檢視的事件 chip 由 `src/lib/cases/exportInteractive.ts` 的 `makeWeekEvent` 於 runtime 從 `.timeline-item` clone 重建。

## Goals / Non-Goals

**Goals:**

- 匯出當下讀取 localStorage 高亮狀態，於匯出檔的表格與時程兩處以黃底快照呈現按匯出者所點的高亮。
- 高亮涵蓋：簽/印/稅/過/交里程碑、稅單性質、預收規費。
- 列印時黃底不被去背景（`print-color-adjust: exact`）。
- 維持單一自包含 HTML、不外連、不改既有資料/排序/escape 與既有互動行為。

**Non-Goals:**

- 不寫入 DB、不跨裝置同步；匯出檔為「按匯出鈕者的本機高亮快照」。
- 匯出檔內高亮為唯讀，不提供點擊切換。
- 不改 `ExcelStep`/`HighlightableValue` 的行為與 localStorage key 結構。

## Decisions

### 高亮狀態以 caseId→token 陣列的純資料 map 傳入匯出

定義 `CaseHighlightMap = Record<string, string[]>`（caseId → 已高亮 token 陣列；token ∈ `簽`/`印`/`稅`/`過`/`交`/`tax_type`/`pre_fee`）。`buildCasesHtml(cases, exportedAt, highlights)`、`buildTableSection(cases, highlights)`、`buildTimelineSection(cases, now, highlights)` 皆新增 `highlights` 參數，預設 `{}`（向後相容，無高亮時行為與現況一致）。
**理由**：純資料 map 與 DOM/localStorage 解耦，讓 `build*` 函式可在不依賴瀏覽器的 jsdom/node 單元測試中直接驗證上色邏輯。
**替代方案**：在 `build*` 內直接讀 localStorage——否決，污染純函式、難測且耦合瀏覽器環境。

### localStorage 讀取集中在可注入的 collector，於匯出按鈕呼叫

於 `htmlExport.ts` 新增 `collectCaseHighlights(cases, read?)`，逐案逐 token 組裝 `CaseHighlightMap`；`read` 參數預設為「以 `typeof window !== 'undefined'` 守衛的 `localStorage.getItem`」，測試可注入假 `read`。`ExportHtmlButton.handleExport` 在呼叫 `buildCasesHtml` 前先呼叫 `collectCaseHighlights(cases)` 並把結果傳入。
**理由**：把唯一的瀏覽器副作用（讀 localStorage）收斂到一個可注入函式，其餘皆純函式；按鈕只多一行。
**替代方案**：在按鈕內 inline 讀取所有 key——否決，邏輯散落且無法單元測試 token 對應。

### 表格里程碑欄拆成可個別上色的 token，稅單欄附預收規費 token

表格 里程碑日期欄改由新 helper 產生每個里程碑的 `<span class="ms-token">簽 6/01</span>`，被高亮者加 `export-hl` class。稅單性質欄的 `taxType` 包成可加 `export-hl` 的 token；若該案有預收規費，於同欄附一個 `預收 N萬` 的 `export-hl`-able token（對應主 App 該欄同時顯示稅單與預收）。所有值仍經 `escapeHtml`。
**理由**：唯有把串接字串拆成 token、並讓預收規費可見，才能各別套用 `tax_type`/`pre_fee`/里程碑高亮。
**替代方案**：整欄上色——否決，無法精準標示是哪個里程碑/欄位被點。

### 時程事件以里程碑欄位鍵對應高亮 token，月曆 chip 由 list item 傳遞

`buildTimelineSection` 對每個事件，由其里程碑欄位鍵（`contract_date`→簽、`seal_date`→印、`tax_payment_date`→稅、`transfer_date`→過、`handover_date`→交）映射 token；`highlights[caseId]` 含該 token 時，`.timeline-item` 加 `export-hl` class。非里程碑事件（約定、稅務期限、待辦）無對應高亮、不上色。月曆方格的 chip 由 `exportInteractive.ts` 的 `makeWeekEvent` 從 `.timeline-item` 重建，故在 list item 加 `data-hl="1"`，`makeWeekEvent` 讀到時為 `.week-event` 加 `export-hl` class。
**理由**：里程碑事件的 `eventId`＝`caseId::fieldKey`，可穩定對應 ExcelStep 的 token；用 `data-hl` 讓 runtime 重建的 chip 不必重算對應、單一事實來源在靜態 DOM。
**替代方案**：在 `makeWeekEvent` 重新比對 highlights——否決，highlights map 未注入互動層，且會重複對應邏輯。

### 共用 `export-hl` 樣式並於列印保留黃底

INLINE_CSS 新增單一 `.export-hl { background: #fde68a; color: #78350f; border-color: #fcd34d; }`（對應 amber-200/900/300），供里程碑 token、稅單/預收 token、時程 `.timeline-item`/`.week-event` 共用。`@media print` 將 `.export-hl` 併入既有「關鍵小標示保留底色」群組（與 `.timeline-day-today`、`.memo-warning` 並列），加 `print-color-adjust: exact` 與 `-webkit-` 前綴。
**理由**：單一語意 class 降低重複、列印一致；沿用既有列印保色機制。
**替代方案**：各處用不同 class——否決，重複且難維護。

## Implementation Contract

**Behavior（使用者可觀察）：**

- 在 `/cases` 點黃了某些里程碑/稅單/預收後按「匯出 HTML」：開啟匯出檔，表格中被點黃的 簽/印/稅/過/交里程碑、稅單性質、預收規費顯示黃底；未點的維持原色。
- 時程區（條列與月曆）中，對應被點黃里程碑的事件顯示黃底；非里程碑事件不受影響。
- 沒有任何高亮時，匯出檔外觀與目前一致（黃底不出現）。
- 列印（Ctrl+P）：黃底標記仍印在紙上；`export-ui` 控制項仍不出現。
- 高亮反映按匯出鈕者的本機 localStorage；換人匯出可能不同，屬預期。

**Interface / data shape：**

- `CaseHighlightMap = Record<string, string[]>`，token ∈ `簽`/`印`/`稅`/`過`/`交`/`tax_type`/`pre_fee`。
- `collectCaseHighlights(cases: DemoCase[], read?: (key: string) => string | null): CaseHighlightMap`。
- `buildCasesHtml(cases, exportedAt?, highlights?: CaseHighlightMap)`、`buildTableSection(cases, highlights?)`、`buildTimelineSection(cases, now?, highlights?)`；`highlights` 預設 `{}`。
- 靜態 DOM：表格里程碑 token 為 `.ms-token`，被高亮者加 `.export-hl`；時程被高亮 `.timeline-item` 加 `.export-hl` 與 `data-hl="1"`；月曆 `.week-event` 在重建時加 `.export-hl`。

**Failure modes：**

- 非瀏覽器環境（SSR / 測試未注入 read）：`collectCaseHighlights` 回傳 `{}`，匯出無高亮、不報錯。
- localStorage 取值非 `'true'`：視為未高亮。
- 某 caseId 無任何高亮 key：該案不上色。

**Acceptance criteria：**

- htmlExport 單元測試：給定 `highlights` map，`buildTableSection` 把對應里程碑 token 與稅單/預收 token 加 `export-hl`；未列入者不加。`buildTimelineSection` 對被高亮里程碑事件的 `.timeline-item` 加 `export-hl`＋`data-hl="1"`；非里程碑事件不加。`buildCasesHtml` 仍自包含（無 `src="http`、`href="http`、`@import`）。`@media print` 內 `.export-hl` 具 `print-color-adjust: exact`。空 `highlights` 時無 `export-hl`。
- `collectCaseHighlights` 測試：注入假 read（回傳特定 key 為 `'true'`）時，產生正確的 caseId→token 陣列；其餘為空。
- exportInteractive 整合測試：list item 帶 `data-hl="1"` 者切到月曆後其 `.week-event` 具 `export-hl`；未帶者無。
- 既有 htmlExport / exportInteractive 測試維持全綠；`yarn lint` 通過。

**Scope boundaries：**

- In scope：`htmlExport.ts`（`collectCaseHighlights`、里程碑 token 化、稅單/預收 token、時程 `export-hl`＋`data-hl`、INLINE_CSS `.export-hl` 與列印保色）、`exportInteractive.ts`（`makeWeekEvent` 傳遞 `export-hl`）、`ExportHtmlButton.tsx`（呼叫 collector 並傳入）、對應單元與整合測試。
- Out of scope：主 App `ExcelStep`/`HighlightableValue` 行為與 key 結構、備忘錄區、Excel 匯出、把高亮寫入 DB、匯出檔內可點擊切換高亮。

## Risks / Trade-offs

- [預收規費原本不在匯出表格，新增顯示等於多露一欄資訊] → 可接受；與主 App 該欄一致，且為「全部帶高亮」的必要前提（不可見就無法高亮）。
- [高亮是本機快照，不同人匯出結果不同] → 屬預期；於 proposal/Non-Goals 已明示，符合「代書點好再匯出給同事」情境。
- [里程碑 token 化改變表格里程碑欄 DOM，既有斷言可能需微調] → 既有測試僅斷言里程碑文字存在，token 仍含同文字；如有受影響於 tasks 一併調整。
- [月曆 chip 經 `data-hl` 傳遞，若 list item 未帶屬性則 chip 無高亮] → 由靜態 DOM 單一來源決定，邏輯一致。

## Migration Plan

1. 先改 `htmlExport.ts`（collector＋token 化＋時程 `export-hl`＋INLINE_CSS／列印）並過 htmlExport 單元測試。
2. 再改 `exportInteractive.ts`（`makeWeekEvent` 傳遞 `export-hl`）並過整合測試。
3. 最後在 `ExportHtmlButton.tsx` 串接 collector 並傳入 `buildCasesHtml`。
4. 無資料庫遷移、無設定變更；僅影響匯出檔。舊匯出檔不受影響。
5. Rollback：還原三檔即可；`highlights` 參數有預設值，向後相容。

## Open Questions

(none)
