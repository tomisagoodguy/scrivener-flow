## Context

匯出 HTML 由 src/lib/cases/htmlExport.ts 產生靜態三區（表格、備忘錄、時程），互動層由 src/lib/cases/exportInteractive.ts 在 runtime 注入控制節點，所有注入節點一律帶 `export-ui` class。互動狀態以單一物件 `state` 持久化在 `<script id="export-state">` 的 JSON（目前含 `people`、`assignments`、`done`），下載「已處理版本」時 `downloadAssigned()` 會 clone DOM、移除所有 `.export-ui`、把最新 `state` 寫回 `#export-state`，重新開啟時腳本依 `state` 重建。

備忘錄區由 `buildMemoSection` 產生：每張 `.memo-card`（帶 `data-case-id`）內含最多三個 `.memo-block`，class 分別為 `memo-warning`（⚠️ 警示備註）、`memo-pending`（📝 其他備忘）、`memo-private`（🔒 私密備註）。列印樣式在 htmlExport.ts 的 INLINE_CSS 末端 `@media print` 區塊，已含 `.export-ui { display:none !important }`。

需求：在匯出檔上讓使用者逐張卡片收合任一備註區塊，收合者螢幕與列印皆不顯示，狀態需隨 `#export-state` 持久化。約束：維持單一自包含 HTML、不改主 App、不改螢幕視覺風格、不動表格與時程區與 Excel 匯出。

## Goals / Non-Goals

**Goals:**

- 每個 `.memo-block` 由使用者透過注入的切換鈕（`export-ui`）逐張卡片個別收合／展開。
- 提供全域分類開關（三類各一鈕），一鍵收合／展開所有卡片的同類區塊，且與逐張收合共用同一份狀態。
- 收合的區塊在螢幕預覽與 `@media print` 列印皆不顯示其內容。
- 收合狀態以 `caseId + blockType` 為鍵存入既有 `state.collapsed`，隨 `#export-state` 持久化（下載已處理版本並重開後保留）。
- 預設三類全部顯示。

**Non-Goals:**

- 全域開關不引入獨立於 per-card 之外的另一層狀態（僅批次套用逐張收合）。
- 不改主 App `/cases`、不改螢幕視覺風格、不動表格／時程／Excel 匯出。
- 不提供加密或權限控管；收合僅是顯示層隱藏。
- 不改 `buildMemoBlock` 既有輸出的內容結構（escape、正規化不變）。

## Decisions

### 收合狀態以實際內容節點的 class 表示，而非只藏 export-ui 控制鈕

收合時在實際 `.memo-block` 內容節點加上 `export-collapsed` class（並由 CSS 設 `display:none`），而不是只隱藏切換鈕。
**理由**：列印規則只隱藏 `.export-ui`；若只藏控制鈕，內容節點仍會列印，達不到「列印不輸出」的目的。對實際內容節點套 class 可讓螢幕與 `@media print` 一致隱藏。
**替代方案**：對 `.memo-block` 設 inline `style.display='none'`——可行但與「狀態還原時要能切回展開」較難協調，且 inline 樣式較難在 CSS 層集中管理；採 class 較清晰。

### 收合切換鈕由互動層注入並帶 export-ui，鈕本身列印時不出現

每個 `.memo-block` 的標籤列注入一個 `button.export-ui.export-memo-collapse`，文字於展開時為「收合」、收合時為「展開」。
**理由**：沿用既有「互動控制一律 export-ui、列印時隱藏、下載已處理版本時剝除」的慣例；切換鈕不應印在紙本。
**替代方案**：在主 App 端產生收合控制——否決，違反「不改主 App、僅作用於匯出檔」與互動層注入慣例。

### 收合狀態存入既有 state.collapsed 並隨 #export-state 持久化

`state` 新增 `collapsed` 物件，鍵為 `caseId|blockType`（blockType ∈ `warning|pending|private`），值為 `true` 表示收合。初始化時讀 `#export-state` 還原，套用到對應 `.memo-block`；切換時更新 `state.collapsed` 並寫回。
**理由**：與現有 `assignments`／`done` 同源、同持久化路徑（`downloadAssigned()` 已序列化整個 `state`），下載已處理版本重開後收合狀態自然保留，無需額外機制。
**替代方案**：不持久化、只作用於當前 session——否決，使用者下載交接版本後重開會丟失收合，無法達成「交給同事的版本只顯示精簡資訊」。

### 收合的顯示隱藏由 CSS class 同時覆蓋螢幕與列印

在 INLINE_CSS 加 `.memo-block.export-collapsed { display: none; }`（螢幕生效），列印區塊承接同一 class（內容節點被隱藏即不列印）。
**理由**：單一 class 同時管控兩種情境，避免螢幕與列印不一致（如時程曾因 inline 隱藏導致列印空白的教訓）。
**替代方案**：只在 `@media print` 隱藏——否決，使用者選擇了「螢幕預覽＋列印都藏」，需螢幕同步隱藏才能所見即所得。

### 全域分類開關以批次套用逐張收合實作，不另立狀態

在備忘錄區頂部注入一組 `export-ui` 全域開關（三類各一鈕：警示／其他／私密）。點某類全域鈕時，列舉全部含該類 `.memo-block` 的卡片，批次設定其 `state.collapsed["caseId|該類"]` 並套用 `export-collapsed` class；動作方向由當前狀態推導：只要該類尚有任一卡片為展開即「全部收合」，否則「全部展開」。全域鈕文字與逐張鈕一律由 `state.collapsed` 重繪，確保兩種操作即時互相反映。
**理由**：全域只是 per-card 收合的批次操作，共用同一份 `state.collapsed`，免去第二層狀態與兩層同步的 bug 風險；持久化、列印隱藏、安全降級全部沿用逐張收合的既有路徑。
**替代方案 A**：另存一份「分類層級」收合狀態（如 `state.collapsedCategories`）——否決，per-card 與分類兩份狀態需雙向同步，易產生不一致（例如全域收合後單獨展開一張卡片，分類旗標該如何）。
**替代方案 B**：全域鈕固定「收合／展開」兩顆而非單顆切換——可行但占空間；採單顆依現況推導方向較精簡，且行為仍可由 `state.collapsed` 明確判定。

## Implementation Contract

**Behavior（使用者可觀察）：**

- 開啟匯出 HTML（互動層已注入）後，每張備忘錄卡片的每個備註區塊旁有一個「收合」切換鈕。
- 點「收合」：該卡片該區塊內容立即從螢幕消失，鈕文字變「展開」；再點則還原。
- 備忘錄區頂部有一組全域分類開關（警示／其他／私密各一鈕）。點某類：所有卡片該類區塊一次收合（若原本尚有展開者）或一次展開（若原本已全部收合）；對應的逐張鈕文字同步更新。
- 全域與逐張共用狀態：全域收合某類後，仍可單獨展開某張卡片的該類；之後再點全域該類會把剩餘展開者一併收合。
- 收合某區塊後列印（Ctrl+P）：該區塊內容不出現在紙本；逐張切換鈕與全域開關本身也不出現在紙本。
- 不同卡片、不同區塊類型的收合彼此獨立。
- 下載「已處理版本」並重新開啟：先前收合的區塊維持收合（仍不顯示、列印仍不輸出）。
- 預設（未操作時）三類區塊皆顯示且會列印。
- 表格、時程區與螢幕既有視覺風格不變。

**Interface / data shape：**

- `#export-state` JSON 新增 `collapsed` 欄位：`{ "collapsed": { "<caseId>|<blockType>": true } }`，blockType ∈ `warning | pending | private`。未收合的鍵可不存在或為 falsy。
- 互動層在每個 `.memo-block` 注入 `button.export-ui.export-memo-collapse`；收合時對該 `.memo-block` 加 class `export-collapsed`。
- 互動層在備忘錄區頂部注入一組 `div.export-ui` 容器，內含三個 `button.export-ui.export-memo-collapse-all`，各帶 `data-block-type`（`warning|pending|private`）標示其分類。全域鈕不改變 `state` 的結構，只批次寫 `state.collapsed` 的 per-card 鍵。
- 區塊類型由既有 class 推導：`memo-warning→warning`、`memo-pending→pending`、`memo-private→private`。
- 無新增匯出函式簽章變更、無 DOM 結構（既有 `.memo-block`）改動。

**Failure modes：**

- JavaScript 關閉（未注入互動層）：無切換鈕、無 `export-collapsed`、`state.collapsed` 不套用 → 三區塊照常顯示與列印（安全降級，內容不遺失）。
- `#export-state` 無 `collapsed` 欄位（舊檔）：視為全部展開，不報錯。
- 未知 blockType 鍵：略過套用，不影響其他區塊。

**Acceptance criteria：**

- htmlExport 測試：`buildCasesHtml` 輸出的 INLINE_CSS 含 `.memo-block.export-collapsed` 的 `display: none` 規則（螢幕與列印皆隱藏該 class）。
- exportInteractive 測試：注入後每個 `.memo-block` 有 `button.export-memo-collapse`（帶 `export-ui`）；點擊後該 `.memo-block` 取得 `export-collapsed` class 且 `state.collapsed` 對應鍵為 true；再點擊移除 class 並清除狀態；以 `#export-state` 預設帶某鍵初始化時，對應 `.memo-block` 初始即帶 `export-collapsed`。
- exportInteractive 測試（全域開關）：注入後備忘錄區有三個 `button.export-memo-collapse-all`（帶 `export-ui` 與 `data-block-type`）；點某類全域鈕後，所有含該類區塊的卡片其 `.memo-block` 皆取得 `export-collapsed` 且 `state.collapsed` 各對應鍵為 true；當該類已全部收合時再點則全部展開（移除 class 並清鍵）；全域收合後單獨展開一張卡片該類，再點全域該類會把剩餘展開者一併收合。
- 既有 htmlExport 與 exportInteractive 測試維持全綠。
- `yarn lint` 通過。

**Scope boundaries：**

- In scope：exportInteractive.ts 注入逐張收合鈕與全域分類開關＋套用/還原/持久化收合狀態；htmlExport.ts 的 INLINE_CSS 新增 `.export-collapsed` 隱藏規則；對應兩個測試檔。
- Out of scope：主 App `/cases`、表格區、時程區、Excel 匯出、螢幕視覺風格、加密／權限、per-card 之外的第二層收合狀態。

## Risks / Trade-offs

- [收合僅顯示層隱藏，私密內容仍存在於 HTML 原始碼中] → 明確列為 Non-Goal（非安全機制）；若需真正移除，應走「下載已處理版本」時連同收合區塊一併剝除的後續變更，不在本次範圍。
- [既有 `downloadAssigned()` 會剝除 export-ui 並重建，需確認收合鈕重建後仍正確反映 state.collapsed] → 初始化流程統一從 `state.collapsed` 還原套用，重建鈕與套用 class 走同一路徑。
- [區塊類型字串與 class 對應若不一致會錯置] → 以單一對照（memo-warning/pending/private → warning/pending/private）集中處理，測試覆蓋三類。

## Migration Plan

1. 實作 exportInteractive.ts 與 htmlExport.ts 變更並通過新增測試。
2. 無資料庫遷移、無設定變更；僅影響匯出檔行為，舊匯出檔（無 `collapsed` 欄位）相容（視為全展開）。
3. Rollback：還原兩檔變更即可，`state.collapsed` 為附加欄位，移除後舊版忽略不影響其餘狀態。

## Open Questions

(none)
