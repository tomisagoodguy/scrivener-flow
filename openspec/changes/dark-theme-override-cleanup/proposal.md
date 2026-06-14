## Why

`src/app/dark-theme.css` 用了 88 條 `!important`，其中一批是**地毯式結構性選擇器**——針對 `.rounded-lg`、`.shadow-*`、`<button>`、`[class*="card"]`、`[class*="panel"]`、`.bg-white`、`.bg-slate-*` 等廣泛匹配，**無差別地強制 `background-color`**。

問題：這些 `!important` 規則的優先度高於 inline style 與 Tailwind arbitrary value，會把任何「自帶顏色」的元件背景蓋掉。最近的族群強弱「主題」熱力卡片就是受害者——每張卡片用 inline 主題色（`backgroundColor: hex`），深色模式下被 `html.dark .rounded-lg { background-color:#1e293b !important }` 與 `html.dark button:not(...) { background-color:#334155 !important }` 壓成同一個深灰，主題色全部消失。同理 `html.dark .text-gray-* { color:#... !important }` 也會把刻意設定的卡片文字色蓋掉。

這不是個案：任何未來帶 inline／arbitrary 背景或文字色、又恰好掛了 `rounded-lg`／`shadow`／是 `<button>`／class 含 "card" 的元件，都會在深色模式被靜默破壞，且難以除錯（inline 樣式在 devtools 看起來「有設定」卻不生效）。`.claude/rules/dark-mode.md` 整篇都在描述這個陷阱與各種 workaround。

根因：這批覆蓋是早期「Tailwind v4 `dark:` variant 失效」時的暴力 workaround。但 `dark-theme.css` 開頭 `@variant dark (&:where(.dark, .dark *))` 已正確定義 dark variant，Tailwind `dark:` 類別現已可用，這批地毯式覆蓋大多已可由元件層級的 `dark:` variant 或設計 token（CSS 變數）取代。

## What Changes

- **收斂**結構性地毯式 `!important` 背景覆蓋，改由元件層級的 Tailwind `dark:` variant／設計 token 驅動深色背景：
  - `html.dark .rounded-lg / .rounded-xl / .rounded-2xl`（強制 bg）
  - `html.dark .shadow / .shadow-sm / .shadow-md / .shadow-lg / .shadow-xl`（強制 bg）
  - `html.dark button:not(...)`（強制 bg）
  - `html.dark [class*="card"] / [class*="Card"] / [class*="panel"] / [class*="Panel"] / [class*="section"] / [class*="Section"] / [class*="container"]`（強制 bg）
  - `html.dark .bg-white / .bg-slate-50..300 / .bg-gray-50..300`（保留作為「未顯式指定 dark 背景」的安全網，但縮限匹配，不再連帶 `[class*=...]` 萬用匹配）
- **保留**語意色彩覆蓋（不在本次範圍）：`.text-rose-*`／`.text-red-*`／`.bg-amber-100` 柔化、input/select、`.text-foreground`、`.text-primary`、`.topic-heat-cell` 等——這些是顏色語意微調，非結構性 hijack。
- **每移除一條地毯式規則前**，先為原本依賴它取得深色背景的元件補上顯式 `dark:` 背景（或改用已內建深色處理的 `.glass-card`），確保零視覺回歸。
- **新增** `.claude/rules/dark-mode.md` 的「正確新寫法」段落：新元件深色背景一律用 `dark:` variant 或 `.glass-card`，禁止再新增地毯式 `!important` 結構覆蓋。

## Non-Goals

- 不改動語意色彩柔化規則（rose/red/amber 文字與背景、逾期標籤、`movement-none-badge`、`topic-heat-cell`）。
- 不重新設計任何頁面的版面或配色，純粹把「深色背景的驅動方式」從地毯式覆蓋換成元件層級 variant，視覺結果維持一致。
- 不導入新的 theme 套件（如 next-themes）或 CSS-in-JS；沿用現有 `html.dark` class 機制與 Tailwind v4。
- 已修好的 `EtfTopicHeatmap`（改用 `.topic-tile` + inline 文字色繞開覆蓋）維持現狀，不回頭改寫；它是本問題的範例。

## Capabilities

### New Capabilities

- `dark-mode-theming`: 定義深色模式的背景／文字色驅動方式契約——以元件層級 `dark:` variant 與設計 token 為主，地毯式 `!important` 結構覆蓋僅作為縮限的安全網，且不得 hijack 帶 inline／arbitrary 顏色的元件。

## Impact

- Affected specs: `dark-mode-theming`（新建）
- Affected code:
  - Modified: `src/app/dark-theme.css`（移除／縮限結構性地毯式覆蓋）
  - Modified: 依賴上述覆蓋取得深色背景的元件（需逐一補 `dark:` 背景；清單於 design 階段盤點，預估涵蓋 case 卡片、投資儀表板卡片、各 panel/section 容器、未掛 `.glass-card` 的 `<button>` 等）
  - Modified: `.claude/rules/dark-mode.md`（新增正確做法、棄用地毯式覆蓋的指引）
- Risk: **中高**。地毯式覆蓋目前「保護」了大量未顯式處理深色的元件；貿然移除會造成深色模式白底/淺底破圖。故採分階段、逐表面（surface）遷移，每階段獨立可驗證、可回退。
