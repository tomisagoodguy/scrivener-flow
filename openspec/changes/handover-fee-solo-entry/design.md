## Context

`handover_fees` 目前只有一種紀錄：付款人 → 收款人、金額必填、以 `paid_at` 判斷已收。`listUnpaidFees` 以 `paid_at is null` 取未收，新紀錄預設未收。使用者自己一個代書遞牌時沒有對口、不需收款追蹤，只要記件數或收入。

現有資料庫約束 `handover_fees_distinct_parties`（`payer <> payee`）與 `handover_fees_amount_positive`（`amount > 0`）遇到 NULL 結果為 NULL，CHECK 視為通過；複合外鍵為預設 MATCH SIMPLE，含 NULL 時不檢查。因此這三者不需要拆除。

互遞紀錄的付款人可能是使用者本人，系統不知道名單裡哪一位是「我」，所以互遞金額不等於收入。

## Goals / Non-Goals

**Goals:**

- 自己遞牌可只記件數，或同時記金額；一筆可代表多件。
- 自己遞牌完全不進收款流程。
- 歷史紀錄顯示當月統計，收入不被互遞金額污染。
- 既有互遞紀錄與流程行為不變。

**Non-Goals:**

- 不做跨月或年度報表，統計只看目前選的月份。
- 不做互遞紀錄的損益計算（需先定義名單裡誰是使用者本人）。
- 不把自己遞牌連結到案件（`cases`），物件編號維持手打文字。
- 不提供互遞與自己遞牌之間的類型轉換；要換類型就刪除後重建。

## Decisions

### 以 entry_type 欄位區分紀錄類型

`handover_fees` 新增 `entry_type text NOT NULL DEFAULT 'exchange'`（`exchange`／`solo`）與 `case_count integer NOT NULL DEFAULT 1`。既有紀錄與舊版程式碼的新增都會落在 `exchange`。

替代方案：另開 `solo_handover_entries` 表。查詢歷史要合併兩表、刪除與編輯邏輯要複製一份，違反單一事實來源，故不採用。

### 放寬 NOT NULL 並以形狀約束保護資料

migration 只對 `payer_scrivener_id`、`payee_scrivener_id`、`amount` 執行 `DROP NOT NULL`，再新增：

- `handover_fees_entry_type_valid`：`entry_type IN ('exchange','solo')`
- `handover_fees_case_count_positive`：`case_count > 0`
- `handover_fees_entry_shape`：`exchange` 必須有付款人、收款人、金額且 `case_count = 1`；`solo` 必須付款人、收款人為 NULL 且 `paid_at` 為 NULL

既有的 distinct_parties、amount_positive 與兩條外鍵保留不動，金額有值時仍必須大於 0。

### 自己遞牌使用獨立的 Schema 與 Server Action

新增 `createSoloFeeSchema`、`createSoloFee`、`updateSoloFee`，既有 `createHandoverFeeSchema`、`createHandoverFee`、`updateHandoverFee` 的驗證規則不改。

替代方案：把現有 schema 改成 discriminated union。兩種紀錄沒有共同的必填規則，union 會讓既有 refine 與名單檢查都要分支，風險落在已上線的互遞流程。共用的日期與物件編號欄位抽成同一份定義，避免重複。

### 紀錄類型建立後不可切換

`updateHandoverFee` 與 `setHandoverFeePaid` 查詢條件加上 `entry_type = 'exchange'`，`updateSoloFee` 加上 `entry_type = 'solo'`，類型不符時影響 0 列，回傳既有的「找不到紀錄，請重新整理」。編輯模式不顯示類型切換。

### 當月統計由歷史清單計算且分開呈現

純函式 `summarizeHistory(entries)` 由 `listFeeHistory` 已回傳的清單計算，放在 `src/domain/handover-fee/historySummary.ts`，不另查資料庫，因此統計與畫面列出的紀錄必定一致。

自己遞牌顯示「件數合計（`case_count` 加總）／金額合計」，互遞顯示「筆數／金額合計」。兩者不相加，理由見 Context。未填金額的自己遞牌計入件數，不計入金額。

### 表單拆成獨立的 SoloFeeForm

`HandoverFeeForm` 外層持有類型切換狀態，依類型渲染既有表單本體或新元件 `SoloFeeForm`（邏輯在 `useSoloFeeForm.ts`），避免單一元件超過 150 行。編輯時類型由紀錄決定：`editing?.entry_type ?? 切換狀態`。

## Implementation Contract

**資料形狀**

- `HandoverFee` 增加 `entry_type: 'exchange'`；`HandoverFeeWithNames` 其餘欄位不變。
- 新增 `SoloHandoverFee`：`id`、`entry_type: 'solo'`、`fee_date`、`object_number: string | null`、`case_count: number`、`amount: number | null`、`note: string | null`。
- 新增 `LedgerEntry = HandoverFeeWithNames | SoloHandoverFee`，以 `entry_type` 判別。`listFeeHistory` 回傳 `LedgerEntry[]`，`listUnpaidFees` 仍回傳 `HandoverFeeWithNames[]`。

**驗證（`createSoloFeeSchema`）**

- `case_count`：正整數，上限 9999，錯誤訊息 `件數必須是正整數`。上限是防手誤的設計值，非實測數據。
- `amount`：`null` 或正整數，上限與互遞相同，錯誤訊息 `金額必須是正整數`。
- 表單金額空白時送出 `null`。

**查詢**

- `listUnpaidFees` 增加 `entry_type = 'exchange'` 條件。
- `listFeeHistory` 有地政士篩選時沿用付款人或收款人比對，自己遞牌的這兩欄為 NULL，自然被排除。

**畫面**

- 自己遞牌列顯示日期、物件編號（無則 `—`）、`自己遞牌`、`N 件`、金額（無則 `—`）、備註、編輯、刪除；不顯示已收狀態與標記已收按鈕。
- 統計列只顯示該月有紀錄的類型；該月沒有任何紀錄時不顯示統計列。

**範圍內**：migration、型別與 schema、Server Actions、表單、歷史清單與統計、相關測試。

**範圍外**：`/cases` 其他分頁與排序、未收清單的畫面與帳齡邏輯、地政士名單管理。

## Risks / Trade-offs

- [新版程式碼先上線、migration 未執行時，`FEE_SELECT` 查不到 `entry_type`，遞牌費分頁讀取失敗] → 先執行 migration 再部署。migration 對舊版程式碼相容，因為預設值讓舊版新增落在 `exchange`。
- [自己遞牌未填金額時，金額合計低於實際收入] → 接受。金額選填是使用者需求，列上以 `—` 明確顯示未填。
- [地政士篩選時看不到自己遞牌] → 接受。自己遞牌沒有對象，篩選語意就是「與此人有關」；清除篩選即可看到。

## Migration Plan

1. 新增 migration 檔。因含 `DROP NOT NULL`，由使用者在 Supabase SQL Editor 執行，不用工具直接套用。
2. 以查詢驗證欄位與約束後，再部署程式碼。
3. 回滾：程式碼可直接還原，新欄位不影響舊版。若要還原 NOT NULL，需先刪除 `solo` 紀錄，執行前必須向使用者確認。

## Open Questions

（無）
