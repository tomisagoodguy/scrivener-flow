# 深色模式規則

## 核心陷阱：`!important` 覆蓋問題

`dark-theme.css` 對結構性 class 套用 `!important`，會蓋掉 Tailwind `dark:` variants：

```
html.dark .rounded-xl  { background-color: #1e293b !important }
html.dark .shadow-sm   { background-color: #1e293b !important }
html.dark .bg-white    { background-color: #1e293b !important }
```

**因此 `dark:bg-rose-950/20` 這類 Tailwind dark: 寫法在有 `rounded-xl` 的元素上無效。**

## inline 背景色不會被 hijack（`:not([style*="background"])` 豁免）

上述結構性背景規則（`.rounded-*`、`.shadow-*`、`button:not(...)`、`[class*="card/panel/section/container"]`、`.bg-white/slate/gray`）已全部加上 `:not([style*="background"])` 修飾：

```css
html.dark .rounded-lg:not([style*="background"]) { background-color: #1e293b !important }
```

**含義：任何設了 inline 背景色的元件，在深色模式不會被地毯式規則蓋掉，會保留自身顏色。**

```tsx
// ✅ 自帶顏色的卡片：inline 背景在深淺模式都生效，不會被壓成統一深灰
<div style={{ backgroundColor: hexColor }} className="rounded-lg p-2"> ... </div>
```

範例：`EtfTopicHeatmap`（族群強弱「主題」熱力卡片）每張卡片用 inline 主題色 + inline 文字色，深淺兩模式都顯示各自顏色。

> ⚠️ 限制：
> - 只豁免 **inline** 背景（React `style={{ backgroundColor }}`）。Tailwind arbitrary class（`bg-[#abc]`）編譯成 class、不是 inline style，**不**在豁免範圍。
> - 文字色 `.text-gray-*` 的 `!important` 仍會 hijack 刻意設定的文字色；需要時用 **inline 文字色**（`style={{ color }}`）或非 `text-gray-*` 類別繞開（見 `EtfTopicHeatmap`）。

> 🚫 禁止：不要再新增「與顏色無關的結構選擇器 + 強制 `background-color !important`」這種地毯式覆蓋。新元件深色背景一律用元件層級 `dark:` variant 或 `.glass-card`（變數驅動）。

## 正確做法

需要深色模式特定背景時，加專用 CSS class：

```tsx
// ❌ 錯：Tailwind dark: 會被蓋掉
<div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl">

// ✅ 正確方式 A：在 dark-theme.css 用組合選擇器搶回優先度
html.dark .bg-rose-50.rounded-xl { background-color: rgba(244,63,94,0.08) !important }

// ✅ 正確方式 B：加專用 class
<div className="case-warning-note rounded-xl">
// 然後在 dark-theme.css 末尾加：
html.dark .case-warning-note { background: ... !important }
```

## 顏色規範（夜間模式）

| 用途 | light | dark |
|------|-------|------|
| 警告文字 | `text-rose-600` | `#fda4af`（rose-300）|
| 警告底色 | `bg-rose-50` | `rgba(244,63,94,0.08)` |
| 錯誤文字 | `text-red-600` | `#f87171`（red-400）|
| 錯誤底色 | `bg-red-50` | `rgba(239,68,68,0.10)` |
| 逾期標籤 | `bg-red-500 text-white` | `bg-red-900 text-red-300` |
