## Context

首頁 `/`（Server Component）目前組成為 WelcomeHeader + WorkDashboard（Client Component，內部用 `useWorkDashboard` 聚合任務）。案件買賣方姓名為 `Case` 型別上的單一字串欄位 `buyer_name` / `seller_name`（`src/types/index.ts`），每案至多各一位。個人化設定已有 `user_settings` 表（`user_id` 為 PK、RLS 四政策齊備、JSONB 欄位模式，見 `supabase/migrations/20260114_add_user_settings.sql`）。專案 `package.json` 無任何拖曳套件。UI 規範：容器用 `.glass-card`、單一元件 ≤150 行、業務邏輯抽至 `use*.ts` hook、資料突變優先 Server Actions。

## Goals / Non-Goals

**Goals:**

- 首頁提供四象限矩陣，聚合所有未結案案件為可拖曳名片（一案一卡，卡面並列買賣雙方姓名）。
- 拖曳分類與象限標題編輯即時保存為個人設定（跨裝置、換瀏覽器不遺失）。
- 名片可連往對應案件詳情頁 `/cases/[id]`。
- 已結案/已刪除案件的名片自動消失，殘留分類紀錄於載入時清理。

**Non-Goals:**

- 不做象限內名片的精確自由座標擺放（名片在象限內按加入順序排列即可）。
- 不做團隊共享矩陣（純個人視圖）。
- 不新增拖曳套件（dnd-kit 等）——名片數量級小（數十張），原生 HTML5 DnD 足夠。
- 不支援觸控裝置的拖曳最佳化（HTML5 DnD 在行動裝置支援度差；行動裝置以「點名片 → 選象限」選單作為替代操作，見 Decisions）。
- 不把矩陣分類回寫到案件資料（不影響 `/cases` 排序與任何既有行為）。

## Decisions

### 保存位置：user_settings 新增 eisenhower_matrix JSONB 欄位

沿用既有 `user_settings` 個人設定表（PK = user_id、RLS 已齊備），新增一個 `eisenhower_matrix JSONB DEFAULT '{}'` 欄位，不另建新表。理由：資料為單使用者單份的小型文件（<10KB），與 scratchpad/custom_quick_notes 同型態；另建表需重複 RLS 政策且無查詢需求。替代方案「新表 eisenhower_placements（一列一名片）」被否決——無跨列查詢需求，反而增加 migration 與同步成本。

### 名片識別鍵：以 caseId 為穩定 key（一案一卡）

（2026-07-11 需求變更：原設計每人一張名片、key 為 `{case_id}:role`；使用者回饋改為**一案一卡**。）名片以 `"{case_id}"` 為穩定識別鍵，而非姓名字串。每個未結案且至少一方姓名非空的案件產一張名片，卡面並列買賣雙方姓名（買/賣標記）。理由：同名不同案不會互撞；案件改名（更正錯字）不會遺失分類；買賣雙方本來就屬同一案，分開拖曳無實務意義。JSONB 結構：

```json
{
  "zones": [
    { "id": "q1", "label": "重要且緊急" },
    { "id": "q2", "label": "重要不緊急" },
    { "id": "q3", "label": "緊急不重要" },
    { "id": "q4", "label": "不重要不緊急" }
  ],
  "placements": { "<case_id>": ["q1", "q3"] }
}
```

未出現在 `placements` 的名片落在「待分類」區。舊格式 `{case_id}:buyer` 的殘留鍵不需遷移——功能尚未上線無存量資料，且失效清理會在載入時自動過濾。

### 自訂象限：zones 清單存同一 JSONB（2–8 格，使用者自管）

（2026-07-11 第三次需求變更：象限數量從固定 4 格改為使用者功能。）象限定義為 `zones` 陣列（`{ id, label }`）存進同一 `eisenhower_matrix` JSONB，**不需要任何 DB migration**。規則：

- 格數下限 2、上限 8；達上限隱藏「＋新增象限」、剩下限時停用刪除。
- 新象限 `id` 用 `z{timestamp}` 產生（per-user 文件內唯一即可），預設標題「新象限」。
- 刪除象限（需 confirm）時，`placements` 中指向該 zone 的項目一併移除 → 名片退回待分類；不動案件資料。
- **舊格式相容**：讀到無 `zones` 的文件（v1：`{ placements, labels }`）時，以預設四象限 q1–q4 解讀並套用 `labels` 內已存的自訂標題；下次保存自動寫成 v2 格式。
- `placements` 值必須是現存 zone id，解析時過濾非法值（與名片鍵失效清理同層處理）。
- 標題清空時回 fallback：q1–q4 回艾森豪預設詞、自訂象限回「新象限」。

替代方案「zones 另開資料表」被否決：per-user 單份小文件、無跨列查詢需求，JSONB 內嵌最省。

### 多象限歸屬：placements 值改為 zone id 陣列（拖曳搬家、選單多選、✕ 退格）

（2026-07-11 第四次需求變更：一張名片可同時屬於多個象限。）`placements` 值由單一 zone id 改為 **zone id 陣列**，同名片在每個所屬格內各渲染一份。互動語意（避免拖曳誤觸複製）：

- **拖曳＝搬家**：拖曳 payload 帶「來源格 id」（自待分類拖出為 null），drop 時把該名片自來源格移出、加入目標格；拖到待分類區＝僅自來源格移出（若因此歸屬清空，名片自然回待分類）。
- **「⋯」選單＝勾選式多選**：每格一個 toggle（勾＝加入、取消勾＝移出），選單保持開啟供連續勾選；另提供「移回待分類」清空全部歸屬。
- **格內名片「✕ 從此格移除」**：等同 toggle off；移除最後一格即回待分類。
- 陣列去重、值過濾至現存 zone id、空陣列項目刪除（與失效清理同層，`parseMatrix` / `prunePlacements` 處理）。
- **v2 相容**：讀到字串值（單 zone）自動視為單元素陣列；v1（`{ placements, labels }`）相容鏈不變。

替代方案「拖曳＝複製」被否決：多數操作仍是單格分類，複製語意會讓使用者拖幾次就冒出多份，違反最小驚訝。

### 拖曳實作：原生 HTML5 Drag and Drop 不加套件

名片 `draggable` + `onDragStart` 寫入識別鍵；象限 `onDragOver`/`onDrop` 接收。行動裝置 fallback：名片提供輕量選單（點擊名片右側圖示 → 列出四象限 + 待分類）直接指定象限，桌機與行動共用同一 state 更新路徑。替代方案 dnd-kit 被否決：多 12KB+ 依賴，本場景無排序/巢狀需求。

### 資料流：Client hook 聚合 + Server Action 讀寫

`useEisenhowerMatrix.ts` 負責：(1) 取得未結案案件清單（沿用專案既有案件讀取路徑，與 `useWorkDashboard` 相同來源，不新開查詢管道）；(2) 每個至少一方姓名非空的未結案案件產一張名片（一案一卡）；(3) 呼叫 `src/app/actions/eisenhowerActions.ts` 的 `getEisenhowerMatrix()` 讀取設定、`saveEisenhowerMatrix(matrix)` 保存（拖放後防抖 800ms 寫入，象限標題編輯於 blur 時寫入）。突變走 Server Action 符合專案規範（禁止 Client 直查突變、不建 route.ts）。

### 失效清理：載入時以現存名片鍵集合過濾 placements

hook 載入後，`placements` 中識別鍵不屬於「目前有效名片集合」者（案件已結案/刪除/姓名清空）直接從 state 移除；下次保存時自然持久化清理結果，不需要背景 job。理由：資料量小、清理冪等，最省事且無一致性風險。

## Implementation Contract

**可觀察行為：**

- 登入後開啟 `/`，矩陣區塊（`.glass-card`）位於 WorkDashboard 內部——「未來 7 日預告」（PipelineView）下方、「智慧待辦中心」（TodoContainer）上方：上方為「待分類」橫列，下方為 2×2 象限格。
- 每張名片顯示：買賣雙方姓名並列（各帶「買」/「賣」標記，缺一方只顯示另一方）；**卡面不顯示物件編號**（案號僅保留 hover tooltip）；點擊姓名導向 `/cases/[id]`。
- 桌機拖曳名片到任一象限後放開，名片自來源格消失、出現在目標格（搬家語意）；拖回待分類＝自來源格移除；重新整理頁面後位置不變（已持久化）。
- 名片「⋯」選單為勾選式多選：勾選多格後，同一張名片同時出現在每個所勾的格內；格內名片的「✕」把它自該格移除，移除最後一格即回待分類。
- 點擊象限標題可就地編輯，blur 後保存；清空標題則恢復該象限預設標題（q1–q4 回艾森豪預設詞、自訂象限回「新象限」）。
- 矩陣提供「＋新增象限」（達 8 格隱藏）；每格提供刪除控制（剩 2 格停用、按下需 confirm），刪除後該格名片立即出現在待分類區且重新整理後象限消失。
- 用另一個帳號登入看到的是自己的分類，與他人互不影響（RLS）。
- 無任何未結案案件時，區塊顯示空狀態文字，不顯示空象限錯位版面。

**介面 / 資料形狀：**

- Server Actions（`src/app/actions/eisenhowerActions.ts`）：
  - `getEisenhowerMatrix(): Promise<EisenhowerMatrixData>` — 讀 `user_settings.eisenhower_matrix`，無列或欄位為空時回傳 `{ placements: {}, labels: {} }`。
  - `saveEisenhowerMatrix(data: EisenhowerMatrixData): Promise<{ success: boolean; error?: string }>` — upsert `user_settings`（`onConflict: user_id`），只覆寫 `eisenhower_matrix` 欄位。
- 型別（定義於 hook 同目錄，單一事實來源；2026-07-11 v3）：`EisenhowerZone = { id: string; label: string }`；`EisenhowerMatrixData = { zones: EisenhowerZone[]; placements: Record<string, string[]> }`（placements 值為 zone id 陣列，去重、無空陣列項）。常數 `MIN_ZONES = 2`、`MAX_ZONES = 8`、`DEFAULT_ZONES`（q1–q4 + 艾森豪預設標題）。禁用 `any`。
- hook 介面：`moveChip(chipKey, fromZoneId, toZoneId)`（拖曳搬家；from/to 可為 null）、`toggleZone(chipKey, zoneId)`（選單勾選與 ✕ 共用）、`clearZones(chipKey)`（移回待分類）。
- 名片識別鍵格式固定 `"{case_id}"`（一案一卡）；名片資料形狀 `PersonChipData = { key: string; caseId: string; caseNumber: string; buyerName: string | null; sellerName: string | null }`（`caseNumber` 僅供 tooltip）。

**失敗模式：**

- 保存失敗（網路/Auth）：名片停留在使用者拖放後的位置（樂觀更新不回滾），顯示 toast 錯誤提示（沿用 `useNotification`），下次成功保存時整份覆寫。禁止空 catch 靜默失敗。
- 讀取失敗：矩陣以全部名片在「待分類」呈現並顯示錯誤提示，不阻斷首頁其他區塊。

**驗收條件：**

- `yarn tsc --noEmit` 通過、`yarn lint` 無新錯誤。
- 新增 Jest 測試（`src/components/dashboard/eisenhower/__tests__/`）至少涵蓋：(1) 名片展開邏輯——給定含空 `seller_name` 的案件陣列，產出正確名片集合；(2) 失效清理——placements 含已消失 case 的鍵或已刪除 zone id 時被過濾；(3) 標題 fallback——標題清空時 q1–q4 回預設詞、自訂象限回「新象限」；(4) 舊格式相容——`{ placements, labels }` v1 文件解析為預設四象限並套用已存標題；(5) 象限增刪——addZone 受 MAX_ZONES 限制、removeZone 受 MIN_ZONES 限制且將該格 placements 移除。`yarn test --testPathPatterns eisenhower` 綠燈。
- 手動驗證（本地 `yarn dev`）：拖曳 → 重新整理 → 位置保留；深色模式下矩陣可讀（`.glass-card` 變數驅動，不用 `!important`）。

**範圍邊界：**

- In scope：上述元件/hook/Server Action/migration/型別、`src/components/dashboard/WorkDashboard.tsx` 掛載一行（PipelineView 與 TodoContainer 之間；2026-07-11 由 `src/app/page.tsx` 改移至此）。
- Out of scope：`/cases` 頁任何行為（尤其禁止動預設里程碑排序）、`useWorkDashboard` 既有邏輯、todos 雙軌同步、行動裝置 DnD polyfill。

## Risks / Trade-offs

- [不同案件當事人同名] → 識別鍵為 caseId 不受姓名影響；卡面並列雙方姓名 + tooltip 案號可區分。
- [HTML5 DnD 在觸控裝置不可用] → 名片選單 fallback 覆蓋行動裝置操作；不追求拖曳體驗一致。
- [樂觀更新 + 防抖在快速連續拖曳時可能只保存最終態] → 這正是期望行為（最終一致），無資料損失風險。
- [user_settings 既有列不存在（新使用者）] → Server Action 用 upsert，讀取用 maybeSingle 容忍無列。
- [案件量成長後名片過多（>100 張）] → 待分類區加上限提示與收合；本階段不做虛擬捲動（Non-Goal，資料量預期數十）。

## Migration Plan

1. 新增 `supabase/migrations/20260711120000_add_eisenhower_matrix.sql`：`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS eisenhower_matrix JSONB DEFAULT '{}'::jsonb;`（只走 migrations 檔，禁 Prisma migrate / Supabase UI）。
2. 部署順序：先套 migration 再上前端（欄位向後相容，舊前端不受影響）。
3. Rollback：前端移除掛載即可；欄位保留無害，不需 DROP COLUMN。

## Open Questions

（無——象限預設標題採艾森豪標準四詞，使用者可自行改名，已涵蓋「自定義」需求。）
