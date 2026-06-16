## Why

匯出的 HTML 備忘錄區把每個案件的三類備註（⚠️ 警示備註、📝 其他備忘、🔒 私密備註）一律完整輸出。代書把紙本交給協辦同事時，這些資訊（尤其私密備註）會全部攤開，造成同事看到過多、易被無關內容干擾，也有資訊外洩疑慮。需要讓使用者在匯出檔上自由收合不想顯示／列印的備註區塊：既能逐張卡片個別調整，也能用一鍵全域開關快速把某一整類（如所有私密備註）收掉。

## What Changes

- 互動層（exportInteractive.ts）在每張備忘錄卡片的每個備註區塊（`.memo-block`）注入一個收合切換鈕（帶 `export-ui` class）。
- 點擊切換鈕會收合該卡片該區塊：螢幕預覽與列印**都不顯示**該區塊內容（透過在實際 `.memo-block` 內容節點加上收合 class，使其在螢幕與 `@media print` 皆隱藏，而非只藏 `export-ui` 控制節點）。
- 互動層在備忘錄區頂部注入一組**全域分類開關**（帶 `export-ui` class）：三類（警示／其他／私密）各一鈕，一鍵收合或展開**所有卡片**該類區塊。全域開關以「批次套用到每張卡片的同類區塊」實作，與逐張卡片個別控制共用同一份收合狀態（不另立狀態）。
- 收合狀態以「卡片 caseId + 區塊類型（warning/pending/private）」為鍵，存入既有 `#export-state` JSON（新增 `collapsed` 欄位），與現有 `assignments`／`done` 同源持久化：下載已處理版本並重新開啟後，收合狀態仍保留。
- 預設三類全部顯示；使用者需主動收合。
- 全域開關與逐張收合鈕本身都是 `export-ui` 節點，列印時不出現（沿用既有 `@media print` 的 `.export-ui { display:none }`）。

## Non-Goals (optional)

- 全域開關只是「批次套用逐張收合」的便捷操作，不引入獨立於 per-card 之外的另一層狀態。
- 不改螢幕版面的視覺風格、不改表格與時程區、不改 Excel 匯出。
- 不在主 App（`/cases` 頁）加任何收合 UI；僅作用於匯出的 HTML 檔。
- 不加密或權限控管；收合僅是顯示層隱藏，非安全機制。
- 不改變備註的資料正規化、escape 或既有 `buildMemoBlock` 輸出的內容結構（僅在 runtime 注入控制鈕與套用收合 class）。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cases-html-export`: 新增「匯出檔備忘錄區塊可逐張卡片收合」需求——每個 `.memo-block` 可由使用者切換收合，收合者於螢幕與列印皆不顯示，狀態隨 `#export-state` 持久化。

## Impact

- Affected specs: 修改 `cases-html-export`
- Affected code:
  - New: (none)
  - Modified:
    - src/lib/cases/exportInteractive.ts
    - src/lib/cases/htmlExport.ts
    - src/lib/cases/__tests__/exportInteractive.test.ts
    - src/lib/cases/__tests__/htmlExport.test.ts
  - Removed: (none)
