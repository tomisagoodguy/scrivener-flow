## 1. 資料庫

- [ ] 1.1 新增 `supabase/migrations/20261028120000_add_handover_fee_ledger.sql`，依「地政士名單獨立成 scriveners 表」與「遞牌費紀錄 handover_fees 表與資料庫層約束」建立兩表、唯一索引 `unique (user_id, name)`、`unique (id, user_id)`、複合外鍵、三條 check 約束與索引；依「RLS 以 user_id 隔離」為兩表啟用 RLS 並建立四條 policy（需求：Per-user data isolation）。只含 CREATE，不含 DROP。驗證：使用者套用後，以 SQL 查詢 `pg_constraint` 確認三條 check 與兩條複合外鍵存在、`pg_class.relrowsecurity` 為 true，並試插入 payer = payee 的列被拒。
- [ ] 1.2 在同一 migration 依「預設名單於首次讀取時以 RPC 建立」新增 `ensure_default_scriveners()`（`security invoker`）：使用者無任何 scriveners 列時依序插入 孔協、家華、定康、文慶、瑞麟、來慶、順鵬（sort_order 0–6），`on conflict (user_id, name) do nothing`（需求：Scrivener roster management）。[after: 1.1] 驗證：以 SQL 呼叫兩次，確認只有 7 列；把 7 列全部設 `archived_at` 後再呼叫，列數仍為 7。

## 2. 領域模型與純函式

- [x] 2.1 在 `src/domain/handover-fee/agingUtils.ts` 實作「台北時區日期與帳齡計算放在純函式」：`todayInTaipei`、`ageInDays`、`agingLevel`（需求：Unpaid fee list with aging highlight）。驗證：`yarn test --testPathPatterns handover-fee/agingUtils` 涵蓋 spec 的帳齡邊界表（0/3/4/7/8 天 → none/none/orange/orange/red），以及 UTC `2026-10-27T23:30:00Z` 時 `todayInTaipei` 回傳 `2026-10-28`。
- [x] 2.2 在 `src/domain/handover-fee/types.ts` 依「Zod 驗證作為單一事實來源」定義 `Scrivener`、`HandoverFee`、`HandoverFeeWithNames` 介面與 `createHandoverFeeSchema`（需求：Record a handover fee）。驗證：`yarn test --testPathPatterns handover-fee/types` 涵蓋 spec 驗證範例表的 6 個案例（同一人、0、-500、1500.5、空白物件編號、有效輸入），錯誤訊息為繁體中文並標出違反的規則。

## 3. Server Actions 與讀取

- [x] 3.1 在 `src/app/actions/handoverFees.ts` 實作 `createHandoverFee`、`setHandoverFeePaid`、`deleteHandoverFee`（需求：Record a handover fee、Mark a fee as received、Delete a handover fee record），未登入回 `{ error: 'Unauthorized' }`，Zod 或 DB 錯誤回 `{ error }`，成功後 `revalidatePath('/cases')`。[after: 2.2] 驗證：`yarn test --testPathPatterns handoverFees`（mock Supabase）確認無效輸入不呼叫 insert、`setHandoverFeePaid(id, true)` 寫入非 null 的 `paid_at`、`false` 寫入 null、刪除寫入 `deleted_at`。
- [x] 3.2 在同檔實作 `addScrivener`、`archiveScrivener`，包含「active 同名 → 錯誤」、「已隱藏同名 → 還原」、「新名 → sort_order 取最大值 + 1」三個分支（需求：Scrivener roster management）。[after: 3.1] 驗證：`yarn test --testPathPatterns handoverFees` 涵蓋三個分支與 trim 後空字串被拒。
- [x] 3.3 實作讀取函式 `listScrivenersWithDefaults`（先呼叫 `ensure_default_scriveners` RPC）、`listUnpaidFees`（未收且未刪除，`fee_date` 由舊到新）、`listFeeHistory({ month, scrivenerId })`（該月、未刪除、payer 或 payee 符合，`fee_date` 由新到舊），JOIN 帶出姓名並正確處理 Supabase JOIN 回傳型別（需求：Handover fee history with filters、Unpaid fee list with aging highlight）。[after: 3.2] 驗證：單元測試以 mock 斷言查詢條件包含 `deleted_at is null`、排序方向與 `or(payer..., payee...)` 篩選；spec 範例「2026-10 + 孔協」回傳順序為 10-12、10-05。

## 4. 介面

- [x] 4.1 實作新增表單 Client Component（`src/components/features/cases/handover-fee/`）：日期預設 `todayInTaipei()` 且可修改、物件編號、付款／收款下拉（只列 active 名單，最後一項「＋新增地政士」可就地新增）、⇄ 對調按鈕、金額、備註，送出呼叫 `createHandoverFee` 並顯示錯誤（需求：Record a handover fee、Scrivener roster management）。單一元件 ≤150 行，邏輯抽到 `useHandoverFeeForm.ts`。[after: 3.3] 驗證：React Testing Library 測試 ⇄ 對調 payer／payee、日期預設值、錯誤訊息顯示。
- [x] 4.2 實作未收款清單元件：顯示筆數與總額、依 `agingLevel` 套橘／紅底色（深色模式依 `dark-mode.md` 做法）、「已收」按鈕、刪除需確認、空狀態訊息（需求：Unpaid fee list with aging highlight、Mark a fee as received、Delete a handover fee record）。[after: 4.1] 驗證：RTL 測試 spec「3000 + 2000 未收、5000 已收」顯示 2 筆／5000，以及取消確認時不呼叫刪除。
- [x] 4.3 實作歷史紀錄元件：月份（預設本月）與地政士篩選寫入 URL 參數 `month`、`scrivener`，篩選選項只列 active 名單、已隱藏者在紀錄中仍顯示姓名，每列顯示已收狀態並提供「改回未收」與刪除，另提供名單管理（隱藏地政士）入口（需求：Handover fee history with filters、Scrivener roster management）。[after: 4.2] 驗證：RTL 測試已隱藏的 來慶 仍出現在紀錄、但不在篩選選項中。
- [ ] 4.4 依「分頁接入 cases 頁的 status 參數」修改 `src/app/cases/page.tsx`：在 `Pending` 之後新增 `💰 遞牌費` 分頁，`HandoverFee` 加入 `showMonitoringWidgets` 與案件列表 table 的排除條件，並渲染 Server Component `HandoverFeeView`（需求：Handover fee tab on cases page）。不改動既有排序與其他分頁。[after: 4.3] 驗證：`yarn tsc --noEmit` 與 `yarn eslint` 對改動檔無新錯誤；登入後實跑 `/cases?status=HandoverFee` 不顯示監控小卡與案件 table，`/cases?status=Processing` 照舊。

## 5. 整體驗收

- [ ] 5.1 端對端實跑（需登入；Per-user data isolation 以第二個帳號確認看不到第一個帳號的紀錄）：首次進入自動出現預設 7 人、新增一筆、標記已收後從未收清單消失、在歷史改回未收、刪除、新增／隱藏／還原地政士。[after: 4.4] 驗證：`yarn test --testPathPatterns handover` 全部通過，並附實跑截圖或操作紀錄。
