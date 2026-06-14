> **Phase 0 後修訂（見 `notes.md`）**：盤點發現「先補後刪」需逐一補 200+ 元件、且 `.glass-card` 深色背景是承重牆，整條移除風險過高。Phase 1 改採 `:not([style*="background"])` 豁免——在結構性背景規則尾端加修飾，讓規則自動跳過自帶 inline 背景的元件，零元件改動、近乎零回歸。下方原始「移除」策略保留為長期方向（需先補 `.dark` CSS 變數覆寫作為前置）。

## Context

`dark-theme.css` 的深色模式採「class-based + 手動 `!important` 覆蓋」。歷史上是為了繞過 Tailwind v4 `dark:` variant 失效，但檔案開頭 `@variant dark (&:where(.dark, .dark *))` 現已正確啟用 variant，地毯式覆蓋已非必要。

本 design 盤點覆蓋規則、分類風險、定義目標架構與分階段遷移策略。

## Goals / Non-Goals

**Goals**
- 讓帶 inline／arbitrary 顏色的元件，在深色模式下不被結構性覆蓋 hijack。
- 深色背景改由元件層級 `dark:` variant 或設計 token 驅動，行為可預測。
- 零視覺回歸：每階段遷移後深色模式外觀與現況一致。

**Non-Goals**
- 不改語意色彩柔化（rose/red/amber、input、foreground、primary、topic-heat-cell）。
- 不改版面/配色設計，不導入 theme 套件。

## 覆蓋規則分類（dark-theme.css）

### A. 結構性地毯式背景覆蓋 — 本次目標（hijack 來源）

| 行 | 選擇器 | 強制 |
|----|--------|------|
| 33-38 | `html.dark .bg-white` | bg #1e293b + color |
| 161-170 | `.bg-slate-50/100/200`、`.bg-gray-50/100/200`、`.bg-white` | bg #1e293b |
| 173-179 | `.bg-slate-50/..`、`.bg-white/50`、`[class*="bg-slate-50/"]` | bg rgba |
| 182-186 | `.bg-slate-300`、`.bg-gray-300` | bg #334155 |
| **188-194** | `.rounded-lg`、`.rounded-xl`、`.rounded-2xl` | **bg #1e293b** |
| 196-205 | `.shadow / .shadow-sm/md/lg/xl` | bg #1e293b |
| 207-214 | `[class*="card"]`、`[class*="Card"]` | bg #1e293b + color |
| 216-220 | `[class*="container"]`、`[class*="Container"]` | bg transparent |
| 222-229 | `[class*="panel/Panel/section/Section"]` | bg #1e293b |
| **257-268** | `button:not([bg-blue/violet/emerald/red/rose])` | **bg #334155** |

> 粗體兩條是已知造成主題卡片問題的元兇；其餘同類同樣會 hijack。

### B. 語意色彩覆蓋 — 保留（非 hijack，僅顏色語意）

文字色 `.text-slate-*`/`.text-gray-*`/`.text-blue-*`、`.text-foreground*`、`.text-primary/muted/destructive`；input/select/option/focus；border 系列；rose/red/amber 柔化；`.clause-basic-card`；`.movement-none-badge`；`.topic-heat-cell.*`。

> 例外：`.text-gray-800/700/...` 的強制文字色（56-76 行）也會 hijack 刻意設定的文字色（如先前主題卡片）。**列為 Phase 3 觀察項**，預設保留（風險高、受益面小），元件層面用 inline／非 `text-gray-*` 類別繞開即可。

## 目標架構

1. **深色背景三來源（優先序）**
   - (a) `.glass-card`：已用 CSS 變數 `--card-bg` 自帶深色處理 → 容器優先用它。
   - (b) 元件層級 Tailwind `dark:` variant（如 `dark:bg-slate-900`）→ 個別卡片/按鈕顯式宣告。
   - (c) **縮限後的安全網**：保留 `.bg-white`/`.bg-slate-50..` → 深色的對應，作為「忘了標 dark」的兜底，但移除 `.rounded-*`/`.shadow-*`/`button`/`[class*=card/panel/...]` 這類「與顏色無關的結構選擇器」。
2. **顏色自帶元件不被 hijack**：凡 inline／arbitrary 背景或文字色的元件，深色模式維持自身顏色（安全網只認 `.bg-white`/`.bg-slate-*` 這種「明示淺色 Tailwind 類別」，不再認結構 class）。

## 遷移策略（分階段，每階段獨立 PR-able 且可回退）

**Phase 0 — 盤點**：以 grep 列出依賴各地毯式規則取得深色背景的元件清單（`.rounded-*` 無 `.glass-card` 又無 `dark:bg-*` 的容器、無 bg class 的 `<button>`、class 含 card/panel/section 的容器）。輸出對照表。

**Phase 1 — 結構選擇器（最高風險元兇）**：處理 `.rounded-lg/xl/2xl`（188-194）與 `button:not(...)`（257-268）。
- 先為清單內依賴它們的元件補 `dark:bg-slate-900`（或改掛 `.glass-card`）。
- 移除這兩組規則。
- 深色模式逐頁 sweep（cases、investment 各頁、todo、knowledge、login）。

**Phase 2 — 萬用屬性選擇器**：`[class*="card/Card/panel/Panel/section/Section/container/Container"]`（207-229）、`.shadow-*`（196-205）。同樣「先補後刪」。

**Phase 3 — 縮限 bg 安全網**：`.bg-white`/`.bg-slate-*`/`.bg-gray-*`（33-38、161-186）保留語意，但確認不再與結構選擇器疊加造成意外。`.text-gray-*` 強制文字色維持現狀（記錄為已知限制）。

**Phase 4 — 文件**：更新 `.claude/rules/dark-mode.md`：新元件深色背景一律 `dark:` variant／`.glass-card`，禁止新增地毯式 `!important` 結構覆蓋；附本次 before/after。

## Risks / Trade-offs

- **白底破圖風險**：移除規則若漏補某元件 → 深色模式出現淺色卡片。緩解：先補後刪、逐 phase sweep、可單條回退。
- **specificity 互動**：移除規則可能讓原本被壓制的其他規則浮現。緩解：每 phase 後 visual sweep。
- **受益 vs 成本**：完整遷移成本高。若時間有限，**只做 Phase 1** 即可消除目前最痛的 hijack（`.rounded-*` + `button`），其餘 phase 可獨立排程。

## Migration Plan

逐 phase 合併；任何 phase 出現回歸即還原該 phase 的 CSS 規則（元件補的 `dark:` 類別可保留，無害）。不需 DB／資料遷移。
