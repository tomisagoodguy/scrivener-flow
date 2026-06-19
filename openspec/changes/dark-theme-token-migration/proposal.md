## Why

`src/app/globals.css` 在 `:root` 定義了 `--card-bg`、`--card-border`、`--surface`、`--surface-hover`、`--background`、`--foreground` 等表面色變數，但**完全沒有 `.dark` 覆寫**。因此深色模式下這些變數仍是淺色（`--card-bg: #ffffff`），`.glass-card` 等變數驅動元件本應呈白底；目前唯一讓它們變深的機制，是 `src/app/dark-theme.css` 的地毯式規則 `html.dark [class*="card"] { background-color:#1e293b !important }`（`.glass-card` 含 "card" 被命中）。

這就是地毯式 `!important` 覆蓋無法移除的根因：一旦刪掉這批規則，所有靠它著色的表面會在深色模式破圖。前一個變更 `dark-theme-override-cleanup` 已用 `:not([style*="background"])` 豁免止血，但把「真正移除地毯式覆蓋」標為未來工作（其 tasks.md Section 3）。本變更執行該 Section 3：先讓變數自帶深色，元件層級就能正確著色，地毯式規則才有條件「先補後刪」。

## What Changes

- **在 `globals.css` 新增 `.dark`（`html.dark`）變數覆寫**：為 `--background`、`--foreground`、`--card-bg`、`--card-border`、`--surface`、`--surface-hover`、`--border-color`、`--glass-border`、`--secondary` 等表面／邊框變數提供深色值，使 `.glass-card`、`.glass`、`body` 及 `@theme inline` 對應的 `bg-card`／`border` 等變數驅動樣式在深色模式自帶正確背景，不再依賴地毯式 `!important`。
- **先補後刪，逐表面遷移**：每移除（或縮限）一條地毯式結構規則前，先確認該表面已由變數或元件層級 `dark:` variant 取得深色背景，確保零視覺回歸。本次目標移除／縮限的規則：
  - `html.dark [class*="card"] / [class*="Card"]`（由 `.glass-card` 變數化取代）
  - `html.dark [class*="panel"] / [class*="Panel"] / [class*="section"] / [class*="Section"]`（萬用 class 匹配，風險最高，優先收斂）
  - `html.dark .bg-white / .bg-slate-50..300 / .bg-gray-50..300`（保留為縮限安全網，但不再連帶萬用匹配）
- **保留** `.rounded-*`、`.shadow-*`、`button:not(...)` 的結構規則本次**不移除**（風險過高、依賴面廣），僅維持既有 `:not([style*="background"])` 豁免，留待變數體系穩定後另案處理。
- **保留**所有語意色彩柔化規則（rose／red／amber 文字與背景、input/select、`.text-foreground`、`.text-primary`、`.topic-heat-cell`、`movement-none-badge`），不在本次範圍。
- **更新** `.claude/rules/dark-mode.md`：補上「變數驅動深色表面」為首選做法，記錄 `.dark` 變數覆寫的存在與用途。

## Capabilities

### New Capabilities

- `dark-surface-tokens`: 定義深色模式表面色的「變數驅動」契約——`.glass-card` 等共用表面元件的深色背景由 `html.dark` 下的 CSS 變數覆寫提供，地毯式 `[class*="card/panel/section"]` 結構覆蓋逐步移除，且不得 hijack 帶 inline／arbitrary 顏色的元件。

### Modified Capabilities

(none)

## Impact

- Affected specs: `dark-surface-tokens`（新建）
- Affected code:
  - Modified: `src/app/globals.css`（新增 `html.dark` 變數覆寫區塊）
  - Modified: `src/app/dark-theme.css`（移除／縮限 `[class*="card/panel/section"]` 地毯式結構覆蓋）
  - Modified: `.claude/rules/dark-mode.md`（新增變數驅動做法指引）
- Risk: **中**。地毯式 `[class*="card/panel/section"]` 目前保護大量未顯式處理深色的容器；採「先補變數、後刪規則、逐表面驗證」降風險，每階段獨立可驗證、可回退。相依的前一變更 `dark-theme-override-cleanup` 的豁免機制保持不動，作為遷移期間的安全網。
