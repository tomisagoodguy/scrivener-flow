## 1. 資料庫：對應表與設定欄位

- [x] 1.1 撰寫 migration `supabase/migrations/<timestamp>_add_calendar_event_mappings.sql`，依「一般化事件對應表 calendar_event_mappings」決策建表（id/user_id/source_table/source_id/source_field/google_event_id/google_calendar_id/synced_value/updated_at），唯一鍵 `(source_table, source_id, source_field)`
- [x] 1.2 同一 migration 為 `user_settings` 新增 `case_calendar_id` 欄位（供「建立專用案件子行事曆並記錄於 user_settings」決策使用）
- [x] 1.3 為 `calendar_event_mappings` 加 RLS policy，落實 Source-to-event mapping 要求的 user_id 隔離

## 2. OAuth scope 與授權

- [x] 2.1 依「scope 追加與重新授權」決策，在 `src/hooks/useLoginFlow.ts`、`src/app/login/LoginContent.tsx`、`src/app/login/BookLogin.tsx` 的 scopes 追加 `https://www.googleapis.com/auth/calendar`，保留 access_type=offline 與 prompt=consent，滿足 Google Calendar authorization scope 要求
- [x] 2.2 在同步層偵測 insufficient-scope/403，回傳明確「需重新登入授權行事曆」狀態（對應 Google Calendar authorization scope 的失敗情境），不靜默吞錯

## 3. Google Calendar REST 封裝

- [x] 3.1 [P] 依「直接呼叫 Google Calendar REST API（不引入 googleapis 套件）」決策，新增 `src/lib/google/calendar.ts`，以 fetch 封裝 calendars.insert（建立子行事曆）與 events insert/patch/delete
- [x] 3.2 [P] 在 calendar.ts 依「事件型態：全天 vs 定時」決策實作事件 payload 組裝：date 來源用 start.date/end.date（end=日期+1），timestamptz 來源用 start.dateTime/end.dateTime（1 小時、Asia/Taipei）
- [x] 3.3 [P] 撰寫 `src/lib/google/__tests__/calendar.test.ts`，驗證子行事曆建立、全天與定時兩種 payload、標題組合格式

## 4. 同步服務核心

- [x] 4.1 依「建立專用案件子行事曆並記錄於 user_settings」決策，在 `src/services/calendarSyncService.ts` 實作 provisioning：讀 case_calendar_id，缺則建立並回寫，404 則重建，達成 Dedicated case calendar provisioning 要求
- [x] 4.2 依「同步動作的決策邏輯（建立/更新/刪除）」決策實作通用 syncField：依來源值與 mapping 決定 create/update/skip/delete（含 synced_value 去重與事件 404 重建），對應 Case date synchronization 要求
- [x] 4.3 撰寫 `src/services/__tests__/calendarSyncService.test.ts`，以決策表涵蓋 Case date synchronization 各情境（全天/定時建立、更新、略過、清空刪除、todo 軟刪除、404 重建），mock calendar.ts 與 getAccessToken

## 5. 四來源同步函式

- [x] 5.1 實作 `syncCase(caseId)`：讀該案 milestones 五日期 + 四 *_appointment + financials 四稅限，逐欄位套用 syncField 並回寫 calendar_event_mappings（涵蓋 Case date synchronization 的里程碑/約定/財務來源）
- [x] 5.2 實作 `syncTodo(todoId)`：僅同步 is_deleted=false 且有 due_date 的待辦為定時事件，軟刪除/完成則刪事件（涵蓋 Case date synchronization 的待辦來源）

## 6. 自動同步觸發

- [x] 6.1 依「同步觸發點與失敗隔離」決策，在 `src/services/caseService.ts` 的 milestones 與 financials 寫入後呼叫 syncCase，try/catch 只記 log 不 rethrow，滿足 Automatic sync on data changes 要求
- [x] 6.2 在 `src/services/todoService.ts` 的新增/完成/軟刪除後呼叫 syncTodo（同樣失敗隔離），補齊 Automatic sync on data changes 的待辦觸發
- [x] 6.3 撰寫測試驗證 Automatic sync on data changes：同步拋錯時 saveCaseData 與 todo 操作仍成功回傳

## 7. 既有資料回填

- [x] 7.1 新增 `src/app/actions/calendarSync.ts` Server Action，先 provisioning 再逐案 syncCase + 逐待辦 syncTodo，僅處理登入者 user_id 名下資料，達成 One-time backfill of existing data 要求
- [x] 7.2 撰寫測試驗證 One-time backfill of existing data 的冪等性（重跑不重複建立、未變更不呼叫 API）與 owner 範圍限制

## 8. 設定頁觸發入口與驗收

- [x] 8.1 在設定/帳號頁加入「同步到 Google 行事曆」按鈕，呼叫回填 Server Action 並顯示成功/需重新授權的回饋
- [x] 8.2 手動驗收：重新登入授權後執行回填，確認 Google 出現「案件」子行事曆且四類事件正確（里程碑/稅限為全天、約定/待辦為定時）；改一筆里程碑日期確認事件更新、清空與待辦完成確認事件刪除
