## Why

案件擁有者（代書）可以把案件分享給同事唯讀檢視。目前同事若不想再看到某案件，唯一辦法是請案件擁有者手動移除分享——沒有讓分享對象自行退出的管道。實務上代書常忘記重新分享，導致同事一直看不到最新案件內容，卻又無從得知自己是不是漏看了什麼。需要讓分享對象能自行「駁回」一筆分享，並讓案件擁有者在自己的分享面板上看到駁回紀錄，自行決定要不要重新分享。

## What Changes

- 新增「駁回分享」能力：分享對象（`shared_with`）可以在自己看得到的案件畫面上，將某筆分享標記為駁回，等同從自己的案件清單移除該案件，且不需要案件擁有者的操作或確認。
- `case_shares` 資料表新增 `status`（`active` | `rejected`）與 `rejected_at` 欄位，駁回動作是更新既有列的狀態（`status = 'rejected'`、寫入 `rejected_at`），而非刪除該列，讓駁回紀錄可供擁有者查詢。
- 分享對象查詢自己可見案件清單時，只納入 `status = 'active'` 的分享列，`rejected` 狀態的分享不會再出現在她的案件列表或案件詳情頁。
- 案件擁有者的分享面板（`ShareCasePanel` / `useCaseShares`）新增「已駁回」區塊：列出該案件被誰駁回、駁回時間，並提供「重新分享」按鈕（把該筆分享的 `status` 改回 `active`，清除 `rejected_at`）。
- 新增 RLS policy，允許 `shared_with` 使用者更新（僅限 `status`/`rejected_at` 欄位）自己那筆 `case_shares` 記錄；既有「僅擁有者可刪除分享」的 delete policy 維持不變（重新分享用擁有者既有的 update 權限或新增對應 owner update policy 達成，不透過 delete）。

## Non-Goals

- 不做即時推播通知（例如跳出通知、Email、LINE 訊息通知擁有者）。擁有者只在自己主動打開該案件的分享面板時才會看到駁回提醒。
- 不提供「駁回原因」欄位或留言功能，駁回是無聲的單純狀態切換。
- 不處理擁有者主動移除分享（既有 `removeShare` / 刪除流程）的行為變更，該流程維持硬刪除，僅新增的「駁回」走 `status` 更新。
- 不新增全域通知中心或案件列表小紅點；提醒只出現在該案件的分享面板內。

## Capabilities

### New Capabilities

- `case-share-rejection`: 分享對象可自行駁回案件分享（狀態式軟移除），案件擁有者可在分享面板查詢駁回紀錄並一鍵重新分享。

### Modified Capabilities

(none)

## Impact

- Affected specs: `case-share-rejection`（新增）
- Affected code:
  - New:
    - `supabase/migrations/<timestamp>_add_case_share_status.sql`
  - Modified:
    - `src/types/caseShare.ts`
    - `src/services/caseShareService.ts`
    - `src/components/features/cases/edit-case/useCaseShares.ts`
    - `src/components/features/cases/ShareCasePanel.tsx`
    - `src/app/cases/page.tsx`（`case_shares` embed select 補上 `status` 欄位並過濾 `active`）
    - `public.is_case_shared_with_me` 資料庫函式（`CREATE OR REPLACE`，加上 `status = 'active'` 條件，讓 `cases`/`milestones`/`financials`/`redemption_steps` 的既有 RLS policy 自動套用）
