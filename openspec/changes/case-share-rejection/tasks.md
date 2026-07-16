## 1. 資料庫層：status 欄位、RLS policy、可見性函式

- [x] 1.1 新增 migration `supabase/migrations/<timestamp>_add_case_share_status.sql`：依設計決策「用狀態欄位而非刪除列來表示駁回」，`case_shares` 新增 `status text not null default 'active' check (status in ('active','rejected'))` 與 `rejected_at timestamptz null` 兩欄位。驗證方式：在本地/測試 Supabase 專案套用 migration 後，`select status, rejected_at from case_shares limit 1` 可執行且既有列的 `status` 皆為 `active`。
- [x] 1.2 同一個 migration 內依設計決策「RLS：新增「分享對象可更新自己那筆分享的狀態」policy」，新增「Recipient can reject a shared case」對應的 update policy：`shared_with = auth.uid()` 且 `with check (shared_with = auth.uid())`，允許分享對象更新自己那一列的 `status`/`rejected_at`。驗證方式：以分享對象帳號的 Supabase client 呼叫 `update case_shares set status='rejected' where id = <own_share_id>` 成功；改用另一位使用者的 `id` 呼叫則回傳 0 rows affected（對應 spec 的「Recipient cannot reject another recipient's share」情境）。
- [x] 1.3 新增「Owner can view rejection history and reactivate a share」對應的 owner update policy（若尚無案件擁有者對 `case_shares` 的 update 權限）：比照既有 `case_shares_delete` 的 `public.owns_case(case_id)` 條件。驗證方式：以案件擁有者帳號呼叫 `update case_shares set status='active', rejected_at=null` 成功；以非擁有者帳號呼叫同一列則回傳 0 rows affected（對應 spec 的「Non-owner cannot reactivate a share」情境）。
- [x] 1.4 依設計決策「案件可見性只需改一個 SECURITY DEFINER 函式，不需逐一改查詢」，`CREATE OR REPLACE FUNCTION public.is_case_shared_with_me(p_case_id uuid)`，在既有 `EXISTS` 子查詢加上 `AND case_shares.status = 'active'` 條件，函式簽名與 `SECURITY DEFINER`/`GRANT EXECUTE` 保持不變。此變更即實現 spec 需求「Rejected shares are excluded from the recipient's visible cases」。驗證方式：手動將某筆 `case_shares` 改成 `rejected` 後，以該分享對象帳號查詢 `cases`/`milestones`/`financials`/`redemption_steps` 皆看不到對應案件資料（對應 spec 的「Rejected case disappears from recipient's case list」情境）；改回 `active` 後資料重新出現。

## 2. 服務層與型別

- [x] 2.1 `src/types/caseShare.ts` 的 `CaseShare` 介面新增 `status: 'active' | 'rejected'` 與 `rejected_at: string | null` 兩個欄位。驗證方式：`yarn tsc --noEmit` 通過，且既有引用 `CaseShare` 的檔案不因新增必填欄位而出現型別錯誤。
- [x] 2.2 `src/services/caseShareService.ts` 新增 `rejectShare(supabase, caseId, sharedWithUserId)`：更新對應列 `status = 'rejected'`、`rejected_at = new Date().toISOString()`，成功後不回傳資料；沿用 `toError()` 處理錯誤，0 rows affected 視為 no-op（不拋錯）。驗證方式：新增/更新 `src/services/__tests__/caseShareService.test.ts` 涵蓋「分享對象駁回自己的分享成功」與「RLS 拒絕時回傳的 error 被 `toError()` 包裝拋出」兩個案例，`yarn test --testPathPatterns caseShareService` 全數通過。
- [x] 2.3 `caseShareService.ts` 新增 `reactivateShare(supabase, caseId, sharedWithUserId)`：更新對應列 `status = 'active'`、`rejected_at = null`。驗證方式：`caseShareService.test.ts` 新增「案件擁有者重新分享成功」與「非擁有者呼叫被 RLS 拒絕」兩個案例並通過。
- [x] 2.4 `listShares()` 回傳所有狀態（`active` 與 `rejected`）的列，不再隱含只回傳目前可見的分享；型別上明確標註 `status` 欄位存在。驗證方式：`caseShareService.test.ts` 驗證 `listShares()` 回傳結果同時包含 `active` 與 `rejected` 兩種狀態的列。

## 3. 分享面板 UI：已駁回區塊與重新分享

- [x] 3.1 `src/components/features/cases/edit-case/useCaseShares.ts` 依 `shares` 的 `status` 分成 `activeShares` 與 `rejectedShares` 兩組（衍生自單一 `listShares()` 結果，不重複打 API），並新增 `reactivateUser(userId)` 呼叫 `reactivateShare()` 後 `reload()`。驗證方式：手動於 `/cases/[id]` 開啟分享面板，確認 hook 回傳的 `activeShares`/`rejectedShares` 分組與資料庫實際 `status` 一致（人工核對 Supabase Table Editor 資料）。
- [x] 3.2 依設計決策「分享面板新增「已駁回」區塊」，`src/components/features/cases/ShareCasePanel.tsx` 新增「已駁回」區塊，顯示 `已駁回：${fullName}（${rejected_at 格式化日期}）` 與「重新分享」按鈕；「使用中」名單只顯示 `activeShares`。驗證方式：實際在瀏覽器開啟案件的分享面板，人工確認：(a) 無駁回紀錄時「已駁回」區塊不顯示，(b) 有駁回紀錄時該區塊顯示姓名與日期且不出現在使用中名單。
- [x] 3.3 點擊「重新分享」按鈕呼叫 `reactivateUser`，成功後該筆記錄從「已駁回」區塊移除、出現在「使用中」名單。驗證方式：實際操作瀏覽器點擊「重新分享」，人工確認 UI 兩個名單即時更新且不需重新整理頁面。

## 4. 分享對象的駁回入口

- [x] 4.1 在分享對象檢視共享案件的畫面（案件詳情頁 `src/app/cases/[id]/page.tsx` 對應的 Client 元件）新增「駁回分享」操作，僅在 `isOwnedByCurrentUser === false` 時顯示，觸發 `rejectShare(supabase, caseId, currentUserId)` 且不彈出任何確認訊息以外的通知邏輯（純本地確認，不通知擁有者）。驗證方式：實際以分享對象帳號操作瀏覽器，觸發駁回後案件從她的 `/cases` 清單消失（對應 spec 的「Recipient rejects a share」與「Rejected case disappears from recipient's case list」情境）。

## 5. 擁有者端顯示修正

- [x] 5.1 `src/app/cases/page.tsx` 的 `case_shares (shared_by, shared_with)` embed select 改為 `case_shares (shared_by, shared_with, status)`，`resolveSharedWithLabel` 呼叫前先過濾 `status === 'active'` 的列。驗證方式：實際以案件擁有者帳號瀏覽 `/cases` 頁面，案件卡片的「已分享給：」文字只列出目前 `active` 狀態的分享對象，不包含已駁回的人（人工比對 Supabase 資料）。

## 6. 整體驗證

- [x] 6.1 執行 `yarn tsc --noEmit`、`yarn lint`、`yarn test --testPathPatterns caseShareService` 三項全部通過，作為本次變更的最低驗證門檻。
- [ ] 6.2 端對端手動驗證：以兩個測試帳號 A（擁有者）與 B（分享對象）完整跑一次「A 分享案件給 B → B 駁回 → A 在分享面板看到駁回提醒且 B 的 `/cases` 清單看不到該案件 → A 點擊重新分享 → B 的 `/cases` 清單重新出現該案件」流程，並記錄各步驟畫面截圖或文字結果。
