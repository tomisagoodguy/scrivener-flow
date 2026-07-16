## Context

`case_shares` 目前只有 `case_id / shared_with / shared_by / created_at`，是純粹的「有分享／沒分享」二元關係，`removeShare()` 直接 `DELETE`。RLS 目前只允許案件擁有者（`shared_by` 對應的案件 `user_id`）新增/刪除分享列；分享對象只有 `SELECT` 權限（用來讓自己看見被分享的案件）。要新增「分享對象自行駁回」，必須讓分享對象也能修改（而非刪除）自己那一列，同時保留紀錄供擁有者查詢。

## Goals / Non-Goals

**Goals:**
- 分享對象可以把某筆分享標記為駁回，之後這個案件不再出現在她自己的案件清單/詳情頁。
- 案件擁有者可以在分享面板看到「被誰駁回、何時駁回」，並一鍵重新分享（把狀態改回 active）。
- 駁回與重新分享都不刪除歷史列，`case_id + shared_with` 的唯一鍵关係維持不變（重複分享/駁回都是同一列狀態切換）。

**Non-Goals:**
- 不做主動推播通知（見 proposal Non-Goals）。
- 不變更擁有者既有的「移除分享」硬刪除流程。
- 不支援分享對象「重新加回自己」——駁回後只有擁有者能重新分享，分享對象不能自行復原。

## Decisions

### 用狀態欄位而非刪除列來表示駁回

新增 `status text not null default 'active' check (status in ('active','rejected'))` 與 `rejected_at timestamptz null`。
理由：若駁回時直接 `DELETE`，擁有者端完全無從得知曾經被駁回過（也就是使用者原始需求裡「她系統就會一直看到我的案件」這種資訊落差的根源）；用狀態欄位保留歷史列，讓分享面板能查出駁回紀錄。與 `removeShare()` 的硬刪除（擁有者主動移除、不需要保留紀錄）刻意區分成兩種語意。

### RLS：新增「分享對象可更新自己那筆分享的狀態」policy

現有 delete policy 只允許 `shared_by`（透過案件 `user_id` 反查）操作。新增一條 **update** policy：
```sql
create policy "shared_with can reject own share"
on case_shares for update
using (shared_with = auth.uid())
with check (shared_with = auth.uid());
```
分享對象透過這條 policy 只能更新自己（`shared_with = auth.uid()`）的列；`with check` 保證更新後仍是自己的列（不能把別人的分享改成自己名下）。應用層（`rejectShare()`）只送出 `{ status: 'rejected', rejected_at: now() }` 這兩個欄位的更新，不開放分享對象修改 `shared_by`/`case_id`。
擁有者「重新分享」沿用既有的 owner update 權限（若目前 owner 對 `case_shares` 沒有 update policy，需一併新增一條比照 delete policy 條件的 owner update policy，允許把 `status` 改回 `active` 並清空 `rejected_at`）。

### 案件可見性只需改一個 SECURITY DEFINER 函式，不需逐一改查詢

`case-readonly-share` 上線後的 RLS 遞迴修正（`20260712210000_fix_case_shares_rls_recursion.sql`）已把「這個案件是否分享給我」收斂成單一函式 `public.is_case_shared_with_me(p_case_id uuid)`，`cases`／`milestones`／`financials`／`redemption_steps` 的 SELECT policy 全部呼叫這個函式，沒有任何地方繞過它直接查 `case_shares`。因此本次只需要把這個函式改成：

```sql
CREATE OR REPLACE FUNCTION public.is_case_shared_with_me(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM case_shares
        WHERE case_shares.case_id = p_case_id
          AND case_shares.shared_with = auth.uid()
          AND case_shares.status = 'active'
    );
$$;
```

`CREATE OR REPLACE FUNCTION` 保留原簽名與既有 `GRANT EXECUTE`，policy 本身不需要重寫。這一步就足以讓被駁回的分享在 `cases`／`milestones`／`financials`／`redemption_steps` 全部一起失效，不需要逐一修改 `src/app/cases/page.tsx` 等前端查詢——那些查詢本來就是透過 RLS 才拿得到分享案件，不會繞過它。
唯一需要前端額外處理的是 `src/app/cases/page.tsx` 現有的 `case_shares (shared_by, shared_with)` embed select（用來組出 `sharedByName`/`sharedWithLabel` 顯示文字）：這個 select 目前沒有 `status` 篩選，需要新增 `status` 欄位並只取 `status = 'active'` 的列，否則擁有者端的「已分享給：」清單會把已駁回的人也列進去。

### 分享面板新增「已駁回」區塊

`useCaseShares` 的 `listShares()` 改為回傳所有狀態的列（不篩選），前端依 `status` 分成「使用中」與「已駁回」兩組渲染；`ShareCasePanel` 新增「已駁回」小節，顯示 `已駁回：${fullName}（${rejected_at 格式化日期}）` + 「重新分享」按鈕。

## Implementation Contract

**行為**：
1. 分享對象在自己看得到的案件畫面（案件詳情頁或案件卡片）觸發「駁回分享」動作 → 該案件從她自己的案件清單與詳情頁消失，且該操作不需要案件擁有者確認、也不觸發任何通知。
2. 案件擁有者打開該案件的 `ShareCasePanel` → 在「已駁回」區塊看到剛才那筆記錄（分享對象姓名 + 駁回時間），「使用中」名單不再包含該分享對象。
3. 擁有者點擊該筆記錄的「重新分享」→ 該分享對象重新出現在「使用中」名單、「已駁回」區塊移除該筆、分享對象重新能看到該案件。

**資料形狀**：
- `case_shares` 新增欄位：`status text not null default 'active'`（check `active`/`rejected`）、`rejected_at timestamptz null`。
- `CaseShare` 型別（`src/types/caseShare.ts`）新增 `status: 'active' | 'rejected'` 與 `rejected_at: string | null`。
- `caseShareService.ts` 新增 `rejectShare(supabase, caseId, sharedWithUserId)`（分享對象自己呼叫，更新 `status='rejected', rejected_at=now()`）與 `reactivateShare(supabase, caseId, sharedWithUserId)`（擁有者呼叫，更新 `status='active', rejected_at=null`）。
- `listShares()` 回傳值不再篩選 `status`，由呼叫端（`useCaseShares`）依 `status` 分組。
- `public.is_case_shared_with_me(p_case_id uuid)` 函式本體新增 `AND case_shares.status = 'active'` 條件，簽名與既有 `GRANT EXECUTE` 不變。
- `src/app/cases/page.tsx` 的 `case_shares (shared_by, shared_with)` embed select 改為 `case_shares (shared_by, shared_with, status)`，並在組出 `sharedWithLabel` 前先過濾 `status === 'active'`。

**失敗模式**：
- 分享對象嘗試駁回不屬於自己的分享列（`shared_with != auth.uid()`）→ RLS 擋下，`update` 回傳 0 rows affected；`rejectShare()` 比照現有 `toError()` 模式，若 `error` 存在才拋錯，0 rows 不視為錯誤（沿用現有 `addShare` 對 `UNIQUE_VIOLATION` 的「靜默視為成功」設計精神，但此處改為「靜默視為 no-op」，因為呼叫端只會用自己的 id 呼叫）。
- 擁有者嘗試重新分享一筆不存在或不屬於自己案件的記錄 → RLS 擋下，`toError()` 拋出，UI 顯示既有 `error` 狀態列。

**驗收條件**：
- `yarn test --testPathPatterns caseShareService` 涵蓋 `rejectShare`/`reactivateShare` 的成功與 RLS 拒絕情境（沿用現有 `caseShareService.test.ts` 的 mock 模式）。
- 手動驗證：兩個測試帳號，A 分享案件給 B，B 駁回後 A 的分享面板看到「已駁回：B」，B 的 `/cases` 清單不再出現該案件；A 點「重新分享」後 B 的 `/cases` 清單重新出現該案件。

**範圍邊界**：
- 僅涵蓋案件分享（`case_shares` 表）；其他分享機制（如有）不在範圍內。
- 不涉及分享對象案件清單以外的其他 `case_shares` 查詢點以外的程式（例如通知系統、稽核紀錄匯出）。

## Risks / Trade-offs

- [風險] `is_case_shared_with_me()` 是 `SECURITY DEFINER`，`CREATE OR REPLACE` 時若手滑改壞條件式（例如漏掉 `status = 'active'`），會讓所有被分享案件的可見性判斷同時出錯 → 緩解：migration 套用後手動驗證「駁回後案件消失、重新分享後案件回來」，並保留函式簽名與現有呼叫端完全不動，只改函式本體的 `WHERE` 條件。
- [風險] RLS update policy 條件寫錯（例如漏了 `with check`），可能讓分享對象改到別人的分享列 → 緩解：migration 內同時撰寫並跑一次 `get_advisors` 或等效安全檢查，且 `with check (shared_with = auth.uid())` 為必要條款。
- [風險] 前端「已駁回」與「使用中」分組邏輯放進同一個 `useCaseShares`，若排序/篩選寫錯可能讓已駁回的人誤植入分享名單 → 緩解：以 `status` 做 discriminated 分組，型別上避免遺漏。

## Migration Plan

1. 新增 `supabase/migrations/<timestamp>_add_case_share_status.sql`：新增 `status`、`rejected_at` 欄位（含 check constraint、預設值），既有資料全部視為 `active`（`default 'active'` 即可涵蓋，不需回填 script）。
2. 同一個 migration 內新增「分享對象可更新自己分享狀態」的 update RLS policy，以及（若尚無）「擁有者可更新自己案件分享狀態」的 update RLS policy。
3. 前端服務層與 hook、UI 依序修改（見 tasks）。
4. 無需 rollback 特殊處理：新欄位有預設值，新增 policy 若需回退可直接 `drop policy`。

## Open Questions

（無）
