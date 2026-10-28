## Context

使用者（地政士）與其他地政士互相遞牌，產生遞牌費。實務上當天結清，系統只需記錄並追蹤「還沒收到」的款項，屬低頻率的個人紀錄。

現況：`/cases` 頁（`src/app/cases/page.tsx`，Server Component）以 `status` URL 參數切換分頁：`Processing`、`Closed`、`Memo`、`Timeline`、`Pending`。`Memo`/`Timeline`/`Pending` 會被排除在 `showMonitoringWidgets` 條件與案件列表 table 的渲染條件之外。專案沒有既有的「地政士名單」或「台北時區今天」共用函式。Schema 只走 `supabase/migrations/*.sql`，資料突變走 Server Actions（`src/app/actions/`），Server 端用 `src/lib/supabase/server.ts`（受 RLS）。

## Goals / Non-Goals

**Goals:**

- 在 `/cases` 新增「💰 遞牌費」分頁，記錄、追蹤未收、查歷史。
- 地政士名單可新增、隱藏，首次使用自動建立預設 7 人。
- 以 RLS 做每位使用者的資料隔離。

**Non-Goals:**

- 首頁摘要卡片、LINE／Email 未收提醒。
- 當日平分、月結互抵、清償建議計算。
- 與 `cases` 表關聯（物件編號只是文字）。
- 名單排序拖曳、改名。

## Decisions

### 地政士名單獨立成 scriveners 表

付款人與收款人都是 `scriveners.id` 外鍵，不存姓名字串。理由：名單可新增、隱藏，歷史紀錄仍需顯示原姓名；外鍵確保拼字一致，篩選「某人相關紀錄」只要比對 id。
替代方案：在 `handover_fees` 存姓名文字 → 拼字不一致會讓篩選失準，否決。
`scriveners` 欄位：`id uuid pk`、`user_id uuid not null references auth.users`、`name text not null`、`sort_order int not null default 0`、`archived_at timestamptz null`、`created_at`。唯一索引 `unique (user_id, name)`（不論是否隱藏），讓「新增已隱藏的同名者」走還原路徑，不會產生重複。

### 遞牌費紀錄 handover_fees 表與資料庫層約束

欄位：`id`、`user_id`、`fee_date date not null`、`object_number text not null`、`payer_scrivener_id uuid not null`、`payee_scrivener_id uuid not null`、`amount integer not null`、`paid_at timestamptz null`、`note text null`、`deleted_at timestamptz null`、`created_at`。
「已收」以 `paid_at is not null` 表示，不另設 boolean 欄位，避免兩個欄位不同步。
DB 約束：`check (payer_scrivener_id <> payee_scrivener_id)`、`check (amount > 0)`、`check (length(btrim(object_number)) > 0)`。
跨使用者引用防護：以複合外鍵 `(payer_scrivener_id, user_id) references scriveners(id, user_id)`（payee 同理），`scriveners` 加 `unique (id, user_id)`。如此即使繞過前端，也無法引用他人名單。
索引：`(user_id, fee_date)`，以及未收清單用的部分索引 `(user_id, fee_date) where paid_at is null and deleted_at is null`。

### RLS 以 user_id 隔離

兩表皆 `enable row level security`，SELECT/INSERT/UPDATE/DELETE 四條 policy 都是 `user_id = auth.uid()`（INSERT/UPDATE 用 `with check`）。不需要 `service.ts`。

### 預設名單於首次讀取時以 RPC 建立

預設 7 人無法寫在 migration（migration 執行時不知道有哪些使用者，新使用者也要有）。改成 RPC `ensure_default_scriveners()`（`security invoker`）：若 `auth.uid()` 在 `scriveners` 中**一筆都沒有**（含已隱藏），就依序插入 孔協、家華、定康、文慶、瑞麟、來慶、順鵬（sort_order 0–6），以 `on conflict (user_id, name) do nothing` 避免兩個分頁同時開啟時的競態。使用者把全部人隱藏後不會再重建，因為已隱藏的列仍存在。
替代方案：在 Server Action 中先 count 再 insert → 兩個請求同時進來會重複插入；交給 DB 的唯一索引 + `on conflict` 才可靠。

### 分頁接入 cases 頁的 status 參數

沿用現有 `status` 切換機制，新增 `{ label: '💰 遞牌費', value: 'HandoverFee' }`，放在 `Pending` 之後。`showMonitoringWidgets` 與案件列表 table 的排除條件都加入 `HandoverFee`。`statusParam === 'HandoverFee'` 時渲染 `HandoverFeeView`。
`HandoverFeeView` 是 Server Component：呼叫 `ensure_default_scriveners`，再讀取名單、未收清單、歷史（依 `month`、`scrivener` URL 參數），把資料傳給子元件；互動部分（表單、已收、刪除、新增名單、篩選）是 Client Component，透過 Server Actions 寫入後 `revalidatePath('/cases')`。
不影響 `/cases` 既有的里程碑排序與其他分頁。

### 台北時區日期與帳齡計算放在純函式

`src/domain/handover-fee/agingUtils.ts` 提供：
- `todayInTaipei(now?: Date): string`：用 `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' })` 取得 `YYYY-MM-DD`。
- `ageInDays(feeDate: string, today: string): number`：兩個日期字串以 UTC 午夜換算的整數天差。
- `agingLevel(age: number): 'none' | 'orange' | 'red'`：`age > 7` → red，`age > 3` → orange，否則 none。
畫面呈現：未收清單每列以左側色條（`border-l-orange-400`／`border-l-red-500`）加帳齡文字色表示，不用底色——`dark-theme.css` 會以 `!important` 覆蓋圓角／白底元素的背景色（見 `.claude/rules/dark-mode.md`），邊框與文字色不受影響。
純函式可單元測試，避免伺服器 UTC 與台灣日期差一天的問題（例如台灣早上 7 點，UTC 仍是前一天）。

### Zod 驗證作為單一事實來源

`src/domain/handover-fee/types.ts` 定義 `Scrivener`、`HandoverFee` 介面，以及 `createHandoverFeeSchema`（Zod）：`fee_date` 符合 `YYYY-MM-DD`、`object_number` trim 後非空、`amount` 為正整數、兩個 scrivener id 為 uuid，並以 `refine` 檢查 payer ≠ payee。Server Action 與 Client 表單共用此 schema；DB 約束是最後一道防線。錯誤訊息用繁體中文，直接標出違反哪條規則。

### 物件編號改為選填並以後續 migration 放寬

**Supersedes**: handover-fee-ledger / 遞牌費紀錄 handover_fees 表與資料庫層約束

2026-10-29 使用者表示物件編號不一定要填。原 migration 已在 Supabase 套用，不能改舊檔，改新增 `supabase/migrations/20261029120000_handover_fee_object_number_optional.sql`：`alter column object_number drop not null`、`drop constraint handover_fees_object_number_not_blank`、改加 `handover_fees_object_number_null_or_not_blank check (object_number is null or length(btrim(object_number)) > 0)`。空白一律存成 null（不存空字串），DB 約束確保只有 null 或有內容兩種狀態，讀取端只需處理 null。
Zod：`object_number` 改為選填字串，trim 後空字串轉成 `null`。`HandoverFee.object_number` 型別改為 `string | null`，清單與歷史在 null 時顯示 `—`，刪除確認訊息在 null 時改用日期描述該筆。
此 migration 含 DROP，依專案規則由使用者在 SQL Editor 執行，執行後以 `information_schema.columns.is_nullable` 與 `pg_constraint` 查詢驗證。
替代方案：保留 NOT NULL、空白存 `''` → 需要同時放寬 check，且讀取端要分辨 `''` 與 null，否決。

### 編輯沿用新增表單

**Supersedes**: handover-fee-ledger / Zod 驗證作為單一事實來源

原本 Non-Goal「不編輯，打錯就刪除重新新增」取消。未收清單與歷史每列加「編輯」按鈕，按下後把該筆資料載入頁面上方同一個表單，表單進入編輯模式（標題改「編輯遞牌費」、送出鈕改「儲存修改」、多一顆「取消編輯」）。存檔呼叫新的 Server Action `updateHandoverFee(id, input)`，與新增共用 `createHandoverFeeSchema` 與「付款人/收款人須為本人使用中名單」檢查。
清單元件與表單在不同 Client Component，以 `HandoverFeeEditProvider`（React Context，只存「目前正在編輯的那筆紀錄」）串接，避免把狀態提升到 Server Component。
`updateHandoverFee` 只更新 `fee_date`、`object_number`、`payer_scrivener_id`、`payee_scrivener_id`、`amount`、`note`，不碰 `paid_at`，所以已收狀態不變；條件加 `deleted_at is null`，影響 0 列回「找不到紀錄，請重新整理」。
替代方案：每列行內編輯（inline edit）→ 每列都要一組表單欄位與付款人選單，元件超過 150 行上限且手機難操作，否決。

## Implementation Contract

**行為**
- `/cases?status=HandoverFee` 顯示三塊：新增表單、未收款清單（主區塊，含筆數與總額、帳齡著色、「已收」與刪除按鈕）、歷史紀錄（月份與地政士篩選、已收狀態、「改回未收」與刪除）。
- 未收清單依 `fee_date` 由舊到新；歷史依 `fee_date` 由新到舊；兩者都排除 `deleted_at is not null`。
- 地政士篩選比對 payer 或 payee 任一方。

**介面（Server Actions，`src/app/actions/handoverFees.ts`，皆回傳 `{ success: true } | { success: false; error: string }`（讀取函式成功時另帶 `data`））**
- `createHandoverFee(input: CreateHandoverFeeInput)`
- `setHandoverFeePaid(id: string, paid: boolean)`：`paid=true` 設 `paid_at=now()`，`false` 設為 null
- `updateHandoverFee(id: string, input: CreateHandoverFeeInput)`：驗證同新增；只改六個內容欄位，不改 `paid_at`；目標已刪除或不存在時回 `{ success: false, error: '找不到紀錄，請重新整理' }`
- `deleteHandoverFee(id: string)`：設 `deleted_at=now()`
- `addScrivener(name: string)`：trim 後空字串 → error；同名且 active → error「已有同名地政士」；同名且已隱藏 → 清除 `archived_at`（還原）；否則 insert，`sort_order` = 目前最大值 + 1
- `archiveScrivener(id: string)`：設 `archived_at=now()`

讀取函式（Server 端）：`listScrivenersWithDefaults()`、`listUnpaidFees()`、`listFeeHistory({ month: 'YYYY-MM', scrivenerId?: string })`，查詢以 JOIN 帶出 payer/payee 姓名（注意 Supabase JOIN 回傳型別，取值前做陣列／物件判斷）。

**失敗模式**
- 未登入：所有 action 回 `{ error: 'Unauthorized' }`。
- Zod 驗證失敗：回第一條錯誤訊息，表單顯示，不寫入。
- DB 錯誤（含約束違反、RLS 擋下）：回 `{ error: error.message }`，UI 顯示錯誤，禁止吞掉。
- `ensure_default_scriveners` 失敗：頁面顯示錯誤訊息，名單區塊仍可手動新增。

**驗收**
- `yarn test --testPathPatterns handover` 通過：agingUtils 邊界表（0/3/4/7/8 天）、`todayInTaipei` 跨日案例、Zod schema 驗證表、Server Actions（mock Supabase）的新增／還原／重複名稱分支。
- `yarn tsc --noEmit` 無新錯誤；`yarn eslint` 對改動檔無錯誤。
- Migration 套用後以 SQL 驗證：約束存在、RLS 啟用、跨使用者引用被複合外鍵擋下。
- 登入後實跑 `/cases?status=HandoverFee`：新增、已收、改回未收、刪除、篩選、新增／隱藏／還原名單。

**範圍**
- 範圍內：上述 migration、domain、actions、元件，以及 `src/app/cases/page.tsx` 的分頁與兩個排除條件。
- 範圍外：Non-Goals 所列項目；`/cases` 其他分頁與排序行為不得改變。

## Risks / Trade-offs

- [伺服器時區為 UTC，「今天」算錯一天] → 一律透過 `todayInTaipei()` 取得日期，並以跨日案例測試。
- [複合外鍵需要 `scriveners` 額外的 `unique (id, user_id)`] → 多一個索引，資料量極小，可接受；換來 DB 層的跨使用者防護。
- [名單唯一索引不分是否隱藏，使用者無法建立與已隱藏者同名的「另一個人」] → 實務上同名即同一人，以還原處理符合預期。
- [`/cases` 頁會先查一次 cases 資料，即使在遞牌費分頁也一樣] → 維持現狀不重構該頁的查詢，避免擴大範圍；低頻功能可接受。

## Migration Plan

1. 新增 `supabase/migrations/20261028120000_add_handover_fee_ledger.sql`：建立兩表、約束、索引、RLS policy、`ensure_default_scriveners()` RPC。只新增物件，無 DROP，不影響既有資料。
2. 由使用者在 Supabase 套用 migration，再以查詢驗證（已於 2026-10-29 套用）。
3. 新增 `supabase/migrations/20261029120000_handover_fee_object_number_optional.sql` 放寬物件編號（含 DROP，由使用者在 SQL Editor 執行），再以查詢驗證。既有資料的物件編號都有值，放寬不影響既有列。
4. 回滾：移除分頁入口即可停用功能；資料表保留不影響其他功能。
