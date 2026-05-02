## Why

代書在日常作業中需要快速批次記錄多筆雜事（約期、印章、開會等），現有的新增事件 UI 每次只能輸入一筆且需手動操作原生 datetime picker，效率低落。需要一個「打完按 Enter 繼續打」的閃電輸入體驗。

## What Changes

- 新增「閃電輸入模式」：單一文字欄位持續接受輸入，Enter 儲存並立即清空等待下一筆
- 新增智慧時間解析器：從一行文字中自動辨識標題與時間碼（含民國曆）
- 新增本次 session 輸入記錄：在輸入框下方顯示剛才新增的事項清單
- `TodoContainer` 的「新增事件」按鈕切換為閃電輸入模式（取代現有 inline form）

## Capabilities

### New Capabilities

- `rapid-event-input`: 閃電輸入模式元件——持續輸入、Enter 儲存、Esc 關閉、session 記錄顯示
- `smart-datetime-parser`: 從單行字串解析標題與日期時間，支援民國曆與多種數字速記格式

### Modified Capabilities

（無現有 spec 需變更需求）

## Impact

- **修改**：`src/components/todo/TodoContainer.tsx`（替換 inline form 為 RapidEventInput）
- **新增**：`src/components/todo/RapidEventInput.tsx`
- **新增**：`src/components/todo/hooks/useSmartDateParser.ts`
- **不影響**：`useTodoSync.ts` 的 `addManualTodo()`（介面不變，直接呼叫）
- **不影響**：資料庫 Schema、RLS、Timeline 同步邏輯
