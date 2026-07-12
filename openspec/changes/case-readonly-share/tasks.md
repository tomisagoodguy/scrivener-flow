## 1. 資料庫 Schema 與 RLS

- [x] 1.1 新增 `supabase/migrations/<timestamp>_add_case_shares.sql`，建立「新增 `case_shares` 表記錄分享關係」所需的表格（`case_id`、`shared_with`、`shared_by`、`UNIQUE (case_id, shared_with)`）與索引，驗證：本地套用 migration 後以 `\d case_shares` 確認欄位與 UNIQUE 約束存在
- [x] 1.2 在同一 migration 內完成「擴充既有 SELECT Policy，不新增 UPDATE/DELETE 權限」：`cases`、`milestones`、`financials`、`redemption_steps` 的 SELECT Policy 加入 `case_shares` 子查詢條件，INSERT/UPDATE/DELETE Policy 維持不變，驗證：以測試帳號模擬 shared user 對四張表執行 SELECT 成功、UPDATE 被 RLS 拒絕
- [x] 1.3 在同一 migration 內建立「`case_shares` 自身的 RLS」（SELECT：`shared_with = auth.uid()` 或案件擁有者；INSERT/DELETE：僅案件擁有者；不開放 UPDATE），驗證：非案件擁有者對 `case_shares` 執行 INSERT/DELETE 皆被拒絕，shared user 僅能 SELECT 到自己那筆
- [x] 1.4 套用 migration 並執行 `get_advisors`（Supabase security advisor）確認沒有新增高風險安全項目，驗證：`get_advisors` 輸出不含 `case_shares` 或四張既有表的新增 critical/high 項目

## 2. 型別與 Service 層

- [x] 2.1 [P] 在 `src/types/caseShare.ts` 新增 `CaseShare` 與 `CaseShareWithUser` 型別，驗證：`yarn tsc --noEmit` 通過
- [x] 2.2 在 `src/services/caseShareService.ts`（比照 `src/services/caseService.ts` 的 Service 模式，方法將 `SupabaseClient` 作為第一個參數）實作 `addShare`、`removeShare`、`listShares`、`searchShareableUsers`，涵蓋需求「Case owner can share a case read-only with another user」（重複分享同一人不噴錯誤）與「Case owner can revoke a share」，驗證：`yarn test --testPathPatterns caseShareService` 涵蓋 idempotent 分享與撤銷分享情境並全數通過
- [x] 2.3 [P] 在 `src/types/index.ts` 的 `Case`/`DemoCase` 介面新增 `isOwnedByCurrentUser` 衍生欄位計算邏輯（由 `cases.user_id === currentUserId` 前端計算），驗證：對應單元測試涵蓋擁有者與被分享者兩種情境並通過

## 3. 案件列表

- [x] 3.1 完成「案件清單查詢納入被分享案件」：修改 `src/services/caseService.ts` 的案件清單查詢，移除硬編碼 `user_id` 過濾條件、改交由 RLS 過濾，並在 `src/app/cases/page.tsx` 依 `isOwnedByCurrentUser` 標示案件來源，實現「Case list surfaces owned and shared cases with a distinguishing source」，驗證：手動測試以 shared user 登入，列表出現該分享案件並標示為「他人分享」，非擁有非分享案件不出現

## 4. 案件詳情唯讀 UI 與分享面板

- [x] 4.1 修改 `src/components/features/cases/EditCaseForm.tsx` 與其 `edit-case/` 子區塊（`MilestonesSection`、`TaxDeadlinesSection` 等）以及 `src/components/features/redemptions/RedemptionProgressTracker.tsx`，依 `isOwnedByCurrentUser` 隱藏或停用所有新增/修改/刪除里程碑、財務、代償步驟的操作入口，實現「Case detail view hides edit controls for shared users」，驗證：手動測試以 shared user 開啟 `src/app/cases/[id]/page.tsx` 案件詳情頁，所有編輯用輸入框與按鈕皆不可互動；owner 開啟自己案件時維持原本可編輯狀態
- [x] 4.2 [P] 新增 `src/components/features/cases/ShareCaseButton.tsx` 與 `src/components/features/cases/ShareCasePanel.tsx`，僅案件擁有者可見的分享入口，掛載於 `src/app/cases/[id]/page.tsx` 或 `EditCaseForm.tsx`，面板列出現有分享名單並可搜尋新增/移除，實現「Share panel accessible from case detail view」，驗證：手動測試 shared user 開啟案件詳情頁看不到分享按鈕，owner 可開啟面板並看到分享名單
- [x] 4.3 新增 `src/components/features/cases/edit-case/useCaseShares.ts`（比照既有 `useCaseAutoSave.ts` 的 hook 慣例）串接 `caseShareService` 與面板狀態，驗證：手動測試在面板新增/移除分享對象後，名單即時更新且無需重新整理頁面

## 5. 案件列表分享者標示、排序與擁有者端分享指示

- [x] 5.1 完成「案件列表的分享者姓名解析與擁有者端「已分享」標記」：修改 `src/app/cases/page.tsx` 的查詢加入 `case_shares (shared_by, shared_with)` embedded join，並呼叫 `listChatUsers(supabase)` 建立 id → 姓名對照表，只用 `full_name` 解析分享者姓名（不使用 email 或 email 前綴），實現「Case list surfaces owned and shared cases with a distinguishing source」中的姓名標示與 fallback 需求，驗證：手動測試 shared user 登入後看到「OO 分享給你」（OO 為分享者姓名），若分享者無 `full_name` 則顯示「同事分享給你」且畫面上不出現任何 email 字串
- [x] 5.2 完成「被分享案件在案件列表置頂排序」：在 `src/app/cases/page.tsx` 既有排序邏輯之後加入穩定的二次排序，將 `isOwnedByCurrentUser === false` 的案件排到最前面，實現「Shared cases are sorted above owned cases」，驗證：手動測試（或對照 spec 的 Example 資料）確認被分享案件永遠顯示在擁有案件之前，且同分區內原本排序順序不變
- [x] 5.3 完成「案件擁有者看到自己案件分享給誰」：在 `src/components/features/cases/case-list/CaseTableRow.tsx` 顯示分享標示——被分享案件顯示「OO 分享給你」，擁有者名下有分享出去的案件顯示「已分享給：A、B」（列出姓名而非人數），實現「Owner sees the names of everyone a case is shared with」、「Owner-side share indicator never shows email addresses」與「Owner sees no share indicator on a case with no shares」，驗證：手動測試擁有者分享案件給 1 人後看到「已分享給：B」，再分享給第 2 人後變成「已分享給：B、C」，畫面全程不出現任何 email，移除其中一人分享後名單同步移除該人

## 6. 端到端驗證

- [ ] 6.1 手動驗證需求「Shared user has read-only access to case data」完整流程：使用者 A 分享案件給使用者 B，B 登入後可讀取里程碑/財務/代償步驟資料但所有寫入操作皆被拒絕；A 移除分享後 B 立即失去該案件的讀取權，逐項對照 `design.md` 的 Acceptance Criteria 確認
