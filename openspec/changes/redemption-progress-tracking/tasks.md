## 1. 資料庫 Schema

- [x] 1.1 新增 migration SQL 檔至 `supabase/migrations/`，建立 `redemption_steps` 資料表（欄位：`id uuid PK`、`case_id uuid FK→cases ON DELETE CASCADE`、`user_id uuid`、`step_number int`、`is_done bool DEFAULT false`、`done_date date`、`created_at`、`updated_at`）
- [x] 1.2 在 migration SQL 中設定 `(case_id, step_number)` 複合唯一鍵
- [x] 1.3 在 migration SQL 中建立 RLS Policy（`SELECT/INSERT/UPDATE/DELETE` 限制 `user_id = auth.uid()`）

## 2. 型別與常數

- [x] 2.1 在 `src/types/index.ts` 新增 `RedemptionStep` interface（欄位對應 DB schema）
- [x] 2.2 在 `src/lib/constants/caseConstants.ts` 新增 `REDEMPTION_STEPS` 常數陣列，包含 7 個步驟的 `step_number` 和 `label`

## 3. Server Action

- [x] 3.1 在 `src/app/actions/` 新增 `redemptionSteps.ts`，實作 `initRedemptionSteps(caseId)` — 批次 INSERT 7 筆初始記錄（`INSERT ... ON CONFLICT DO NOTHING`）
- [x] 3.2 在同檔案實作 `getRedemptionSteps(caseId)` — 查詢並回傳該案件的 7 筆步驟記錄
- [x] 3.3 在同檔案實作 `updateRedemptionStep(id, { is_done, done_date })` — 更新單筆步驟狀態

## 4. UI 元件

- [x] 4.1 建立 `src/components/features/redemptions/RedemptionProgressTracker.tsx`（Client Component）
  - 使用 `glass-card` 樣式容器
  - 呼叫 `initRedemptionSteps` + `getRedemptionSteps` 初始化資料
  - 顯示「N/7 步驟完成」進度摘要
- [x] 4.2 在 `RedemptionProgressTracker` 中渲染 7 個步驟列，每列包含：步驟編號、`label`、`<input type="checkbox">`、`<input type="date">`
- [x] 4.3 實作勾選邏輯：勾選時自動填入今日日期並呼叫 `updateRedemptionStep`；取消勾選時清空 `done_date` 並呼叫 `updateRedemptionStep`
- [x] 4.4 實作日期修改邏輯：日期欄 `onChange` 時呼叫 `updateRedemptionStep` 更新 `done_date`
- [x] 4.5 已完成步驟套用視覺標示（`line-through` 刪除線或綠色 checkmark icon）

## 5. 整合至案件詳情頁

- [x] 5.1 在案件詳情頁（`src/app/cases/[id]/page.tsx` 或相關子元件）找到代償相關區塊，引入並渲染 `RedemptionProgressTracker`，傳入 `caseId` prop
