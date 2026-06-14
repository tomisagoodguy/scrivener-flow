## Why

代書（地政士）目前要在 App 看案件的關鍵期程（里程碑、與當事人約定的會面時間、繳稅截止日、案件待辦），同時又依賴 Google 行事曆安排每日行程，兩邊資料各自獨立、需手動重抄，容易漏記用印、漏赴約或錯過繳稅期限。將這些案件相關日期自動同步到一個**專用的 Google 子行事曆**，可讓代書在熟悉的日曆工具中一眼看到所有案件期程，且與個人行程分層顯示、可單獨開關，日期在 App 變更時自動反映，免去重複維護。

## What Changes

- 新增「Google 行事曆同步」能力：將**登入者自己 user_id 名下案件**的四類日期資料，同步為 Google 行事曆事件，全部寫入一個專用子行事曆（非個人主行事曆）。
- 首次同步時自動建立（或沿用）一個名為「案件」的專用 Google 子行事曆，其 `calendarId` 記錄於 `user_settings`，後續所有事件皆寫入此行事曆，達成公司/個人分層。
- 同步資料來源與事件型態：
  - **里程碑**（contract/seal/tax/transfer/handover_date，date）→ 全天事件，涵蓋全部里程碑（含已完成）。
  - **約定時間**（sign/seal/tax/handover_appointment，timestamptz）→ 帶時刻的定時事件。
  - **待辦 todos**（due_date / end_date，timestamptz）→ 定時事件；僅同步未軟刪除（is_deleted=false）的待辦。
  - **財務稅費期限**（land_value_tax/deed_tax/land_tax/house_tax_deadline，date）→ 全天繳稅截止提醒事件。
  - 任一來源欄位為 null 者不建立事件。
- 事件標題格式統一並標註來源（例：里程碑 `用印｜林淑萍/連俊麒 AA1258366`；約定 `用印約 14:00｜AA1258366`；待辦 `待辦：核對謄本｜AA1258366`；稅限 `房屋稅截止｜AA1258366`）；時區 Asia/Taipei。
- 資料在 App 變更時**自動同步**：里程碑與約定時間（caseService 的 milestones upsert）、財務稅限（caseService 的 financials 寫入）、待辦（todoService 的新增/完成/軟刪除）→ 新增建立、改日期更新、清空/刪除則刪除事件。
- 提供既有資料的一次性**回填動作**（Server Action），把目前所有四類資料批次同步到專用行事曆。
- 在 Google OAuth 登入 scope 追加 `https://www.googleapis.com/auth/calendar`（需建立子行事曆，故用完整 calendar scope 而非僅 calendar.events），複用現有 token 持久化與自動刷新機制（user_settings + getAccessToken）。**BREAKING**：既有使用者需重新登入一次以授權新 scope。
- 新增一般化事件對應表（來源表 + 來源 id + 來源欄位 → google_event_id），作為更新/刪除事件的依據與去重來源，可同時對應里程碑、約定、待辦、財務四種來源。

## Non-Goals

- 不做雙向同步（行事曆改動不回寫 App），僅 App → Google Calendar 單向。
- 不同步其他使用者的案件；管理者「全部案件」視角不在此範圍。
- 不同步上述四類以外的資料（如備忘錄、知識庫、投資模組）。
- 不新增獨立的 Google 服務帳號或跨使用者共享行事曆；專用子行事曆建立於使用者本人帳號下。

## Capabilities

### New Capabilities

- `calendar-milestone-sync`: 案件四類日期（里程碑、約定時間、待辦、財務稅限）與 Google 行事曆事件的單向同步（建立/更新/刪除）、專用子行事曆建立與記錄、一般化事件對應表維護、既有資料回填，以及 OAuth calendar scope 授權。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `calendar-milestone-sync`
- Affected code:
  - New:
    - `supabase/migrations/<timestamp>_add_calendar_event_mappings.sql`（一般化事件對應表）
    - `src/lib/google/calendar.ts`（Google Calendar Events + Calendars REST 封裝，含子行事曆建立）
    - `src/services/calendarSyncService.ts`（同步邏輯：四來源建立/更新/刪除、回填、行事曆 provisioning）
    - `src/app/actions/calendarSync.ts`（回填與手動同步的 Server Action）
  - Modified:
    - `src/hooks/useLoginFlow.ts`、`src/app/login/LoginContent.tsx`、`src/app/login/BookLogin.tsx`（OAuth scope 追加 calendar）
    - `src/services/caseService.ts`（milestones 與 financials 寫入後觸發同步）
    - `src/services/todoService.ts`（待辦新增/完成/軟刪除後觸發同步）
    - `src/app/actions/googleDrive.ts`（如需共用 getAccessToken 則抽出共用）
  - Removed: (none)
- Dependencies: 複用現有 Google OAuth / user_settings token 機制；不新增第三方套件（以 fetch 直接呼叫 Calendar REST API）。
- 資料庫：新增 `calendar_event_mappings` 表，受 RLS user_id 隔離；`user_settings` 新增 `case_calendar_id` 欄位記錄專用行事曆 id。
