## Context

`/cases` 案件列表（`src/app/cases/page.tsx` Server Component）以 Supabase JOIN 一次拉齊案件資料（含 `milestones`），逐列交給 `src/components/features/cases/case-list/CaseTableRow.tsx` 渲染。買方欄、賣方欄目前只顯示 `buyer_name`、`seller_name` 純文字。案件的「買方蓋印章」「賣方蓋印章」是 `SIGNING_TODOS` 常數清單中的待辦項目（`caseData.todos`），與 `cases` 表的欄位無關。

本變更要新增的「加班費是否已登打」狀態，語意上與蓋印章待辦完全脫鉤：蓋印章是現場事實，加班費登打是事後行政動作，兩者發生時間不同步，因此不能借用或連動既有 `SIGNING_TODOS` 待辦邏輯，必須是 `cases` 表上獨立的兩個布林欄位。

## Goals / Non-Goals

**Goals:**

- 買方欄、賣方欄各自提供一個可點擊切換的勾選鈕，代表該方加班費是否已登打進公司系統。
- 狀態寫入 `cases` 表兩個新欄位，跨裝置、重新整理後狀態保持一致。
- 未登打時在視覺上明顯區別於已登打，讓代書掃過列表就能抓到遺漏。

**Non-Goals:**

- 不與 `SIGNING_TODOS`（買方蓋印章/賣方蓋印章待辦）自動連動或互相觸發。
- 不記錄金額、時數、登打時間戳，只記錄布林狀態。
- 不做主動通知（LINE、Email、彈窗提醒）。
- 不新增獨立頁面或報表彙整所有未登打案件（本次僅在案件列表逐列呈現）。

## Decisions

### 資料庫欄位：cases 表新增兩個獨立布林欄位

新增 `buyer_overtime_claimed boolean not null default false`、`seller_overtime_claimed boolean not null default false` 於 `cases` 表，透過 `supabase/migrations/` 新增 SQL migration（禁止 Prisma migrate / Supabase UI 手動操作，依專案 `database.md` 規則）。

**為什麼不用既有 `todos` 表**：`todos` 表是待辦事項（含軟刪除、`source_key` 去重、里程碑自動生成邏輯），語意上是「要做的事」；加班費登打是「案件屬性的是/否記錄」，用獨立布林欄位比借用 `todos` 表更單純，且完全避開既有待辦的自動生成/去重機制，不會互相干擾。

**為什麼是兩個獨立欄位而非一個 JSON/enum**：買方、賣方各報一次、彼此獨立勾選/取消，兩個獨立布林欄位最直接，查詢與 RLS 權限判斷也最簡單。

### 狀態更新方式：Server Action，沿用 `caseService.ts`

實作時發現本專案對「案件列表內單一欄位更新」已有既定慣例，與 `components.md` 泛用規則（資料突變優先 Server Actions）不同：`src/hooks/useCaseTodos.ts`、`src/components/features/cases/CaseMemoCard.tsx`（呼叫 `caseService.updateCaseMemo`）皆是 **Client Component 用 `src/lib/supabase/client.ts` 的 `createClient()` 直接呼叫 `caseService.ts` 的方法**，非 Server Action、非新 API Route，一樣受 RLS 保護（只能改自己擁有的案件）。為與既有案件列表寫入模式一致，本變更依樣在 `caseService.ts` 新增 `setOvertimeClaimed(supabase, caseId, party, claimed)`（簽章比照 `updateCaseMemo(supabase, caseId, field, value)`），由 Client 端 hook 傳入 `createClient()` 呼叫，不建立 Server Action。

### UI 呈現：買方欄/賣方欄內嵌小勾選鈕

在 `CaseTableRow.tsx` 買方欄（現有姓名文字旁）、賣方欄（現有姓名文字旁）各自加入一顆小型 icon 按鈕：
- 未登打（`false`）：醒目樣式（例如橘色系 `text-amber-600` 背景淡橘，帶提示文字或 icon，如 ⏳ 或空心圓）。
- 已登打（`true`）：中性/完成樣式（例如灰階或淡綠 checkmark）。
- 點擊直接切換布林值，呼叫 Server Action 更新，樂觀更新畫面（點擊後立即反轉視覺狀態，失敗則還原並提示錯誤）。

不新增獨立欄位（column），避免案件列表欄位進一步變寬；直接內嵌於既有買方/賣方欄。買方、賣方兩顆按鈕的標記邏輯完全相同（僅 `party` 與資料不同），為避免重複 JSX 並控制 `CaseTableRow.tsx` 行數，狀態切換邏輯已集中於 `useOvertimeClaim.ts`（見上一節），UI 呈現本身抽成共用子元件 `src/components/features/cases/case-list/OvertimeClaimButton.tsx`（內部呼叫 `useOvertimeClaim`），`CaseTableRow.tsx` 買方欄、賣方欄各自引用一次，帶入不同的 `party` 與 `initialClaimed`。

## Implementation Contract

**Behavior**：
- 使用者在 `/cases` 列表任一列的買方姓名旁點擊勾選鈕 → 該案件 `buyer_overtime_claimed` 由 `false` 變 `true`（或反向），UI 立即反映新狀態，重新整理頁面或其他裝置登入同帳號後仍顯示相同狀態。賣方欄行為對稱，使用 `seller_overtime_claimed`，兩者互不影響。
- 更新失敗（網路錯誤、RLS 拒絕）時，UI 狀態還原為更新前的值，並顯示一個非阻斷式錯誤提示（沿用既有 `useNotification.ts` 或等效 toast 機制）。

**Interface / data shape**：
- `cases` 表新增欄位：`buyer_overtime_claimed boolean not null default false`、`seller_overtime_claimed boolean not null default false`。
- `DemoCase` interface（`src/types/index.ts`）新增對應兩個必要欄位（非 optional，因為有 DB default）。
- `caseService.ts` 新增函式簽章：`setOvertimeClaimed(supabase: SupabaseClient, caseId: string, party: 'buyer' | 'seller', claimed: boolean): Promise<void>`，內部依 `party` 決定更新 `buyer_overtime_claimed` 或 `seller_overtime_claimed` 欄位，風格比照既有 `updateCaseMemo`。呼叫端為新增的 `src/hooks/useOvertimeClaim.ts`（Client hook，內建樂觀更新 + 失敗還原 + `useNotification` 錯誤提示，比照 `useCaseTodos.ts` 的樂觀更新寫法），由 `CaseTableRow.tsx` 引用。
- `src/app/cases/page.tsx` 的 Supabase select 語句需新增這兩個欄位，確保 `CaseTableRow` 收到的 `DemoCase` 物件包含它們。

**Failure modes**：
- Server Action 更新失敗時拋出的錯誤在呼叫端（Client Component）以 `try/catch` 捕捉，`catch` 變數型別為 `unknown`，存取 `.message` 前需 `instanceof Error` guard（依專案型別規則），不可靜默吞掉錯誤，必須讓使用者看到失敗提示並還原樂觀更新的 UI 狀態。

**Acceptance criteria**：
- 新增 migration 檔案存在於 `supabase/migrations/`，命名符合 `YYYYMMDDHHmmss_<描述>.sql` 格式。
- 在 `/cases` 頁面對任一案件點擊買方勾選鈕，重新整理頁面後狀態保持（可用 Playwright 或手動瀏覽器驗證：點擊 → reload → 狀態不變）。
- 賣方勾選鈕與買方勾選鈕狀態互相獨立（切換其中一個不影響另一個）。
- `yarn tsc --noEmit` 通過（`DemoCase` 型別新增欄位後，所有既有引用處不因缺少該欄位而報錯）。

**Scope boundaries**：
- In scope：`cases` 表新增兩欄位、`caseService.ts` 更新函式、`page.tsx` select 語句、`CaseTableRow.tsx` 買方/賣方欄 UI 與點擊處理、`DemoCase` 型別更新。
- Out of scope：`SIGNING_TODOS` 待辦邏輯本身、`todos` 表結構、案件詳情頁（`/cases/[id]`）是否同步顯示此狀態（本次只處理列表頁）、任何通知/提醒機制。

## Risks / Trade-offs

- [Risk] 未來若案件詳情頁（`/cases/[id]`）也需要顯示/切換此狀態，目前設計未涵蓋，需另開變更處理。 → Mitigation：本次先聚焦列表頁需求（使用者明確指定的範圍），詳情頁留待後續有需求時再提案，避免過度設計。
- [Risk] `cases` 表新增 NOT NULL 欄位，若既有資料筆數多，migration 需確認 `default false` 對既有 row 生效不需額外 backfill。 → Mitigation：使用 `boolean not null default false`，Postgres 對既有 row 自動套用 default 值，屬低風險 schema 變更，不需手動 backfill script。
- [Risk] 樂觀更新失敗時若未正確還原狀態，可能讓代書誤以為已登打其實沒有寫入成功。 → Mitigation：Implementation Contract 明確要求失敗時還原 UI 狀態並顯示錯誤提示，tasks 需包含此驗證項目。
