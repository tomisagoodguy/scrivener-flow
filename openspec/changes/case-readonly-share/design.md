## Context

`cases` 表以 `user_id`（`auth.uid()`）做多租戶隔離，`milestones`、`financials`、`redemption_steps` 皆透過 `case_id` 外鍵關聯到 `cases`，並各自有 RLS Policy 以 `EXISTS (SELECT 1 FROM cases WHERE cases.id = X.case_id AND cases.user_id = auth.uid())` 判斷存取權（見 `supabase/migrations/20260113_add_auth.sql`）。目前沒有任何跨帳號的存取機制：即使系統已有 `in-app-chat`（使用者對使用者的即時聊天），聊天訊息本身不綁定案件，無法作為案件資料的存取管道。

本設計新增「案件擁有者主動將案件唯讀分享給指定同事」的能力，分享關係記錄在新表 `case_shares`，並擴充既有 RLS Policy 的 SELECT 條件，讓被分享者可讀取但不能寫入。

## Goals / Non-Goals

**Goals:**

- 案件擁有者可在案件詳情畫面搜尋並新增/移除分享對象（同事帳號）。
- 被分享者可讀取該案件的 `cases`、`milestones`、`financials`、`redemption_steps` 資料，UI 呈現完整唯讀檢視。
- 被分享者對上述表格沒有 INSERT/UPDATE/DELETE 權限，資料庫層即拒絕，UI 層也隱藏/停用編輯操作。
- 分享/取消分享即時生效（下一次查詢即反映新的 RLS 結果），不需要對方重新登入。

**Non-Goals:**

- 不處理 `in-app-chat` 訊息或既有 `case_date_logs`／`todos` 等表格的分享（這些表格在目前 migrations 中找不到明確 schema 定義，留待後續變更視需要擴充）。
- 不支援「唯讀分享」以外的權限等級（例如可編輯的協作者角色），本次僅實作唯讀。
- 不支援分享給系統外部（未註冊帳號）的使用者，僅限公司內已登入使用者（比照 `in-app-chat` 的使用者選擇器設計哲學）。
- 不做到期時間／分享連結，分享對象是明確指定的使用者帳號，非公開連結。

## Decisions

### 新增 `case_shares` 表記錄分享關係

採用獨立表而非在 `cases` 加 JSONB 欄位，理由：分享是多對多關係（一案件可分享給多人、一使用者可被分享多案件），獨立表才能用 RLS 子查詢並支援索引查詢。

```sql
CREATE TABLE case_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (case_id, shared_with)
);
```

`shared_by` 記錄實際執行分享動作的人（通常等於 `cases.user_id`，但保留欄位是為了未來稽核追蹤），`UNIQUE (case_id, shared_with)` 避免重複分享列。

### 擴充既有 SELECT Policy，不新增 UPDATE/DELETE 權限

在 `cases`、`milestones`、`financials`、`redemption_steps` 的既有 SELECT Policy 條件中，以 `OR EXISTS (SELECT 1 FROM case_shares WHERE case_shares.case_id = <table>.case_id AND case_shares.shared_with = auth.uid())` 擴充（`cases` 表本身用 `case_shares.case_id = cases.id`）。INSERT/UPDATE/DELETE Policy 完全不動，維持只有 `user_id = auth.uid()` 才能寫入，被分享者永遠沒有寫入路徑，不需要额外的「唯讀檢查」邏輯。

被拒絕方案：曾考慮讓被分享者也能寫入但由前端隱藏 UI（僅 UI 層擋）——否決，因為安全邊界必須在資料庫層，前端隱藏只是體驗優化，不能是唯一防線。

### `case_shares` 自身的 RLS

- SELECT：`shared_with = auth.uid() OR EXISTS (SELECT 1 FROM cases WHERE cases.id = case_shares.case_id AND cases.user_id = auth.uid())`（被分享者可看到自己被分享了哪些案件；案件擁有者可看到自己案件的分享名單）。
- INSERT/DELETE：僅 `EXISTS (SELECT 1 FROM cases WHERE cases.id = case_shares.case_id AND cases.user_id = auth.uid())`（只有案件擁有者能新增/移除分享）。
- 不開放 UPDATE（要換分享對象就先 DELETE 再 INSERT）。

### 案件清單查詢納入被分享案件

`src/services/caseService.ts`（實際案件 service 檔案，非 `src/lib/case/`）既有查詢（`SELECT * FROM cases WHERE user_id = auth.uid()`）在 RLS 擴充後，改為 `SELECT * FROM cases`（交由 RLS 過濾）即可自動納入被分享案件，不需要額外的 UNION 查詢。UI 需額外判斷 `cases.user_id === currentUserId` 來決定是否為「自己的案件」或「他人分享」，據此顯示分享來源標籤與是否顯示編輯操作。

## Implementation Contract

**行為（Behavior）**：
- 案件擁有者在案件詳情畫面點擊「分享」按鈕，開啟分享管理面板，可搜尋使用者、加入分享名單、從分享名單移除任一人。
- 被分享者登入後，在案件列表能看到該案件（標示為「OO 分享給你」），點入詳情頁可看到完整資料（基本資料、里程碑、財務、代償步驟），但所有編輯用的輸入框、按鈕（新增里程碑、修改金額、新增代償步驟等）皆為停用或隱藏狀態。
- 案件擁有者移除某人的分享後，該使用者再次載入案件列表/詳情頁時，該案件即消失（下次查詢即生效，不需要對方登出再登入）。

**資料形狀（Interface / Data Shape）**：
- `case_shares` 表如上定義；`src/types/caseShare.ts` 匯出 `CaseShare` 介面（`id`、`case_id`、`shared_with`、`shared_by`、`created_at`）與 `CaseShareWithUser`（含被分享者的 email/顯示名稱，供 UI 呈現）。
- `src/services/caseShareService.ts`（比照既有 `src/services/caseService.ts`、`todoService.ts` 的 Service 模式：方法將 `SupabaseClient` 作為第一個參數由呼叫端注入，而非內部自行 import client）提供 `addShare(supabase, caseId, userId)`、`removeShare(supabase, caseId, userId)`、`listShares(supabase, caseId)`、`searchShareableUsers(supabase, query)` 四個方法，皆透過呼叫端傳入的 Supabase client（瀏覽器端用 `src/lib/supabase/client.ts` 的 `createClient()`），全程走 RLS。
- 案件型別（`src/types/index.ts` 的 `Case`/`DemoCase` 介面）新增衍生欄位 `isOwnedByCurrentUser: boolean`（前端依 `cases.user_id === currentUserId` 計算，非資料庫欄位、非 `supabase.ts` 產生的欄位）。

**失敗模式（Failure Modes）**：
- 非案件擁有者呼叫 `addShare`/`removeShare`：RLS 直接拒絕寫入，Supabase 回傳 PostgREST 權限錯誤（`42501` 或 0 rows affected），`caseShareService.ts` 需捕捉並回傳明確錯誤訊息給 UI（不可靜默失敗）。
- 被分享者嘗試呼叫既有的案件寫入方法（如 `caseService.updateCaseComplete()`）：RLS 拒絕，前端已隱藏操作入口為第一道防線，API 呼叫失敗訊息作為第二道防線提示「你沒有編輯權限」。
- 重複分享同一人：`UNIQUE (case_id, shared_with)` 觸發 DB 錯誤，`addShare` 需捕捉並視為成功（idempotent，不噴錯誤給使用者）。

**驗收條件（Acceptance Criteria）**：
- 手動驗證：使用者 A 分享案件給使用者 B → B 登入後案件列表出現該案件、詳情頁可讀取里程碑/財務/代償步驟資料、所有編輯按鈕不可互動。
- 手動驗證：B 嘗試直接呼叫 `updateMilestone`（例如透過瀏覽器 console 呼叫 service 方法）→ 被 RLS 拒絕，非 200 成功。
- 手動驗證：A 移除 B 的分享 → B 重新整理案件列表後看不到該案件。
- `supabase/migrations/<timestamp>_add_case_shares.sql` 可透過 Supabase CLI/Dashboard 成功套用，且 `get_advisors`（security）沒有新增高風險項目。

**範圍邊界（Scope Boundaries）**：
- **In scope**：`cases`、`milestones`、`financials`、`redemption_steps` 四表的唯讀分享；分享管理 UI；`case_shares` 表與其 RLS。
- **Out of scope**：`todos`、`case_date_logs`、`in-app-chat` 訊息、備忘錄私密加密欄位（E2EE 內容）的分享；可編輯協作者角色；分享到期時間。

## Risks / Trade-offs

- [風險] 擴充 SELECT Policy 用子查詢 `EXISTS (... case_shares ...)`，若案件量與分享量成長，可能影響查詢效能 → 緩解：`case_shares` 對 `(case_id)` 與 `(shared_with)` 建索引，且分享關係預期數量遠小於案件總量。
- [風險] 被分享者透過 UI 隱藏編輯按鈕，但若前端邏輯有漏洞讓寫入請求仍被送出，需要確保後端 RLS 是唯一可信防線 → 緩解：Decisions 已明訂 INSERT/UPDATE/DELETE Policy 完全不擴充，寫入路徑對被分享者天生不存在。
- [風險] `case_shares` 的 SELECT Policy 讓被分享者能看到「這個案件還分享給哪些其他人」（因為 Policy 條件是 `shared_with = auth.uid() OR 擁有者`，被分享者只能看到自己那筆，不會看到別人那筆）→ 已在 Policy 設計中限制為只能看自己那筆，不算風險，僅記錄以便日後檢查。
- **[已發生，已修復]** `cases` 與 `case_shares` 的 SELECT Policy 互相以 `EXISTS` 子查詢引用對方，實測在 `20260712200000_add_case_shares.sql` 套用到 production 後，任何直接查詢 `case_shares`（例如 `caseShareService.listShares()`）或命中「非本人擁有」分支的 `cases` 查詢，會觸發 Postgres `42P17 infinite recursion detected in policy`。修復於 `20260712210000_fix_case_shares_recursion.sql`：新增兩個 `SECURITY DEFINER` 函式 `is_case_owner()`、`is_case_shared_with()`（比照既有 `is_conversation_member()` 的作法，內部查詢繞過 RLS），打斷互相引用的迴圈；`cases`／`case_shares`／`milestones`／`financials`／`redemption_steps` 的 SELECT Policy 一併改用這兩個函式。已在 Supabase 專案 `zvomerdcsxvuymnpuvxk` 上以 `BEGIN...ROLLBACK` 交易驗證修復後的完整流程（owner 分享 → shared user 可讀四表不可寫 → owner 撤銷 → shared user 立即失去存取 → 非擁有者無法建立分享），全數通過且未持久化任何測試資料。**日後任兩張表的 RLS Policy 若需要互相引用對方，一律先用 `SECURITY DEFINER` 函式打斷迴圈，不要直接寫 `EXISTS (SELECT ... FROM 對方表 ...)`。**

## Migration Plan

1. 新增 `supabase/migrations/20260712200000_add_case_shares.sql`：建表、索引、RLS Policy（含擴充既有四表的 SELECT Policy）。
1b. 新增 `supabase/migrations/20260712210000_fix_case_shares_recursion.sql`：修復 1. 造成的 RLS 互相引用無限遞迴（見上方 Risks 記錄），套用順序在 1. 之後。
2. 本地以 Supabase CLI 套用並跑 `get_advisors` 檢查安全性。
3. 前端依序完成：`src/services/caseShareService.ts` → `useCaseShares.ts` → `ShareCasePanel.tsx`/`ShareCaseButton.tsx` → 案件列表（`src/app/cases/page.tsx`）與詳情頁（`src/app/cases/[id]/page.tsx` + `EditCaseForm.tsx`）的唯讀狀態判斷。
4. 無需資料回填（新表，無既有資料）；Rollback 只需 `DROP TABLE case_shares` 並還原四表的 SELECT Policy 為原本條件。

## Open Questions

（無，範圍與邊界已於 Non-Goals 與 Scope Boundaries 明確排除）
