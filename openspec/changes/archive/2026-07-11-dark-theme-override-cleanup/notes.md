# Phase 0 盤點結果與修正後的策略

## 關鍵發現

### 1. `.glass-card` 的深色背景是「承重牆」
- globals.css `:root` 定義 `--card-bg:#ffffff`，**沒有** `.dark` 版本變數覆寫。
- `.glass-card { background: var(--card-bg) }` 因此永遠是白色。
- 它在深色模式變深，**完全靠** `html.dark [class*="card"] { background-color:#1e293b !important }`（dark-theme.css:208）。
- ⇒ 直接移除 `[class*="card"]` 會讓全站 glass-card 失去深色背景。正確的「移除前置」是先在 globals.css 補 `.dark { --card-bg:#1e293b; ... }`，讓 glass-card 變數驅動自帶深色。（列為未來 Phase 2 前置）

### 2. `.rounded-*` 地毯式規則影響面（量化）
| 指標 | 數量 |
|------|------|
| 含 `rounded-(lg\|xl\|2xl)` 的 className | 563 |
| ↳ 同時有 `glass-card`（另由 card 規則涵蓋） | 69 |
| ↳ 同時有 `bg-white/bg-slate-N/bg-gray-N`（另由 bg-* 規則著色） | 263 |
| ↳ **僅靠 rounded 規則取得深色背景（需個別處理）** | **約 231** |

⇒「先補後刪」需逐一補 200+ 元件 → 成本與回歸風險過高，**放棄整條移除**。

## 修正後的 Phase 1 做法：`:not([style*="background"])` 豁免

不移除地毯式規則，改為在結構性背景規則的選擇器尾端加 `:not([style*="background"])`，
讓規則**自動跳過任何設了 inline 背景色的元件**：

```css
html.dark .rounded-lg:not([style*="background"]),
html.dark .rounded-xl:not([style*="background"]),
html.dark .rounded-2xl:not([style*="background"]) { background-color:#1e293b !important }
```

- 只豁免「自帶 inline 背景」的元件 —— 正好是被 hijack 的那一類（如主題卡片）。
- 其餘 ~231 個靠規則著色的元件**行為完全不變**（它們沒有 inline 背景）。
- React `style={{ backgroundColor }}` 在 DOM 渲染為 `style="background-color:…"`，`[style*="background"]` 可匹配。
- 一條修飾根除整類 foot-gun，零元件改動，近乎零回歸風險。

### 套用範圍（所有結構性背景覆蓋）
為使「inline 顏色永不被 hijack」的契約成立，對下列**全部**結構性背景規則套用同一豁免：
- `.rounded-lg/.rounded-xl/.rounded-2xl`（188-194）
- `.shadow/.shadow-sm/md/lg/xl`（196-205，僅豁免 background-color，box-shadow 不影響）
- `[class*="card"]/[class*="Card"]`（207-214）
- `[class*="container"]/[class*="Container"]`（216-220，forces transparent，同屬 hijack）
- `[class*="panel"]/[class*="Panel"]/[class*="section"]/[class*="Section"]`（222-229）
- `button:not(...)` 與 `:hover`（257-268）
- `.bg-white`、`.bg-slate-50..300`、`.bg-gray-50..300`（33-38、161-186，一致性）

### 已知限制（記錄、不在本次處理）
- arbitrary class（如 `bg-[#abc]`）編譯成 class 而非 inline style，`[style*=...]` 不匹配 → 不豁免。實務上痛點集中在 inline style，arbitrary 背景罕見。
- `.text-gray-*` 強制文字色（56-76）同樣會 hijack inline 文字色；本次保留，元件以 inline／非 `text-gray-*` 繞開（如已修好的 EtfTopicHeatmap）。若要一併豁免可加 `:not([style*="color"])`，列為後續。

## 未來方向（非本次）
- globals.css 補 `.dark` 變數覆寫（`--card-bg`、`--surface`、`--background`、`--card-border`）→ glass-card 等變數驅動元件自帶深色，之後才可安全移除 `[class*="card"]` 地毯式規則。
