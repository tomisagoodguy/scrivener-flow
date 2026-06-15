## Why

匯出檔的「時程」區目前只有單一條列式（list）檢視，逐日把即將到來的事件由近到遠排成一長串。代書交接、週會對焦「這週要處理什麼」時，條列式看不出週的邊界與每天的負載分布。需要一個以「週」為單位的議程檢視，讓使用者一眼看出本週每天的事件，並可在條列／週曆間切換。

## What Changes

- 時程區由互動層注入一個檢視切換（條列 / 週曆），預設維持現有條列式。
- 新增「週曆／議程式」檢視：以週為單位的時間軸，逐日一列，列出當天的事件（沿用時程事件既有的圖示、標籤、案號、當事人、內容與完成樣式）。無事件的日子顯示為空列，當日（開檔當天的本地日期）醒目標示。
- 週曆／議程檢視沿用現有的承辦人案件層級篩選與「承辦：<人名>」徽章邏輯，與表格／備忘錄三區同步一致：選某人時只顯示其案件的事件、未指派案件於選特定人員時隱藏；切「全部」還原。
- 逐事件完成打勾（`done`，以 `eventId` 為鍵）行為不變，週曆檢視中的事件同樣可勾選完成。
- 維持單一自包含 HTML、無外部資源；JavaScript 關閉時時程區維持現有條列式靜態內容，無切換鈕、無週曆、無殘留控制項。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cases-export-interactive-calendar`: 時程區新增「條列 / 週曆」檢視切換與週曆／議程式檢視；週曆檢視沿用既有承辦人篩選與徽章、逐事件完成打勾與當日標示。

## Impact

- Affected specs: 修改 `cases-export-interactive-calendar`（基準 spec 位於尚未 archive 的前一變更 cases-export-case-level-assignment-sync，archive 順序須前者先行）
- Affected code:
  - New: (none)
  - Modified:
    - src/lib/cases/exportInteractive.ts
    - src/lib/cases/htmlExport.ts
    - src/lib/cases/__tests__/exportInteractive.integration.test.ts
    - src/lib/cases/__tests__/htmlExport.test.ts
  - Removed: (none)
