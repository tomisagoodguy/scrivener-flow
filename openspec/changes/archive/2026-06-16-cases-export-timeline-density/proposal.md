## Summary

重構匯出 HTML 時程區的兩種檢視版面以提高資訊密度：週曆改成真正的 7 欄月曆方格、條列改成兩欄並排日群組。

## Motivation

目前匯出檔時程區兩種檢視都很浪費空間：

- **週曆檢視**：一天一整列，空白日（無事件的日子）也佔滿整列，整頁大半留白，完成勾選又被推到列最右緣。
- **條列檢視**：每列只用左側一小段、右側一大片留白，列高 padding 偏大；縱向很快滾很長。

代書把時程印出或交接時，希望一眼看到更多進度、減少翻頁與滾動。需要在不改變資料與既有互動機制的前提下，純版面重構以提高密度。

## Proposed Solution

兩項版面重構，皆在 `src/lib/cases/htmlExport.ts`（靜態結構 + INLINE_CSS）與 `src/lib/cases/exportInteractive.ts`（互動層注入）內完成：

1. **週曆 → 7 欄月曆方格**：以「週一～週日」為 7 欄、每週一列的格狀排版（CSS grid）。每格代表一天，格內以緊湊事件 chip 呈現（圖示＋里程碑類別＋案號＋承辦下拉＋完成勾選整合在 chip 內，不再甩到列最右）。空白日只佔一個小方格，不再整列。今日格高亮。涵蓋本週到最後一筆事件所在週。

2. **條列 → 兩欄並排日群組**：日群組（含「明天／N 天後／日期」標頭與其事件列）以兩欄並排（CSS grid，二欄），左右兩欄交錯擺放不同日群組以利用橫向寬度、使縱向高度約減半；同時縮小列 padding 與字距以提高密度。承辦＋完成控制組維持在事件列左側（沿用目前工作區未提交微調的方向）。

兩種檢視沿用既有機制：互動層注入節點一律帶 `export-ui`；列印時 `export-ui` 隱藏；「下載已處理版本」剝除 `export-ui` 並序列化 `#export-state`；承辦人指派、完成狀態（per-event）、人員篩選、今日高亮、收合等狀態與行為不變。

## Non-Goals (optional)

- 不改主 App（`/cases` 等頁面），僅作用於匯出的 HTML 檔。
- 不動表格區、備忘錄區，不改 Excel 匯出。
- 不改變時程事件的資料來源、收集邏輯（`collectTimelineEvents`）、排序規則、escape 與 `#export-state` 結構。
- 不改承辦人指派 / 完成 / 篩選 / 今日高亮 / 收合等既有互動「行為」，僅改其「版面呈現」。
- 不引入外部資源（CSS framework、字型、圖庫）；維持單一自包含 HTML。
- 台股紅漲綠跌色彩慣例不適用此區（此為案件時程，非投資漲跌）。

## Alternatives Considered (optional)

- **週曆只移除空白日（不做方格）**：較簡單但失去連續日期的日曆感，且仍是一維長條；已否決，使用者選擇真正的月曆方格。
- **條列只縮行高（不分欄）**：密度提升有限，右側留白仍在；已否決，使用者選擇兩欄並排。

## Impact

- Affected specs: 修改 `cases-html-export`
- Affected code:
  - Modified:
    - src/lib/cases/htmlExport.ts
    - src/lib/cases/exportInteractive.ts
    - src/lib/cases/__tests__/htmlExport.test.ts
    - src/lib/cases/__tests__/exportInteractive.test.ts
  - New: (none)
  - Removed: (none)
