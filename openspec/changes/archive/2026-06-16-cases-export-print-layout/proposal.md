## Why

部分使用者不用電子檔，會把匯出的 HTML 列印成紙本帶在身上。目前匯出檔（src/lib/cases/htmlExport.ts 的 INLINE_CSS）完全沒有 `@media print` 樣式，直接列印會有三個問題：互動層控制項（篩選列、檢視切換鈕、承辦人下拉、完成 checkbox）一併印出變成紙上雜訊；表頭與里程碑分組靠底色區分，但瀏覽器列印預設去背景，導致界線與「今天」標示在紙上消失；區塊與日期群組在換頁處被切斷。需要一份針對紙本的列印樣式。

## What Changes

- 在 INLINE_CSS 末端新增 `@media print` 區塊，僅影響列印，不改變螢幕顯示與既有互動行為。
- 列印時隱藏所有 `.export-ui` 互動層注入節點（toolbar、`.export-view-switch` 檢視切換鈕、`.export-assignee` 承辦人下拉、`.export-done` 完成 checkbox、徽章等）；尚未顯示的週曆容器（`display:none`）自然不印。
- 全印：表格、備忘錄、時程三區皆保留輸出。
- 大面積底色（表頭 `#eff6ff`、`.timeline-day` 分組灰底、`.memo-card` / `.timeline-list` 陰影與圓角）在列印時改用邊框 + 粗體呈現，避免瀏覽器去背景後界線消失，並省墨。
- 小範圍關鍵標示（`.timeline-day-today` 今天、`.memo-warning` 警示等）以 `print-color-adjust: exact`（含 `-webkit-` 前綴）保留底色，確保紙本仍可辨識。
- 加 `break-inside: avoid` 於 `.section`、`.timeline-day` 與其後事件群組、`.memo-card`、表格列，避免換頁切斷；表格以 `thead { display: table-header-group }` 跨頁重複表頭。
- 以 `@page { margin }` 設定列印邊距，列印時移除螢幕用的 `body { padding: 2rem }`。

## Non-Goals

- 不新增「列印」按鈕或任何 UI；使用者用瀏覽器內建列印（Ctrl+P）即可。
- 不做分區列印（只印時程或只印表格）；本次決定全印。
- 不改 Excel 匯出、不改螢幕版面、不改互動腳本（exportInteractive.ts）的行為。
- 不為週曆／議程式檢視做特別的紙本裁切（維持列印當下使用者所在檢視的內容）。
- 不引入任何外部資源或列印專用字型，維持單一自包含 HTML。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cases-html-export`: 新增「匯出檔提供紙本列印版型」需求——列印時隱藏互動控制項、以邊框/粗體取代大面積底色、關鍵標示保留底色、避免換頁切斷並重複表頭。

## Impact

- Affected specs: 修改 `cases-html-export`（基準 spec 位於尚未 archive 的前一變更 add-cases-html-export，archive 順序須前者先行）
- Affected code:
  - New: (none)
  - Modified:
    - src/lib/cases/htmlExport.ts
    - src/lib/cases/__tests__/htmlExport.test.ts
  - Removed: (none)
