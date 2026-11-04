## 1. 資料庫

- [x] 1.1 新增 migration 檔（命名 `supabase/migrations/<timestamp>_handover_fee_solo_entry.sql`），依決策「以 entry_type 欄位區分紀錄類型」與「放寬 NOT NULL 並以形狀約束保護資料」加入 `entry_type`、`case_count`，放寬付款人、收款人、金額的 NOT NULL，新增三條約束；既有紀錄全部成為 `exchange`（需求：Solo entries have no receipt tracking）。含 DROP NOT NULL，由使用者在 SQL Editor 執行，不用工具套用。驗證：執行後查 `information_schema.columns` 三欄 `is_nullable = 'YES'`、`pg_constraint` 有三條新約束且 distinct_parties、amount_positive 仍在，並查 `handover_fees` 確認所有既有列 `entry_type = 'exchange'`、`case_count = 1`。

## 2. 領域模型

- [x] 2.1 依決策「自己遞牌使用獨立的 Schema 與 Server Action」在 `src/domain/handover-fee/types.ts` 新增 `SoloHandoverFee`、`LedgerEntry`、`createSoloFeeSchema`，`HandoverFee` 加 `entry_type: 'exchange'`，日期與物件編號欄位抽成共用定義（需求：Record a solo handover entry）。驗證：`yarn test --testPathPatterns handover-fee/__tests__/types` 涵蓋 spec「solo validation cases」全部 9 列，且既有互遞驗證測試維持通過。
- [x] 2.2 依決策「當月統計由歷史清單計算且分開呈現」新增純函式 `summarizeHistory`（`src/domain/handover-fee/historySummary.ts`），回傳自己遞牌的件數與金額合計、互遞的筆數與金額合計（需求：Monthly history summary）。[after: 2.1] 驗證：`yarn test --testPathPatterns historySummary` 斷言 spec 範例得到自己遞牌 4 件 9000、互遞 2 筆 5000，未填金額不影響金額合計，空陣列兩類皆為 0。

## 3. Server Actions

- [x] 3.1 在 `src/app/actions/handoverFees.ts` 實作 `createSoloFee`、`updateSoloFee`，未登入回 `{ error: 'Unauthorized' }`，不查地政士名單，寫入 `entry_type: 'solo'` 與 null 的付款人、收款人（需求：Record a solo handover entry、Edit a solo handover entry）。[after: 2.1] 驗證：`yarn test --testPathPatterns actions/__tests__/handoverFees` 斷言無效輸入不呼叫 insert、空金額寫入 `amount: null`、更新條件含 `entry_type = 'solo'` 且 0 列回「找不到紀錄，請重新整理」。
- [x] 3.2 依決策「紀錄類型建立後不可切換」在 `updateHandoverFee` 與 `setHandoverFeePaid` 加上 `entry_type = 'exchange'` 條件，`listUnpaidFees` 只取互遞（需求：Solo entries have no receipt tracking）。[after: 3.1] 驗證：同一測試檔斷言三者的查詢都帶 `entry_type = 'exchange'`，對自己遞牌標記已收回「找不到紀錄，請重新整理」，既有互遞測試維持通過（fixture 補上 `entry_type`）。
- [x] 3.3 `FEE_SELECT` 加入 `entry_type`、`case_count`，`listFeeHistory` 依 `entry_type` 轉成 `LedgerEntry`，自己遞牌不帶地政士姓名（需求：Handover fee history with filters）。[after: 3.2] 驗證：同一測試檔斷言回傳含 `entry_type: 'solo'` 的項目保留 `case_count` 與 null 金額，互遞項目保留 `payer_name`、`payee_name`。

## 4. 畫面

- [x] 4.1 依決策「表單拆成獨立的 SoloFeeForm」新增 `SoloFeeForm.tsx` 與 `useSoloFeeForm.ts`，`HandoverFeeForm` 外層加「互遞／自己遞牌」切換，名單為空時自己遞牌仍可送出，新增成功後清空欄位且件數回到 1（需求：Record a solo handover entry）。[after: 3.1] 驗證：RTL 測試涵蓋切換後顯示件數欄且不顯示付款人、件數預設 1、空金額送出 `amount: null`、無效件數顯示 `件數必須是正整數`；`SoloFeeForm.tsx` 與 `HandoverFeeForm.tsx` 各 ≤150 行。
- [x] 4.2 `HandoverFeeEditContext` 改收 `LedgerEntry`，編輯時依紀錄類型顯示對應表單且不顯示類型切換，存檔呼叫 `updateSoloFee`，成功或取消後回到新增模式（需求：Edit a solo handover entry）。[after: 4.1] 驗證：RTL 測試涵蓋 spec「Edit a solo entry」（件數改 4、金額改 12000，呼叫 `updateSoloFee` 且不呼叫 `createSoloFee`）、「Cancel editing a solo entry」、「Type is fixed while editing」，既有 `HandoverFeeEdit.test.tsx` 維持通過。
- [x] 4.3 `FeeHistory` 依類型渲染列：自己遞牌顯示 `自己遞牌`、`N 件`、金額或 `—`，只有編輯與刪除，不顯示已收狀態；上方加統計列，兩類分開且省略沒有紀錄的類型（需求：Handover fee history with filters、Monthly history summary）。[after: 2.2, 3.3, 4.2] 驗證：`yarn test --testPathPatterns FeeHistory` 斷言自己遞牌列沒有「標記已收」按鈕、統計顯示 4 件與 2 筆且未相加、空月份沒有統計列；`FeeHistory.tsx` ≤150 行，超過時把列或統計拆成獨立元件。

## 5. 驗收

- [x] 5.1 全面驗證所有需求（Record a solo handover entry、Edit a solo handover entry、Solo entries have no receipt tracking、Monthly history summary、Handover fee history with filters）。[after: 1.1, 4.3] 驗證：`yarn tsc --noEmit`、`yarn eslint` 對改動檔無新錯誤、`yarn test --testPathPatterns handover` 全數通過；使用者執行 migration 後登入實跑 `/cases?status=HandoverFee`：新增「3 件、無金額」與「2 件、6000」兩筆，確認未收清單沒有這兩筆、歷史統計為 5 件 6000、既有互遞紀錄仍可標記已收，並把結果寫回本任務。

  > 驗收結果（2026-11-04）：`yarn test --testPathPatterns handover` 10 suites、138 tests 全過；`yarn tsc --noEmit` 與改動檔 `yarn eslint` 無錯誤。migration 由使用者在 SQL Editor 執行後，以 SQL 查得三欄 `is_nullable = YES`、三條新約束與 distinct_parties、amount_positive、兩條外鍵皆在，既有 1 筆為 `exchange`、`case_count = 1`。commit 661e5a3a 部署後，使用者登入 production 實跑 `/cases?status=HandoverFee` 回報全部正常：新增「3 件、無金額」與「2 件、6000」，兩筆不在未收清單，歷史統計為自己遞牌 5 件 $6,000，地政士篩選時兩筆消失，既有互遞紀錄可標記已收。

  > 審查後修正（2026-11-04）：verify 與 review 指出金額欄 `type="number"` 遇到無法解析的內容會讀成空字串，選填欄位因而被當成未填。改為文字輸入後由 schema 拒絕，補上無法解析金額、一件一筆、編輯載入全部欄位的測試。修正前 4 個新測試失敗，修正後 `yarn test --testPathPatterns handover` 10 suites、143 tests 全過，`yarn tsc --noEmit` 與 `yarn eslint` 無錯誤。此修正未在瀏覽器重新實測。
