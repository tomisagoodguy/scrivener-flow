## Context

匯出 HTML 由 `src/lib/cases/htmlExport.ts` 產生靜態三區（表格、備忘錄、時程）。時程區靜態輸出為 `.timeline-list`，內含交錯的 `.timeline-day`（日標頭，帶 `data-day`）與 `.timeline-item`（事件列，帶 `data-event-id`/`data-event-date`/`data-case-id`），由 `buildTimelineSection` 依「下一個未到期里程碑」排序產生。互動層 `src/lib/cases/exportInteractive.ts` 在 runtime 注入控制節點（一律帶 `export-ui`）：條列每列由 `buildItemControls` 注入「承辦下拉＋完成」控制組；`buildViewSwitcher` 注入「條列／週曆」切換與隱藏的週曆容器；`renderWeekAgenda` 以 `.week-block` 內一天一列 `.week-day`（flex，帶 `data-day`）＋ `makeWeekEvent` 產生 `.week-event` chip 重建週曆；`applyFilter` 以 caseId＋承辦人對 `.timeline-item`/`tr`/`.memo-card`/`.week-event` 設 `style.display`；`refreshDayHeaders` 巡 `.timeline-list` 子節點，當某日無可見事件時隱藏該 `.timeline-day` 標頭。狀態存於 `#export-state`（`people`/`assignments`/`done`/`collapsed`），`downloadAssigned` 剝除 `export-ui` 後序列化。

兩種檢視目前都低密度：週曆一天一整列、空白日也佔整列；條列右側大量留白且列高偏大。需在不改資料、不改互動行為的前提下純版面重構提高密度。

## Goals / Non-Goals

**Goals:**

- 條列檢視以兩欄並排日群組呈現，利用橫向寬度、縱向高度約減半、提高密度。
- 週曆檢視改成真正的 7 欄（週一～週日）月曆方格，每格一天、事件為緊湊 chip，空白日只佔一個小方格。
- 篩選、完成、今日高亮、收合、人員管理等既有互動行為與 `#export-state` 結構不變。
- 維持單一自包含 HTML、不外連、列印可用。

**Non-Goals:**

- 不改主 App、不動表格／備忘錄區、不改 Excel 匯出。
- 不改 `collectTimelineEvents` 的事件收集、排序、escape 規則。
- 不在週曆方格內提供承辦人下拉編輯（沿用目前週曆不可編輯承辦人的現況；承辦人編輯維持在條列與表格）。

## Decisions

### 條列檢視以 CSS grid 兩欄排版，每個日群組包成不可分割區塊

`buildTimelineSection` 將每個日群組（`.timeline-day` 標頭＋其 `.timeline-item`）包進一個 `.timeline-day-group` 容器；`.timeline-list` 改 `display: grid; grid-template-columns: 1fr 1fr`，每個 `.timeline-day-group` 為一個 grid item 並設 `break-inside: avoid`。
**理由**：以「群組為原子 grid item」可避免日標頭與其事件被切到不同欄（CSS multi-column `columns:2` 會在群組中間斷裂）。grid row-major 自動左右交錯擺放不同日群組，達成兩欄並排。
**替代方案**：CSS `columns: 2` 多欄流排——否決，會把單一日群組拆到兩欄、標頭與事件分離。

### 週曆檢視改為 7 欄月曆方格，事件以緊湊 chip 呈現

`renderWeekAgenda` 改為：每週產生一個 `.week-grid`（`display: grid; grid-template-columns: repeat(7, 1fr)`），內含 7 個 `.week-cell`（週一～週日各一），每格頂部一個 `.week-cell-date` 日期標籤、其下放該日事件 chip。`makeWeekEvent` 產生的 chip 維持 `.week-event` class（含 `data-case-id`/`data-event-id`，供 `applyFilter` 與完成同步）＋完成勾選，內容精簡為圖示＋里程碑類別＋案號（省略當事人/content 以節省格寬）。今日格加 `.week-cell-today`，`data-day` 改掛在 `.week-cell` 上。涵蓋本週至最後一筆事件所在週；空白日為空的小方格。
**理由**：7 欄方格是真正的月曆密度，空日只佔小格而非整列；chip 重用既有 `.week-event` class 讓 `applyFilter` 對週曆事件的篩選與 `registerDone`/`setDone` 的完成同步無須改動行為。
**替代方案**：僅移除空白日的一維長條——否決，使用者選擇真正月曆方格。

### 篩選與空群組/空日隱藏改以容器為單位

`applyFilter` 對條列改為：設定 `.timeline-item` 可見性後，呼叫更新後的 `refreshDayHeaders` 以 `.timeline-day-group` 為單位——群組內無可見 `.timeline-item` 時隱藏整個 `.timeline-day-group`（而非只藏標頭）。週曆方格的空格與被篩掉的 chip 維持以 `.week-event` 的 `style.display` 控制（cell 本身恆在以維持方格對齊）。
**理由**：grid 版面下，只藏標頭會留下空白 grid 格；以群組容器為單位隱藏才不留洞。週曆方格需固定 7 欄對齊，故 cell 恆在、只藏 chip。
**替代方案**：篩選時重排 grid——否決，過度複雜且破壞日期對齊。

### 列印一致性：grid 版面於列印維持可見且不跨欄斷裂

既有 `@media print` 規則 `.timeline-list { display: block !important }`（原為週曆 inline 隱藏後仍能列印靜態條列）改為復原為 grid 顯示而非 block，使列印仍維持兩欄；`.timeline-day-group`、`.week-grid`、`.week-cell` 加 `break-inside: avoid`。`export-ui`（含切換鈕、承辦下拉、完成勾選）列印時仍隱藏。
**理由**：使用者列印也要密度；維持 grid 但避免跨頁/跨欄斷裂即可。
**替代方案**：列印強制單欄 block——否決，浪費紙張、與螢幕不一致。

### 密度調整集中於 INLINE_CSS，不更動既有色彩與互動行為

縮小 `.timeline-item`/`.week-event` 的 padding 與字級、收斂 gap，皆只改 INLINE_CSS；不更動事件色彩語意（此區非投資漲跌，台股紅綠慣例不適用）、不改 `state` 結構與 `done`/`assignments`/`collapsed` 行為。
**理由**：版面密度屬樣式層，集中於 CSS 降低回歸風險。

## Implementation Contract

**Behavior（使用者可觀察）：**

- 開啟匯出 HTML 預設為條列檢視：日群組以兩欄並排，左右交錯填入不同日群組；每個日標頭與其事件不被切到不同欄；右側不再大片留白。
- 切到週曆：顯示 7 欄（週一～週日）月曆方格，每週一列；每格是一天，事件為緊湊 chip（圖示＋類別＋案號＋完成勾選）；空白日為空的小方格；今日格高亮。
- 依承辦人篩選：條列中無可見事件的整個日群組隱藏（不留空格）；週曆中被篩掉的事件 chip 隱藏、方格仍對齊。
- 完成勾選、今日高亮、收合、新增/刪除承辦人、下載已處理版本後重開還原——行為與重構前一致。
- 列印（Ctrl+P）：條列維持兩欄、週曆維持方格；`export-ui` 控制項不出現於紙本；群組/方格不被跨欄或跨頁切斷。

**Interface / data shape：**

- 靜態結構新增 `.timeline-day-group` 容器包住既有 `.timeline-day`＋`.timeline-item`；`.timeline-list` 由區塊流改為兩欄 grid。
- 週曆 DOM 由 `.week-block` + 一天一列 `.week-day` 改為每週 `.week-grid`（7 欄）+ `.week-cell`（帶 `data-day`、今日加 `.week-cell-today`）+ 格內 `.week-cell-date` 與 `.week-event` chip。
- `#export-state` 結構與既有互動函式（`applyFilter`/`setDone`/`registerDone`/`renderPeople`/`downloadAssigned`/收合）對外行為不變。
- 無匯出函式簽章變更。

**Failure modes：**

- JavaScript 關閉（未注入互動層）：條列仍以兩欄 grid 顯示靜態日群組（不依賴互動層）；無週曆、無控制項、內容不遺失。
- 某週無任何事件：該週 `.week-grid` 仍渲染為 7 個空格（維持日曆連續性）。
- 篩選後某日群組全部隱藏：整個 `.timeline-day-group` 不顯示，不留空白 grid 格。

**Acceptance criteria：**

- htmlExport 測試：`buildTimelineSection`/`buildCasesHtml` 輸出含 `.timeline-day-group` 包住每個日群組；`.timeline-list` 的 INLINE_CSS 為兩欄 grid（`grid-template-columns` 兩欄）；仍自包含（無 `src="http`、`href="http`、`@import`）；既有「依里程碑排序」「列印 `.timeline-list` 可見」斷言維持。
- exportInteractive 測試：切到週曆後產生 `.week-grid`（7 欄）與 `.week-cell`（含 `data-day`）；今日 `.week-cell` 帶 `.week-cell-today`；`.week-event` chip 仍帶 `data-event-id`/`data-case-id`，依承辦人篩選可隱藏對應 chip；完成勾選與條列同 eventId 同步；條列篩選後無可見事件之 `.timeline-day-group` 被隱藏。
- 既有 htmlExport / exportInteractive / 整合測試（含週曆既有案例改寫後）維持全綠。
- `yarn lint` 通過。

**Scope boundaries：**

- In scope：`htmlExport.ts` 的 `buildTimelineSection`（日群組容器）＋ INLINE_CSS（兩欄 grid、月曆方格、密度）；`exportInteractive.ts` 的 `renderWeekAgenda`/`makeWeekEvent`（月曆方格）、`applyFilter`/`refreshDayHeaders`（以群組/方格為單位）；對應單元與整合測試。
- Out of scope：主 App `/cases`、表格區、備忘錄區、Excel 匯出、`collectTimelineEvents` 邏輯、`#export-state` 結構、承辦/完成/收合的「行為」、週曆內承辦人編輯。

## Risks / Trade-offs

- [兩欄 grid 中日群組高度不一，左右欄底部會參差] → 可接受；以群組為原子 item 換取不跨欄斷裂，視覺仍整齊。
- [週曆 chip 省略當事人/內容以節省格寬，資訊較少] → 條列檢視仍保留完整資訊；週曆定位為「鳥瞰當月分布」，互補而非取代。
- [既有週曆整合測試以 `.week-day`/`data-day` 斷言，重構後 DOM 改變會紅] → 屬預期，於 tasks 內一併改寫週曆相關測試；`.week-event` class 與 `data-*` 保留以降低 churn。
- [列印兩欄在窄紙張可能擁擠] → `break-inside: avoid` 控制不切斷；密度為使用者明確需求，接受取捨。

## Migration Plan

1. 先改 `htmlExport.ts`（日群組容器＋ INLINE_CSS 兩欄 grid／月曆方格／密度）並過 htmlExport 測試。
2. 再改 `exportInteractive.ts`（月曆方格 `renderWeekAgenda`/`makeWeekEvent`、群組為單位的 `applyFilter`/`refreshDayHeaders`）並過 exportInteractive 與整合測試。
3. 無資料庫遷移、無設定變更；僅影響匯出檔版面。舊匯出檔（舊 DOM）以其自帶腳本運作，不受影響。
4. Rollback：還原兩檔變更即可；`#export-state` 結構未變，向後相容。

## Open Questions

(none)
