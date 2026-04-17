檢查最近修改的元件是否有深色模式問題。

執行以下檢查：

1. **Tailwind dark: variants 被覆蓋的風險**
   搜尋含有 `dark:bg-` 且同時有 `rounded-xl` / `rounded-lg` / `rounded-2xl` / `shadow-sm` 的元素
   → 這些 dark: 會被 dark-theme.css 的 !important 蓋掉

2. **未處理的紅色**
   搜尋 `text-red-600` / `text-red-500` / `text-rose-600` 是否缺少 dark: 覆蓋或 dark-theme.css 規則

3. **輸出報告**
   列出所有有風險的元件檔案與行號，並說明應如何修正

參考 `.claude/rules/dark-mode.md` 的修正方式。
