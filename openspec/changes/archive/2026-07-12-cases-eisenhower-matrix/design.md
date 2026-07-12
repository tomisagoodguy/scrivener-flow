## Context

`EisenhowerMatrix.tsx`（`src/components/dashboard/eisenhower/`）目前是自足元件：內部呼叫 `useEisenhowerMatrix()` 自行查詢未結案案件與讀寫個人化 `eisenhower_matrix` 設定，首頁 `WorkDashboard.tsx` 直接掛載、無 props。`/cases` 頁面（`src/app/cases/page.tsx`）的「流程監控」區塊為 `GlobalPipelineChart`，只在 `statusParam !== 'Closed'/'Memo'/'Timeline'/'Pending' && monitoringCases.length > 0` 時渲染（見 page.tsx 第 212–219 行區塊，判斷式命名為「Monitoring View」）。

## Goals / Non-Goals

**Goals:**

- `/cases` 與首頁顯示同一份 per-user 矩陣資料，操作其中一處、重新整理任一頁面都看到一致結果。
- `/cases` 版本預設收合，使用者手動展開才看到內容；首頁版本行為完全不變（一律展開、無收合按鈕）。

**Non-Goals:**

- 不做「記住上次展開/收合狀態」的持久化（跨重新整理／跨分頁一律回到預設收合）——此為簡化範圍的刻意選擇，避免另開一個 per-user 偏好欄位。
- 不改變矩陣的資料模型、拖曳/多選/象限管理邏輯（沿用 dashboard-eisenhower-matrix 既有規格）。
- 不影響 `/cases` 既有排序、篩選、分頁行為。

## Decisions

### 以 props 擴充既有元件，不另建收合外殼元件

`EisenhowerMatrix` 新增兩個選用 props：`collapsible?: boolean`（預設 `false`）、`defaultCollapsed?: boolean`（預設 `false`）。`collapsible=true` 時，標題列右側加收合/展開按鈕（chevron icon），矩陣本體（待分類橫列 + 象限格）以 `defaultCollapsed` 決定初始可見性，之後由本地 state 控制。首頁呼叫端 `<EisenhowerMatrix />` 不傳 props，行為與現狀零差異。

替代方案「另建 `CollapsibleEisenhowerMatrix.tsx` 包裹既有元件」被否決：矩陣的 header（標題、＋新增象限按鈕）與收合按鈕邏輯上同屬一列，拆成外層包裹會需要把 header 抽出或重複渲染，徒增一個檔案與 props 轉發樣板，不符合「單一事實來源」（`indexes.md` 慣例：同一元件只在一處定義）。

### 收合時仍執行資料載入（不做懶載入）

`useEisenhowerMatrix()` 在元件掛載時即抓取案件與矩陣設定，收合只影響是否**渲染**矩陣本體，不影響是否**呼叫**hook。理由：(1) 避免展開瞬間才發請求造成的載入延遲體感；(2) 案件查詢與矩陣設定本就是輕量請求（沿用既有 `dashboard-eisenhower-matrix` 規格的效能假設，未觀察到問題）；(3) 若未來要做懶載入，屬獨立效能優化議題，不在本次範圍。

### `/cases` 頁面掛載位置與顯示條件比照 GlobalPipelineChart

`<EisenhowerMatrix collapsible defaultCollapsed />` 掛在 `GlobalPipelineChart` 之後、同一個「Monitoring View」條件區塊內（`statusParam !== 'Closed' && statusParam !== 'Memo' && statusParam !== 'Timeline' && statusParam !== 'Pending' && monitoringCases.length > 0`），理由：矩陣資料本就只涵蓋未結案案件，與「流程監控」的顯示前提一致，沿用既有條件比新開一條判斷式更省心智負擔。

## Implementation Contract

**可觀察行為：**

- 首頁 `/`：矩陣顯示與收合行為與現狀完全一致（無收合按鈕、一律展開）。
- `/cases` 頁面（監控檢視分頁、有進行中案件時）：「流程監控」下方出現「輕重緩急看板」區塊，標題列含收合/展開按鈕（整列可點擊），**首次載入為收起狀態**（只顯示標題列，不顯示待分類橫列與象限格），收起狀態下標題圖示帶輕微彈跳動畫。
- 點擊展開按鈕：矩陣本體（待分類 + 象限格）出現，內容與首頁完全相同的即時資料（同一份 `eisenhower_matrix`）。
- 在 `/cases` 展開矩陣後拖曳/勾選/改標題，重新整理 `/` 或 `/cases` 皆能看到更新後的結果（無需額外同步機制，因兩處共用同一顆 hook 的獨立掛載各自 fetch 最新狀態）。
- 切換分頁（如已結案／備忘錄）或無進行中案件時，矩陣區塊（含收合按鈕）不出現，行為與 `GlobalPipelineChart` 一致。

**介面 / 資料形狀：**

- `EisenhowerMatrix` 新 props：`{ collapsible?: boolean; defaultCollapsed?: boolean }`，皆為選用，省略時等同現狀（`collapsible=false`）。
- 不新增型別、不改 `EisenhowerMatrixData`、不改任何 Server Action 簽名。

**失敗模式：**

- 沿用既有失敗行為（讀取失敗矩陣全部落待分類並顯示錯誤 toast、保存失敗樂觀不回滾並顯示錯誤 toast）；收合狀態本身是純前端 UI state，無保存失敗的問題。

**驗收條件：**

- `yarn tsc --noEmit`、`yarn test --testPathPatterns eisenhower` 全數通過。
- 新增/更新 Jest 測試涵蓋：(1) `collapsible=false`（或省略）時矩陣本體一律可見，無收合按鈕；(2) `collapsible=true, defaultCollapsed=true` 時初始只見標題列，點擊展開後本體出現；(3) 展開/收合不影響 `useEisenhowerMatrix` 回傳的 chips/matrix 內容。
- 手動驗證（`yarn dev`）：`/` 首頁矩陣行為不變；`/cases` 監控檢視下矩陣預設收起、點開後與首頁資料一致（同一格分類、同一組象限標題）。

**範圍邊界：**

- In scope：`EisenhowerMatrix.tsx` 新增 props 與收合 UI、`src/app/cases/page.tsx` 掛載一行。
- Out of scope：`/cases` 既有排序／篩選／匯出／備忘錄／時程等其他區塊；`dashboard-eisenhower-matrix` 既有拖曳/多選/象限管理邏輯（不修改，只擴充渲染層）；收合狀態持久化。

## Risks / Trade-offs

- [兩處掛載各自獨立 fetch，理論上短時間內可能看到些微不同步（例如同時開兩個分頁各自操作）] → 現有樂觀更新 + 800ms 防抖已是既定設計，本次不新增即時同步機制（如 Supabase Realtime），影響範圍與現有「多裝置同步」風險一致，不因新增掛載點而擴大。
- [`/cases` 頁面本已元件較多，多一個矩陣區塊可能增加視覺負擔] → 預設收合正是為此設計，未展開時只占一列高度。

## Migration Plan

不涉及資料庫或 API 變更，純前端 props 擴充 + 頁面掛載，無需 migration，可直接部署。

## Open Questions

（無）
