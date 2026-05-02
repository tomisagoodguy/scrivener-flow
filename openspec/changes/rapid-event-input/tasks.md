## 1. 智慧時間解析器

- [x] 1.1 建立 `src/components/todo/hooks/useSmartDateParser.ts`，實作 `parseEventLine(input)` 回傳 `{ title, startDate, isAllDay }`
- [x] 1.2 實作 11碼民國含時間解析（`YYYMMDDHHMM`，ROC 100-129）
- [x] 1.3 實作 8碼日期加時間解析（`MMDDHHMM`，最常用）
- [x] 1.4 實作 7碼民國全天解析（`YYYMMDD`）
- [x] 1.5 實作 4碼解析：日期優先（`MMDD`），無效時 fallback 到時間（`HHMM`）
- [x] 1.6 實作 token 掃描邏輯：從輸入字串中找出時間 token，剩餘為 title

## 2. RapidEventInput 元件

- [x] 2.1 建立 `src/components/todo/RapidEventInput.tsx`，含 autoFocus 輸入框
- [x] 2.2 實作 Enter 鍵：呼叫 `addManualTodo`、清空輸入框、維持焦點
- [x] 2.3 實作 Esc 鍵：關閉元件、清空 session 記錄
- [x] 2.4 實作即時解析預覽（輸入框右側或下方灰色小字顯示日期時間）
- [x] 2.5 實作 session 記錄列表（`✓ [日期預覽] [標題]` 格式，最新在最上方）

## 3. TodoContainer 整合

- [x] 3.1 在 `TodoContainer.tsx` 引入 `RapidEventInput`，替換現有 inline form（保留 showAdd state 控制開關）
- [x] 3.2 確認「新增事件」按鈕點擊後開啟 `RapidEventInput`，並驗證儲存後列表即時更新
