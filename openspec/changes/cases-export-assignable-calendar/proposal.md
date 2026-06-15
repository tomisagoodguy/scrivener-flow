## Why

代書出門（休假、出差）時會把案件交接給協助辦案的人，但目前的「匯出 HTML」是**靜態唯讀**檔，協助者打開只能看資料，無法得知「哪幾件歸他、今天該做什麼」。需要一份能**指派承辦人**、且**全員共看同一份日曆**的交接檔；協助者多半沒有系統帳號，因此不能依賴登入或資料庫。

## What Changes

- 在既有 `buildCasesHtml` 產生的匯出檔內，注入一層**互動式 JS**（仍為單一自包含 HTML、inline 資源、離線可用），新增：
  - **每案承辦人指派**：時程區每筆事件可從下拉選單指派承辦人；人員名單可即時新增（自由輸入姓名）。
  - **人員篩選列**：`全部 / <人員…>`，切到某人時僅顯示其負責的事件。
  - **今日焦點**：自動標出「今天」這組，並可一眼看出每位承辦人今天要做的事。
  - **完成打勾**：事件可勾選完成，狀態存於該檔 `localStorage`。
  - **下載已指派版本**：把目前指派與人員名單**序列化寫入一份新的自包含 HTML**（embed 為 inline JSON），使指派狀態能**隨檔案傳遞**——這是讓「寄給協助者後仍看得到指派」的關鍵機制。
- 指派與完成狀態以「案件/事件穩定 ID」為鍵；既有靜態匯出的三大區塊（承辦中表格、備忘錄、時程）版面與資料維持不變，互動層為加值疊加。

## Non-Goals

- **不**新增資料庫欄位、**不**改 Supabase schema、**不**動 RLS；指派純粹存在匯出檔內。
- **不**做指派狀態回寫系統、也**不**做多份檔案之間的合併同步（協助者各自打勾不會合併回來）。此為單向交接情境的刻意取捨。
- **不**新增團隊成員/登入帳號模型（未來若要 App 內即時協作再另開 change）。
- **不**改動 Excel（`.xlsx`）匯出。

## Capabilities

### New Capabilities

- `cases-export-interactive-calendar`: 匯出 HTML 內的互動式可指派共用日曆——承辦人指派、人員篩選、今日焦點、完成打勾，以及把指派狀態 bake 進新檔的「下載已指派版本」。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `cases-export-interactive-calendar`
- Affected code:
  - New:
    - src/lib/cases/exportInteractive.ts
    - src/lib/cases/__tests__/exportInteractive.test.ts
  - Modified:
    - src/lib/cases/htmlExport.ts
  - Removed: (none)
