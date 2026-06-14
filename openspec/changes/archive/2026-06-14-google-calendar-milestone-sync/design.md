## Context

Scrivener Flow 已具備 Google OAuth（透過 Supabase `signInWithOAuth`，`access_type=offline` + `prompt=consent`）與 token 持久化機制：`src/app/actions/googleDrive.ts` 的 `getAccessToken()` 會從 session 的 `provider_token` 取 token，並以 `user_settings` 表的 `google_refresh_token` 在過期前主動刷新（門檻 55 分鐘）。目前授權 scope 為 `drive.file email openid profile`，用於 Google Drive 文件功能。

本變更要同步四類案件日期到 Google 行事曆，且需與個人行程分層。各來源日期欄位：
- `milestones`（每案一列）：`contract_date`、`seal_date`、`tax_payment_date`、`transfer_date`、`handover_date`（date）；`sign_appointment`、`seal_appointment`、`tax_appointment`、`handover_appointment`（timestamptz）。
- `financials`（每案一列）：`land_value_tax_deadline`、`deed_tax_deadline`、`land_tax_deadline`、`house_tax_deadline`（date）。
- `todos`：`due_date`、`end_date`（timestamptz），含 `is_deleted` 軟刪除。

寫入入口：里程碑與約定在 `src/services/caseService.ts` 的 `saveCaseData()`；財務亦在 `saveCaseData()`；待辦在 `src/services/todoService.ts`。案件、里程碑、財務、待辦皆受 RLS 以 `user_id` 隔離。

## Goals / Non-Goals

**Goals:**

- 複用既有 `getAccessToken()` 與 `user_settings` token 機制，僅追加 Google Calendar scope，不另建認證流程。
- 四類日期資料變更後自動反映到使用者的專用「案件」子行事曆（建立/更新/刪除），與個人行程分層。
- 以一般化對應表保證冪等：同一來源項目重複同步不產生重複事件。
- 提供既有資料一次性回填，且回填可重跑（idempotent）。
- 同步失敗不可中斷案件/待辦儲存（輔助行為，僅記錄錯誤）。

**Non-Goals:**

- 雙向同步、其他使用者資料、四類以外資料、跨使用者共享行事曆。

## Decisions

### 建立專用案件子行事曆並記錄於 user_settings

首次同步時呼叫 Calendar API `calendars.insert` 建立名為「案件」的子行事曆（timeZone=Asia/Taipei），將回傳 `calendarId` 存入 `user_settings.case_calendar_id`；之後所有事件以此 `calendarId` 寫入。同步前先讀 `case_calendar_id`，存在則沿用、不存在才建立（並處理使用者手動刪除行事曆後 id 失效→重建）。

理由：分離子行事曆讓使用者可單獨開關、變色、整批清除，達成公司/個人分層；比寫入 primary calendar 乾淨。建立行事曆並只管理自己建立的那本，使用窄權限 `https://www.googleapis.com/auth/calendar.app.created`（非敏感 scope，同意畫面溫和、免 Google 驗證），完全涵蓋「建立子行事曆 + 於其中增刪改事件」的需求。
替代方案：寫入 primary calendar → 無法與個人事件分層，否決。

### 一般化事件對應表 calendar_event_mappings

新增表 `calendar_event_mappings`，欄位：`id`、`user_id`、`source_table`（milestones/financials/todos）、`source_id`（case_id 或 todo id）、`source_field`（如 seal_date、house_tax_deadline、sign_appointment、due_date）、`google_event_id`、`google_calendar_id`、`synced_value`（最後同步的日期/時間字串）、`updated_at`。唯一鍵 `(source_table, source_id, source_field)` 作為去重依據。RLS 以 `user_id` 隔離。

理由：四種來源共用同一張對應表，避免為每類各建一表；`(source_table, source_id, source_field)` 可唯一定位任一可同步欄位，支援更新/刪除與回填冪等。
替代方案：在各來源表加 `*_event_id` 欄位 → 欄位爆炸、待辦數量不定難處理，否決。

### 事件型態：全天 vs 定時

依來源欄位型別決定：date 欄位（里程碑五日期、財務四稅限）→ 全天事件（`start.date`/`end.date`，end=日期+1）；timestamptz 欄位（四約定時間、待辦 due_date）→ 定時事件（`start.dateTime`/`end.dateTime`，預設 1 小時，timeZone=Asia/Taipei）。

理由：約定與待辦帶實際時刻，定時事件才有意義；里程碑與稅限是「當日/截止」概念，全天事件最貼切。

### 同步動作的決策邏輯（建立/更新/刪除）

對每個可同步欄位計算目標狀態：
- 來源值有效且無對應 → 建立事件，寫入 mapping。
- 來源值有效且有對應，但 `synced_value` 不同 → 更新事件（patch 時間與標題），更新 `synced_value`。
- 來源值有效且有對應且 `synced_value` 相同 → 略過（no-op）。
- 來源值為 null（或待辦 is_deleted=true）且有對應 → 刪除事件，移除 mapping。
- 更新時 Google 回 404（事件被使用者刪除）→ 重新建立並更新 mapping。

理由：以 `synced_value` 比對避免不必要的 API 呼叫；統一邏輯套用於四來源。

### 直接呼叫 Google Calendar REST API（不引入 googleapis 套件）

`src/lib/google/calendar.ts` 以 `fetch` 封裝 `calendars.insert` 與 events `insert`/`patch`/`delete`，沿用 googleDrive.ts 既有「以 access token 呼叫 Google REST」模式。

理由：與現有 Drive 整合一致、不增打包體積。
替代方案：`googleapis` npm 套件 → 體積大且與現有 fetch 模式不一致，否決。

### scope 追加與重新授權

三處登入入口（`useLoginFlow.ts`、`LoginContent.tsx`、`BookLogin.tsx`）的 scopes 追加 `https://www.googleapis.com/auth/calendar.app.created`（窄權限：僅能管理 app 自己建立的行事曆，非敏感 scope）。既有使用者的 refresh token 不含新 scope，需重新登入一次（`prompt=consent` 已存在）。同步若回 403/insufficient scope，向使用者顯示「請重新登入以授權行事曆」提示，不靜默失敗。前置：GCP 專案需啟用 Google Calendar API。

理由：Supabase OAuth scope 在登入時固定，無法事後增量授權。

### 同步觸發點與失敗隔離

在 `caseService.saveCaseData()` 完成 milestones 與 financials 寫入後呼叫 `calendarSyncService.syncCase(caseId)`；在 `todoService` 的新增/完成/軟刪除後呼叫 `calendarSyncService.syncTodo(todoId)`。皆以 try/catch 包裹，失敗僅 `console.error` 不 rethrow。回填由 `src/app/actions/calendarSync.ts` 的 Server Action 觸發，逐案 + 逐待辦呼叫同步函式。

理由：符合專案「輔助行為失敗不中斷主流程」原則（同 ETF pipeline 輔助步驟）。

## Risks / Trade-offs

- [既有使用者未重新授權，calendar scope 缺失導致同步 403] → 同步層偵測 insufficient scope，回傳明確狀態，UI 提示重新登入；不靜默失敗。
- [回填四類大量資料造成 Google API 速率限制] → 序列處理 + `synced_value` 去重，重跑只動有變更者；必要時加小延遲。
- [使用者手動刪除子行事曆或事件 → calendarId/eventId 失效] → 行事曆 404 時依 `case_calendar_id` 重建；事件 404 時重新建立並更新 mapping。
- [待辦數量多且頻繁變動 → 事件雜訊] → 僅同步 is_deleted=false 且有 due_date 的待辦；完成或軟刪除即刪事件。
- [單向同步，行事曆端編輯不回寫] → 已列為 Non-Goal；事件標題標註來源與案號利於辨識。
- [provider_token 僅存於 session、Server 端可能取不到] → 沿用 googleDrive.ts 既有 refresh 機制由 `user_settings` 取得，與現有 Drive 功能相同風險面。

## Migration Plan

1. 上 migration 建立 `calendar_event_mappings`（含 RLS policy），並為 `user_settings` 加 `case_calendar_id` 欄位。
2. 部署含新 scope 的前端與同步邏輯。
3. 使用者重新登入授權 calendar scope。
4. 於設定頁觸發一次性回填：先建立專用子行事曆，再將四類既有資料寫入。

回滾：移除同步觸發呼叫即停止寫入；`calendar_event_mappings` 與 `case_calendar_id` 可保留（無害）。已建立的事件如需清除，提供反向刪除動作（讀 mapping 後逐筆 delete，或直接刪除整個子行事曆）。
