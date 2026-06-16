## 1. 條列兩欄 grid + 日群組容器（htmlExport.ts，TDD）

- [x] 1.1 先在 src/lib/cases/__tests__/htmlExport.test.ts 補單元測試（先紅），鎖定設計決策「條列檢視以 CSS grid 兩欄排版，每個日群組包成不可分割區塊」：斷言（a）buildTimelineSection / buildCasesHtml 輸出把每個日群組（`.timeline-day` 標頭＋其 `.timeline-item`）包在一個 `.timeline-day-group` 容器內；（b）INLINE_CSS 的 `.timeline-list` 設為兩欄 grid（`display: grid` 且 `grid-template-columns` 為兩欄，如 `repeat(2, 1fr)` 或 `1fr 1fr`）、`.timeline-day-group` 設 `break-inside: avoid`；（c）既有「依下一個里程碑排序（SOONER 在 LATER 前）」與「文件自包含：無 `src="http`、`href="http`、`@import`」斷言仍成立；以 yarn test 驗證為紅
- [x] 1.2 依設計決策「條列檢視以 CSS grid 兩欄排版，每個日群組包成不可分割區塊」，修改 src/lib/cases/htmlExport.ts 的 buildTimelineSection：把每個日群組（header＋rows）包進 `<div class="timeline-day-group">…</div>`；並在 INLINE_CSS 將 `.timeline-list` 改為兩欄 grid、`.timeline-day-group` 加 `break-inside: avoid`，同步依設計決策「密度調整集中於 INLINE_CSS，不更動既有色彩與互動行為」調小 `.timeline-item` padding/字距提高密度（密度樣式只改 INLINE_CSS）；不改事件排序、escape、`data-*` 屬性與既有色彩；使 1.1 測試轉綠

## 2. 週曆 7 欄月曆方格（exportInteractive.ts，TDD）

- [x] 2.1 先在 src/lib/cases/__tests__/exportInteractive.integration.test.ts（沿用既有 jsdom 週曆測試結構）補/改測試（先紅），鎖定設計決策「週曆檢視改為 7 欄月曆方格，事件以緊湊 chip 呈現」：斷言切到週曆後（a）每週產生一個 `.week-grid` 且其直接子節點為 7 個 `.week-cell`；（b）`.week-cell` 帶 `data-day`，今日對應的 `.week-cell` 帶 `.week-cell-today`、其他日不帶；（c）事件 chip 仍為 `.week-event` 且帶 `data-case-id`/`data-event-id`，落在對應日期的 cell 內；（d）無事件的日期為空的 `.week-cell`（不佔整列）；既有「完成自週曆同步到條列同 eventId」「依承辦人篩選隱藏對應 `.week-event`」案例改寫為新結構後仍成立；以 yarn test 驗證為紅
- [x] 2.2 依設計決策「週曆檢視改為 7 欄月曆方格，事件以緊湊 chip 呈現」，修改 src/lib/cases/exportInteractive.ts 的 renderWeekAgenda 與 makeWeekEvent：每週改產生 `.week-grid`（7 欄，週一～週日各一 `.week-cell`，cell 帶 `data-day`、今日加 `.week-cell-today`），cell 頂部放 `.week-cell-date` 日期標籤、其下放該日 `.week-event` chip（chip 精簡為圖示＋里程碑類別＋案號＋完成勾選，保留 `data-case-id`/`data-event-id` 與 `registerDone` 完成同步），空日為空 cell；在 src/lib/cases/htmlExport.ts 的 INLINE_CSS 新增 `.week-grid`/`.week-cell`/`.week-cell-today`/`.week-cell-date`/`.week-event` 的方格與密度樣式（取代舊 `.week-block`/`.week-day` 樣式）；使 2.1 測試轉綠

## 3. 條列篩選以日群組容器為單位（exportInteractive.ts，TDD）

- [x] 3.1 先在 src/lib/cases/__tests__/exportInteractive.integration.test.ts 補測試（先紅），鎖定設計決策「篩選與空群組/空日隱藏改以容器為單位」：斷言條列檢視套用某承辦人篩選後，某日群組內所有 `.timeline-item` 皆不屬該承辦人時，整個 `.timeline-day-group` 被隱藏（`style.display` 為 none），且仍有事件的日群組維持顯示；切回「全部」時隱藏的日群組恢復；以 yarn test 驗證為紅
- [x] 3.2 依設計決策「篩選與空群組/空日隱藏改以容器為單位」，修改 src/lib/cases/exportInteractive.ts 的 applyFilter / refreshDayHeaders：在設定各 `.timeline-item` 可見性後，改以 `.timeline-day-group` 為單位——群組內無任何可見 `.timeline-item` 時隱藏整個 `.timeline-day-group`，否則顯示；週曆方格維持以 `.week-event` 的 `style.display` 控制、`.week-cell` 恆在；不改承辦/完成/收合等其他行為；使 3.1 測試轉綠

## 4. 列印一致性與驗證

- [x] 4.1 依設計決策「列印一致性：grid 版面於列印維持可見且不跨欄斷裂」，調整 src/lib/cases/htmlExport.ts 的 `@media print`：將既有 `.timeline-list { display: block !important }` 改為復原 grid 顯示（兩欄）而非 block，並為 `.timeline-day-group`/`.week-grid`/`.week-cell` 加 `break-inside: avoid`；於 htmlExport.test.ts 補/改列印斷言（列印區塊內 `.timeline-list` 仍可見且為 grid、`.timeline-day-group` 不跨頁切斷、`.export-ui` 仍隱藏）；以 yarn test 驗證為紅後實作轉綠
- [x] 4.2 驗收需求「Timeline section offers high-density list and calendar layouts（時程區高密度條列與月曆版面）」：執行 yarn test -- --testPathPatterns="htmlExport|exportInteractive" 全綠（確認條列兩欄、週曆方格、篩選、完成同步、今日高亮、列印、收合與持久化無回歸），並對 src/lib/cases/htmlExport.ts、src/lib/cases/exportInteractive.ts 與兩個對應測試檔執行 yarn eslint 通過
