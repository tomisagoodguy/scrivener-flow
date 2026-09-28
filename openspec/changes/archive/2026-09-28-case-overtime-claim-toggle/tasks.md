## 1. 資料庫欄位：cases 表新增兩個獨立布林欄位

- [x] 1.1 新增 `supabase/migrations/<timestamp>_add_case_overtime_claimed_flags.sql`，為 `cases` 表新增 `buyer_overtime_claimed boolean not null default false`、`seller_overtime_claimed boolean not null default false` 兩欄位。驗證方式：在本機 Supabase 執行該 migration 後，`select buyer_overtime_claimed, seller_overtime_claimed from cases limit 1;` 可成功查詢且既有 row 值為 `false`。

## 2. 型別與資料查詢

- [x] 2.1 於 `src/types/index.ts` 的 `DemoCase` interface 新增 `buyer_overtime_claimed: boolean`、`seller_overtime_claimed: boolean` 兩個必要欄位。驗證方式：`yarn tsc --noEmit` 通過，且既有建構 `DemoCase` 物件的地方（如測試 fixture）若缺這兩欄位會出現型別錯誤，需一併補上。
- [x] 2.2 更新 `src/app/cases/page.tsx` 的 Supabase select 語句，加入 `buyer_overtime_claimed`、`seller_overtime_claimed` 兩欄位，使頁面查得的每筆案件資料包含這兩個布林值並傳入 `CaseTableRow`。驗證方式：於 `/cases` 頁面 Server Component 渲染結果中，任一案件物件 console 觀察（或型別檢查）確認兩欄位存在且為 boolean。

## 3. 狀態更新方式：Server Action，沿用 `caseService.ts`

- [x] 3.1 於 `src/services/caseService.ts` 新增 `setOvertimeClaimed(supabase: SupabaseClient, caseId: string, party: 'buyer' | 'seller', claimed: boolean): Promise<void>` 方法（風格比照既有 `updateCaseMemo`），更新對應的 `buyer_overtime_claimed` 或 `seller_overtime_claimed` 欄位。驗證方式：呼叫該方法更新一筆測試案件的 `buyer_overtime_claimed` 為 `true` 後，直接查詢資料庫確認該筆案件欄位值已變更；傳入非本人擁有案件的 `caseId` 時，因 RLS 阻擋更新失敗並拋出錯誤（回傳 `error` 而非靜默成功）。
- [x] 3.2 建立 `src/hooks/useOvertimeClaim.ts`（Client hook，比照 `useCaseTodos.ts` 的樂觀更新寫法），內部用 `src/lib/supabase/client.ts` 的 `createClient()` 呼叫 `setOvertimeClaimed`；不新增 Server Action、不新增 `route.ts`。驗證方式：在瀏覽器中點擊任一勾選鈕，Network 顯示對這筆案件的 Supabase REST/Realtime 更新請求，且 repo 中無新增的 `route.ts` 或 Server Action 檔案。

## 4. UI 呈現：買方欄/賣方欄內嵌小勾選鈕

- [x] 4.1 建立共用子元件 `src/components/features/cases/case-list/OvertimeClaimButton.tsx`（接受 `caseId`、`party`、`initialClaimed` props，內部呼叫 3.2 建立的 `useOvertimeClaim` hook）：`claimed` 為 `false` 時顯示醒目（橘色系）未登打樣式，為 `true` 時顯示中性完成樣式，點擊呼叫 hook 的 `toggle()`。驗證方式：手動於 `/cases` 頁面點擊某案件的按鈕，畫面立即由未登打樣式切換為已登打樣式，reload 頁面後狀態保持。
- [x] 4.2 在 `CaseTableRow.tsx` 買方欄、賣方欄各自引用一次 `OvertimeClaimButton`（買方傳入 `party="buyer"` + `caseData.buyer_overtime_claimed`，賣方傳入 `party="seller"` + `caseData.seller_overtime_claimed`），兩者狀態互不影響。驗證方式：手動測試切換賣方按鈕不改變同一列買方按鈕的狀態，反之亦然。
- [x] 4.3 確認以子元件抽出後 `CaseTableRow.tsx` 未因本次變更而新增大量行數（維持每方僅一行 JSX 引用）。驗證方式：檢查 `CaseTableRow.tsx` 買方欄、賣方欄的變更僅各新增一行 `<OvertimeClaimButton ... />` 引用，按鈕樣式與點擊邏輯全數位於 `OvertimeClaimButton.tsx`。
- [x] 4.4 實作更新失敗時的樂觀更新還原與錯誤提示（`useOvertimeClaim` hook 內用 `useNotification.ts` 顯示 toast）。驗證方式：暫時模擬 `setOvertimeClaimed` 呼叫拋出錯誤（例如暫時修改測試程式碼讓其 reject），確認點擊後勾選鈕視覺還原為更新前狀態且畫面出現非阻斷式錯誤 toast，接著還原模擬程式碼。

## 5. 驗收確認

- [x] 5.1 逐條核對 spec `case-overtime-claim-toggle` 四項需求（independent buyer/seller overtime-claimed flags、manual toggle control in case list、distinct unclaimed visual treatment、persisted state survives reload and cross-device access）皆有對應行為與手動驗證通過。驗證方式：在 `/cases` 頁面完整走過一次：切換買方勾選鈕不影響賣方與蓋印章待辦、切換後視覺樣式正確、reload 後狀態保留、模擬失敗時正確還原。
- [x] 5.2 執行 `yarn lint` 與 `yarn tsc --noEmit` 確認本次變更的檔案無型別或 lint 錯誤。驗證方式：兩個指令皆以 exit code 0 結束，且輸出不含本次變更檔案的新增錯誤。
