## Context

案件匯出 HTML 由 src/lib/cases/htmlExport.ts 產生，所有樣式集中在模組常數 INLINE_CSS（單一 `<style>`，無外部資源）。互動層由 exportInteractive.ts 在 runtime 注入節點，這些節點一律帶 class `export-ui`（toolbar、`.export-view-switch`、`.export-assignee`、`.export-done`、徽章、`.week-agenda` 容器）。靜態輸出含三區：`.section` 包住的承辦中表格、備忘錄（`.memo-card`）、時程（`.timeline-list` 內 `.timeline-day` 分組 + `.timeline-item`）。

目前 INLINE_CSS 無任何 `@media print`。部分使用者把匯出檔印成紙本，直接列印會印出互動控制項、因瀏覽器去背景而丟失分組界線、並在換頁處切斷區塊。本變更只新增列印樣式，不動螢幕樣式與互動腳本。

約束：維持單一自包含 HTML、無外部資源；不改螢幕顯示與既有互動行為；不新增 UI。

## Goals / Non-Goals

**Goals:**

- 列印（`@media print`）時隱藏所有 `.export-ui` 注入節點，紙本只剩內容。
- 全印：表格、備忘錄、時程三區皆輸出。
- 大面積區分改用邊框 + 粗體（表頭、`.timeline-day` 分組、卡片），不依賴底色。
- 關鍵小標示（今天 `.timeline-day-today`、警示 `.memo-warning`）以 `print-color-adjust: exact` 保留底色。
- 避免換頁切斷（`break-inside: avoid`），表格跨頁重複表頭。
- 以 `@page` 邊距取代螢幕用的 `body { padding: 2rem }`。

**Non-Goals:**

- 不新增列印按鈕或任何 UI；使用瀏覽器內建列印。
- 不做分區列印開關。
- 不改 Excel 匯出、螢幕版面、互動腳本行為。
- 不為週曆檢視做紙本特別裁切。
- 不引入外部列印字型或資源。

## Decisions

### 列印樣式以 INLINE_CSS 末端的 @media print 區塊實作

在現有 INLINE_CSS 字串末端追加單一 `@media print { ... }` 區塊，沿用既有 class 選擇器覆寫。
**理由**：維持單一自包含 `<style>`、單一真相；列印規則僅在列印情境生效，零螢幕副作用。
**替代方案**：另開獨立 `<style media="print">`——否決，與現有單一 INLINE_CSS 慣例不一致、徒增分散。

### 列印時以 .export-ui 一鍵隱藏所有互動節點

列印規則用 `.export-ui { display: none !important }` 隱藏全部 runtime 注入節點。
**理由**：互動層注入節點已統一帶 `export-ui`（與下載已指派版本的剝除機制同源），單一選擇器即涵蓋 toolbar／切換鈕／下拉／checkbox／徽章／週曆容器，無需逐一列舉、未來新增互動節點自動沿用。
**替代方案**：逐一列舉各互動 class——否決，易漏、維護成本高。

### 大面積底色改邊框+粗體，關鍵小標示用 print-color-adjust 保留底色

表頭 `th`、`.timeline-day` 分組、`.memo-card`、`.timeline-list` 在列印時移除底色／陰影、改用邊框與粗體；`.timeline-day-today`、`.memo-warning` 等小範圍標示加 `print-color-adjust: exact`（含 `-webkit-print-color-adjust`）保留底色。
**理由**：瀏覽器列印預設去背景，靠底色區分的界線會在紙上消失；大面積保留底色費墨且多數印表機灰階化後對比差。小範圍關鍵標示值得強制保留以維持可辨識性。
**替代方案 A**：全部強制 `print-color-adjust: exact`——否決，費墨且灰階列印對比不佳。
**替代方案 B**：全部去背景不保留任何標示——否決，今天／警示在紙本無從辨識。

### 用 break-inside: avoid 與 thead 重複表頭控制分頁

`.section`、`.timeline-day` 與其後事件、`.memo-card`、表格 `tr` 加 `break-inside: avoid`；表格 `thead { display: table-header-group }` 使跨頁重複表頭。
**理由**：避免日期 header 落在頁尾而事件跑到次頁、卡片被腰斬；長表格跨頁時每頁都有欄位名。
**替代方案**：不處理分頁——否決，紙本可讀性差。

## Implementation Contract

**Behavior（使用者可觀察）：**

- 在瀏覽器列印預覽（或印出紙本）時：看不到 toolbar、條列/週曆切換鈕、承辦人下拉、完成 checkbox、任何承辦徽章。
- 表格、備忘錄、時程三區內容皆出現於紙本。
- 表頭、時程日期分組、備忘錄卡片即使在去背景列印下，仍以邊框 + 粗體清楚分隔。
- 「今天」的日期分組與警示備註在紙本仍保留底色標示。
- 換頁時，日期分組 header 不與其事件分離、備忘錄卡片不被腰斬；長表格每頁重複欄位表頭。
- 螢幕顯示與互動行為完全不變。

**Interface / data shape：**

- 僅修改 src/lib/cases/htmlExport.ts 的 INLINE_CSS 常數內容（追加 `@media print` 區塊）。無新增匯出函式、無 API 變更、無 DOM 結構變更。
- 列印區塊只用既有 class 選擇器（`.export-ui`、`.section`、`th`、`.timeline-day`、`.timeline-day-today`、`.timeline-item`、`.memo-card`、`.memo-warning`、`.timeline-list` 等）。

**Failure modes：**

- 印表機／瀏覽器忽略 `print-color-adjust`：關鍵標示底色可能不顯示，但邊框/粗體仍保留分隔，內容不遺失。
- JavaScript 關閉（未注入互動層）：本就無 `.export-ui` 節點，列印規則為無害空操作；三區靜態內容照印。

**Acceptance criteria：**

- htmlExport 測試（src/lib/cases/__tests__/htmlExport.test.ts）新增案例驗證 `buildCasesHtml` 輸出的 INLINE_CSS 含 `@media print`、含 `.export-ui` 隱藏規則（`display: none`）、含 `break-inside: avoid`、含 `print-color-adjust`／`-webkit-print-color-adjust`，且仍自包含（無 `src="http`、`href="http`、`@import`）。
- 既有 htmlExport 與 exportInteractive 測試維持全綠（螢幕行為不回歸）。
- `yarn lint` 通過。

**Scope boundaries：**

- In scope：INLINE_CSS 新增 `@media print` 區塊、對應 htmlExport 單元測試。
- Out of scope：exportInteractive.ts、螢幕樣式、Excel 匯出、任何 UI 按鈕、DB／伺服器端、週曆紙本特別裁切。

## Risks / Trade-offs

- [使用者未開「背景圖形」選項時，強制保留底色的關鍵標示仍可能不印] → 以邊框/粗體作為底線備援，標示意義不只靠底色。
- [`@page` 邊距與既有 `body padding` 疊加造成邊距過大] → 列印規則內將 `body { padding: 0 }` 重置，邊距交由 `@page` 控制。
- [`break-inside: avoid` 在超長單一群組（事件極多的一天）可能造成大量留白] → 僅對群組容器避免切斷，個別事件仍可跨頁；實務上單日事件數有限。

## Migration Plan

1. 實作並通過測試後，先 archive 基準變更 add-cases-html-export（本變更 MODIFIED 基準），再 archive 本變更。
2. 無資料庫遷移、無設定變更；僅影響匯出檔列印呈現。
