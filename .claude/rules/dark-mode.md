# 深色模式規則

## 核心陷阱：`!important` 覆蓋問題

`dark-theme.css` 對結構性 class 套用 `!important`，會蓋掉 Tailwind `dark:` variants：

```
html.dark .rounded-xl  { background-color: #1e293b !important }
html.dark .shadow-sm   { background-color: #1e293b !important }
html.dark .bg-white    { background-color: #1e293b !important }
```

**因此 `dark:bg-rose-950/20` 這類 Tailwind dark: 寫法在有 `rounded-xl` 的元素上無效。**

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
