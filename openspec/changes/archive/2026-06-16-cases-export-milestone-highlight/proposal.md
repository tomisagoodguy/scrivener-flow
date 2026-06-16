## Why

主 App 的 `/cases` 表格裡，里程碑（簽印稅過交，`ExcelStep`）與「稅單性質」「預收規費」（`HighlightableValue`）都可以點一下標成黃底（`bg-amber-200 text-amber-900`），代書用這個黃色標記「這格要注意 / 已確認」。此高亮存在使用者本機 localStorage（key `highlight_<caseId>_<簽|印|稅|過|交>`、`highlight_<caseId>_tax_type`、`highlight_<caseId>_pre_fee`），不在資料庫。

目前匯出的 HTML 完全不帶這些黃色標記，里程碑全部同色，同事打開匯出檔難以一眼看出哪些里程碑被標注，閱讀體驗差。匯出在瀏覽器執行（`ExportHtmlButton.tsx` → `buildCasesHtml`），匯出當下其實讀得到 localStorage，因此可以把按匯出者所點的高亮烙進匯出檔。

## What Changes

- 匯出時於瀏覽器讀取 localStorage 的高亮狀態，組成「caseId → 已高亮欄位集合」的 map，傳入 `buildCasesHtml`。
- 表格區：里程碑日期欄由單一串接字串改為可個別上色的 簽/印/稅/過/交 token；被高亮的里程碑、被高亮的「稅單性質」、被高亮的「預收規費」顯示黃底。
- 時程區：條列與月曆中，對應到被高亮里程碑的事件顯示黃底（以 caseId + 里程碑類別對應）。
- 列印：黃底加 `print-color-adjust: exact`（含 `-webkit-` 前綴），讓黃色標記印在紙上不被瀏覽器去背景。
- 維持單一自包含 HTML、不外連；不改既有資料來源、事件收集、排序、escape 規則，也不改既有互動行為（承辦指派、完成、篩選、收合、今日高亮、下載已處理版本）。

## Non-Goals (optional)

- 不把高亮狀態寫入資料庫、不做跨裝置同步；高亮維持本機 localStorage、匯出檔反映按匯出鈕的人所點的高亮（屬預期）。
- 不在匯出檔內提供「點擊切換高亮」的互動（匯出檔的高亮為唯讀快照）。
- 不改主 App 的 `ExcelStep`/`HighlightableValue` 行為與 localStorage key 結構。
- 不動表格其他欄、備忘錄區、Excel 匯出。
- 台股紅漲綠跌色彩慣例不適用（此為案件里程碑標記，非投資漲跌）。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cases-html-export`: 匯出 HTML 於表格與時程兩處呈現主 App 的里程碑/欄位黃色高亮快照，並於列印保留。

## Impact

- Affected specs: 修改 `cases-html-export`
- Affected code:
  - New: (none)
  - Modified:
    - src/lib/cases/htmlExport.ts
    - src/lib/cases/exportInteractive.ts
    - src/components/features/cases/ExportHtmlButton.tsx
    - src/lib/cases/__tests__/htmlExport.test.ts
    - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - Removed: (none)
