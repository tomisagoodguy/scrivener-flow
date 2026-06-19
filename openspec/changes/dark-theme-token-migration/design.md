## Context

`src/app/globals.css` 的 `:root` 定義了一組表面／邊框設計 token：`--background`、`--foreground`、`--card-bg`、`--card-border`、`--surface`、`--surface-hover`、`--border-color`、`--glass-border`、`--secondary`。`@theme inline` 再把其中部分映射成 Tailwind utility（`--color-background`、`--color-card`、`--color-border` 等）。`.glass-card`、`.glass`、`body`、`h1..h6` 都直接讀這些變數。

關鍵現況：`globals.css` **沒有任何 `.dark` 區塊覆寫這些變數**。深色模式下 `--card-bg` 仍是 `#ffffff`，`.glass-card` 理應呈白底。目前唯一讓它變深的是 `src/app/dark-theme.css` 的 `html.dark [class*="card"]:not([style*="background"]) { background-color:#1e293b !important }`（`.glass-card` 的 class 含 "card" 被命中）。`[class*="panel"]`、`[class*="section"]`、`.bg-white`、`.bg-slate-*` 等萬用結構規則同理在「補救」未顯式處理深色的容器。

前一變更 `dark-theme-override-cleanup` 已替這些結構規則加上 `:not([style*="background"])` 豁免（止血，避免 hijack inline 背景色），但其 tasks.md Section 3 明確把「補 `.dark` 變數 → 先補後刪移除地毯式規則」列為未來工作。本變更即執行該 Section 3 的前半段：以變數驅動取代 `[class*="card/panel/section"]` 萬用匹配。

## Goals / Non-Goals

**Goals:**

- 在 `globals.css` 建立 `html.dark` 變數覆寫，使 `.glass-card`／`.glass`／`body` 及 `@theme inline` 對應 utility 在深色模式自帶正確背景與邊框，不再依賴 `[class*="card"]` 地毯式 `!important`。
- 移除 `dark-theme.css` 中 `[class*="card"]`、`[class*="Card"]`、`[class*="panel"]`、`[class*="Panel"]`、`[class*="section"]`、`[class*="Section"]` 六條萬用結構背景覆蓋。
- 縮限 `.bg-white`／`.bg-slate-50..300`／`.bg-gray-50..300` 規則為「具名安全網」，移除其連帶的 `[class*="bg-slate-50/"]` 萬用匹配。
- 全程「先補後刪」：每移除一條規則前，先確認對應表面已由變數或元件層級 `dark:` 取得深色背景，零視覺回歸。

**Non-Goals:**

- 不移除 `.rounded-*`、`.shadow-*`、`button:not(...)` 結構規則（依賴面太廣、風險過高），維持既有 `:not([style*="background"])` 豁免，另案處理。
- 不改動語意色彩柔化（rose／red／amber 文字與背景、input/select、`.text-foreground`、`.text-primary`、`.topic-heat-cell`、`movement-none-badge`）。
- 不導入 next-themes 或任何 theme 套件，沿用現有 `html.dark` class 機制與 Tailwind v4。
- 不重新設計任何頁面版面或配色；視覺結果在深色模式維持與現況一致。
- 不回頭改寫已修好的 `EtfTopicHeatmap`（`.topic-tile` + inline）。

## Decisions

### 以 html.dark 變數覆寫驅動表面色，取代 [class*="card"] 地毯式覆蓋

在 `globals.css` `:root` 之後新增 `html.dark { ... }` 區塊，覆寫表面／邊框 token 為深色值（對齊現行 `dark-theme.css` 使用的色階以維持視覺一致）：

- `--background: #020617`（slate-950，對齊現行 body 深色）
- `--foreground: #f8fafc`（slate-50）
- `--card-bg: #1e293b`（slate-900，對齊現行 `[class*="card"]` 覆蓋值）
- `--card-border: #475569`（slate-600，對齊現行邊框覆蓋）
- `--surface: rgba(30,41,59,0.85)`、`--surface-hover: rgba(30,41,59,0.95)`
- `--border-color: #475569`、`--glass-border: rgba(148,163,184,0.2)`
- `--secondary: #334155`（slate-800）

理由：`.glass-card`、`.glass` 已是變數驅動，只要變數變深即自帶深色，無需任何 `!important`。色值刻意沿用 `dark-theme.css` 既有色階，確保「先補」階段的視覺與「未刪規則前」完全一致，刪規則後也不變。

替代方案：(a) 為 `.glass-card` 直接加 `html.dark .glass-card { background: #1e293b }` 專用規則——可行但無法惠及其他變數驅動樣式（`.glass`、`bg-card` utility），且把硬編碼色散落多處，劣於集中於變數。(b) 改用 Tailwind `dark:` variant 逐元件標註——`.glass-card` 是 CSS class 非 utility 組合，無法在 class 定義上掛 `dark:`，不適用。

### 移除 [class*="card/panel/section"] 六條萬用結構背景規則

確認 `.glass-card` 與其他主要卡片表面在變數覆寫後已自帶深色，再從 `dark-theme.css` 刪除這六條萬用 `[class*=...]` 背景規則。`[class*="container"]`（強制 `transparent`）一併評估：若移除後容器仍透明則刪，否則保留。

理由：萬用 substring 匹配是最危險的一類——任何 class 名含 "card/panel/section" 子字串的元素都被命中，最難預測、最常誤傷。變數體系到位後它們已無存在必要。

替代方案：保留但加更多 `:not()` 條件——只會讓選擇器更脆弱複雜，不解決根因。

### 縮限 bg-white / bg-slate / bg-gray 為具名安全網

保留 `.bg-white`、`.bg-slate-50..300`、`.bg-gray-50..300`（含現有 `:not([style*="background"])` 豁免）作為「未顯式指定深色背景」的具名 fallback，但移除 `[class*="bg-slate-50/"]` 這類萬用 substring 匹配，改為列舉具體半透明類別。

理由：具名 utility 命中範圍明確可預測，風險遠低於 substring 萬用匹配；保留它們可避免一次移除過多保護造成大面積破圖，作為遷移期安全網。

### 逐表面深淺雙模式 sweep 作為回歸守門

每階段（補變數後、刪規則後）對深色模式逐頁 sweep：`/cases`、`/cases/[id]`、`/investment`、`/investment/sectors`（含主題視圖）、`/investment/[etf]`、`/investment/strategy`、`/investment/equity`、`/knowledge`、`/login`、`/calculator`、`/notes`，確認卡片／panel／容器背景維持深色、無白底破圖，且 `/investment/sectors` 主題卡片仍顯示各自 inline 主題色。

理由：本變更無自動化視覺測試可依賴，人工逐頁 sweep 是唯一可信的回歸守門；`/investment/sectors` 主題卡片是 inline 背景被 hijack 的原始回歸案例，列為必查。

## Implementation Contract

**Behavior（可觀察結果）：**

- 切換深色模式後，`.glass-card`、`.glass`、`body` 及使用 `bg-card`／`border` token 的元件背景／邊框為深色（slate-900 卡片、slate-950 底、slate-600 邊框），與本變更前的視覺一致。
- `dark-theme.css` 不再含 `html.dark [class*="card"]`、`[class*="Card"]`、`[class*="panel"]`、`[class*="Panel"]`、`[class*="section"]`、`[class*="Section"]` 的背景規則。
- 帶 inline／arbitrary 背景色的元件（如 `/investment/sectors` 主題卡片）在深色模式維持自身顏色，不被壓成統一深灰。

**Interface / data shape：**

- 新增 CSS 區塊位於 `src/app/globals.css`，形式為 `html.dark { --token: value; ... }`，覆寫既有 `:root` 變數名稱（不新增變數名，只提供深色值）。
- 移除的選擇器位於 `src/app/dark-theme.css` 的「通用卡片 class／通用容器／通用 panel/section」段落。

**Failure modes：**

- 若某表面在刪規則後出現白底/淺底破圖 → 表示該表面非變數驅動且未顯式處理深色 → 回退該條規則的刪除，或為該元件補 `dark:` 背景 / 改用 `.glass-card`，再重試。任一階段可獨立 git 回退。

**Acceptance criteria：**

- `yarn build` 通過、`yarn lint` 無新增錯誤。
- 深色模式逐頁 sweep（上列頁面）無視覺回歸：卡片/panel/容器維持深色背景。
- `/investment/sectors` 主題卡片在深淺兩模式皆顯示各自 inline 主題色（原始回歸案例守門）。
- `dark-theme.css` 經搜尋不再含上述六條 `[class*="card/panel/section"]` 背景規則。

**Scope boundaries：**

- 範圍內：`globals.css` 新增 `html.dark` 變數覆寫；`dark-theme.css` 移除/縮限 `[class*="card/panel/section"]` 與 `bg-slate` 萬用匹配；`dark-mode.md` 文件更新。
- 範圍外：`.rounded-*`／`.shadow-*`／`button` 結構規則、所有語意色彩柔化規則、頁面版面與配色、theme 套件導入。

## Risks / Trade-offs

- [移除萬用 `[class*="card/panel/section"]` 後，某些靠它著色但非變數驅動的容器破圖] → 先補變數並逐頁 sweep 確認後才刪；每條規則的移除為獨立 commit，破圖即回退單一 commit。
- [`html.dark` 變數覆寫與 `dark-theme.css` 現有 `!important` 規則在過渡期同時生效] → 變數驅動樣式無 `!important`，會被殘留的 `!important` 規則蓋過；但因色值刻意對齊，過渡期視覺一致；待規則刪除後改由變數生效，結果不變。
- [`@theme inline` 的 `--color-*` 在 build 期 inline，`html.dark` 執行期覆寫 `--card-bg` 能否傳導到 `bg-card`] → `@theme inline` 以 `var(--card-bg)` 參照，執行期變數覆寫可生效；於 sweep 中實機驗證 `bg-card` 元件，若不生效則改補專用 `html.dark .bg-card` 或元件 `dark:` 處理。
- [人工 sweep 漏網] → 以固定頁面清單 + 原始回歸案例（主題卡片）為最低守門集，降低漏檢面。

## Migration Plan

1. 補 `globals.css` `html.dark` 變數覆寫（純新增，不刪任何規則）→ sweep 確認無回歸（此時規則仍在，變數為冗餘保險）。
2. 移除 `[class*="card/panel/section"]` 六條規則（每條或每組獨立 commit）→ 每步 sweep。
3. 縮限 `bg-slate/bg-white/bg-gray` 萬用匹配為具名列舉 → sweep。
4. 更新 `.claude/rules/dark-mode.md`。
5. 回退策略：任一階段破圖，`git revert` 對應 commit 即恢復；變數覆寫與規則移除為不同 commit，互不耦合。
