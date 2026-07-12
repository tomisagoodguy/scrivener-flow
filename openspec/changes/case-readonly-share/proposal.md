## Why

代書團隊成員間常需要就特定案件討論（例如請同事協助確認條款、代為聯繫銀行），但目前案件資料完全綁定在建立者的 `user_id` 下，RLS 只允許擁有者存取。同事若沒有帳號層級的存取權，即使系統內建聊天（`in-app-chat`）也無法讓對方看到案件的實際內容，只能用文字複誦或截圖，容易漏傳或過時。需要一個受控的唯讀分享機制，讓案件擁有者可以主動把特定案件開放給指定同事檢視。

## What Changes

- 案件編輯畫面（`EditCaseForm` 及其 `edit-case/` 子區塊）新增「分享」按鈕，開啟分享管理面板。
- 分享面板可搜尋公司內已登入使用者（比照 `in-app-chat` 的使用者選擇器），將其加入該案件的分享名單，或從名單移除。
- 新增 `case_shares` 資料表記錄「哪個案件」分享給「哪個使用者」，記錄分享者與分享時間。
- 被分享的使用者登入後，可在案件列表 / 詳情頁看到該案件（標示「他人分享」來源），並可檢視案件全部資訊：基本資料、里程碑、財務、待辦、備忘錄、聊天記錄等。
- 新增 RLS Policy：被分享者對 `cases` 及其關聯表（`milestones`、`financials`、`todos` 等）僅有 `SELECT` 權限，沒有 `INSERT`/`UPDATE`/`DELETE` 權限；只有案件擁有者（`user_id = auth.uid()`）保留完整讀寫權限。
- 被分享者在 UI 上所有編輯欄位、操作按鈕（新增里程碑、修改財務、刪除待辦等）皆隱藏或停用，避免誤觸後才被資料庫拒絕。
- 案件擁有者可隨時在分享面板移除某位同事的存取權，移除後對方立即無法再讀取（RLS 即時生效）。

## Capabilities

### New Capabilities

- `case-readonly-share`: 案件擁有者可將案件唯讀分享給指定同事，被分享者可檢視案件全部資訊但無法修改，擁有者可隨時管理（新增/移除）分享對象。

### Modified Capabilities

（無，本次不變更既有 capability 的需求）

## Impact

- Affected specs: `case-readonly-share`（新增）
- Affected code:
  - New:
    - `supabase/migrations/<timestamp>_add_case_shares.sql`
    - `src/types/caseShare.ts`
    - `src/services/caseShareService.ts`
    - `src/components/features/cases/ShareCaseButton.tsx`
    - `src/components/features/cases/ShareCasePanel.tsx`
    - `src/components/features/cases/edit-case/useCaseShares.ts`
  - Modified:
    - `src/types/index.ts`（`Case`/`DemoCase` 型別補上 `isOwnedByCurrentUser` 等來源標記）
    - `src/services/caseService.ts`（查詢案件清單時納入被分享案件）
    - `src/components/features/cases/EditCaseForm.tsx` 與 `edit-case/`（MilestonesSection、TaxDeadlinesSection 等）（加入分享按鈕、依唯讀狀態隱藏編輯操作）
    - `src/components/features/redemptions/RedemptionProgressTracker.tsx`（依唯讀狀態隱藏編輯操作）
    - `src/app/cases/page.tsx`（案件列表納入被分享案件，並標示分享來源）
    - `src/app/cases/[id]/page.tsx`（掛載分享按鈕進入點）
