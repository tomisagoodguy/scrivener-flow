## Why

代書同時處理多個案件的多位當事人，需要一個以「人」為單位的優先級視覺化工具。同事提出希望在首頁有一個自定義的艾森豪四象限矩陣，把所有案件的買方/賣方姓名以名片呈現，讓使用者依自己的判斷（而非系統規則）把人拖到不同象限，快速記住「現在該優先聯絡/處理誰」。

## What Changes

- 首頁（`/`）新增「艾森豪四象限矩陣」區塊，位於 WorkDashboard 內部：「未來 7 日預告」（PipelineView）下方、「智慧待辦中心」（TodoContainer）上方。（2026-07-11 使用者指定位置。）
- 矩陣自動彙整所有未結案案件，**每案產生一張**可拖曳名片；卡面同時並列買方（`buyer_name`）與賣方（`seller_name`）姓名並以買/賣標記區分（缺任一方只顯示另一方），**卡面不顯示物件編號**（案號僅保留 hover tooltip），點擊可連往該案件詳情頁。（2026-07-11 需求變更：原設計為每人一張名片，使用者回饋改為一案一卡、案號不重要。）
- 未分類的姓名先集中在「待分類」暫存區；使用者以拖曳方式把名片移入象限，位置立即保存。
- **一張名片可同時屬於多個象限**（2026-07-11 第四次需求變更）：拖曳＝搬家（移出來源格、加入目標格，日常單格操作直覺不變）；名片「⋯」選單改為**勾選式多選**（勾哪幾格就同時出現在哪幾格）；格內名片提供「✕ 從此格移除」，移除最後一格即回待分類。placements 值改為 zone id 陣列，仍存同一 JSONB，相容 v1/v2 舊格式。
- 象限標題可由使用者自行編輯（預設為艾森豪標準：重要且緊急／重要不緊急／緊急不重要／不重要不緊急），符合「依自己的定義」的需求。
- **象限管理為使用者功能**（2026-07-11 第三次需求變更）：矩陣提供「＋新增象限」與每格「刪除」控制，每位使用者自訂格數（2–8 格）與標題；zones 清單存進既有 `eisenhower_matrix` JSONB，**免再動資料庫**。刪除象限時該格名片退回待分類；舊格式文件（無 zones）自動視為預設四象限（保留已存標題）。
- 分類結果為**個人設定**：保存於既有 `user_settings` 表新增的 JSONB 欄位，受既有 RLS 保護，每位使用者只看到自己的分類。
- 案件結案或刪除後，對應名片自動從矩陣消失；殘留的分類紀錄在載入時清理。

## Capabilities

### New Capabilities

- `dashboard-eisenhower-matrix`: 首頁艾森豪矩陣——自動聚合未結案案件為一案一卡（卡面並列買賣雙方姓名）、使用者自管象限（2–8 格、自訂標題）、個人化分類保存與失效清理。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `dashboard-eisenhower-matrix`
- Affected code:
  - New:
    - `supabase/migrations/20260711120000_add_eisenhower_matrix.sql`（user_settings 新增 `eisenhower_matrix` JSONB 欄位）
    - `src/components/dashboard/eisenhower/EisenhowerMatrix.tsx`（矩陣容器元件）
    - `src/components/dashboard/eisenhower/QuadrantCell.tsx`（單一象限元件，含可編輯標題與拖放目標）
    - `src/components/dashboard/eisenhower/PersonChip.tsx`（姓名名片元件，可拖曳、連結案件）
    - `src/components/dashboard/eisenhower/useEisenhowerMatrix.ts`（資料聚合、拖放狀態、防抖保存 hook）
    - `src/app/actions/eisenhowerActions.ts`（Server Action：讀取/保存個人矩陣設定）
  - Modified:
    - `src/app/page.tsx`（掛載 EisenhowerMatrix 區塊）
    - `src/types/supabase.ts`（user_settings 型別補 `eisenhower_matrix` 欄位）
  - Removed: (none)
- Dependencies: 不新增任何套件，拖曳採原生 HTML5 Drag and Drop API。
