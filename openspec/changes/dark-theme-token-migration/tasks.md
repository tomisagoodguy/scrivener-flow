## 1. 先補：變數驅動深色表面（Variable-driven dark surface colors）

- [x] 1.1 在 `src/app/globals.css` `:root` 之後新增 `html.dark { ... }` 區塊，依 design「以 html.dark 變數覆寫驅動表面色，取代 [class*="card"] 地毯式覆蓋」覆寫 `--background`／`--foreground`／`--card-bg`／`--card-border`／`--surface`／`--surface-hover`／`--border-color`／`--glass-border`／`--secondary` 為對齊現行 `dark-theme.css` 色階的深色值。完成標準：深色模式下 `.glass-card`、`.glass`、`body` 的背景/邊框由變數解析為深色，色值與本變更前一致。驗證：`yarn build` 通過，且深色模式下 `/cases`、`/investment` 卡片背景目視維持 slate-900（規則此時仍在，作冗餘保險，應零變化）。
- [x] 1.2 確認 Variable-driven dark surface colors 對 Tailwind `@theme inline` utility 生效：驗證使用 `bg-card`／`border` token 的元件在深色模式背景/邊框跟隨 `html.dark` 變數。驗證：於深色模式實機檢視至少一個 `bg-card` 元件（如 dashboard 卡片）背景為深色；若不生效則於 design 風險所述補專用 `html.dark .bg-card` 處理並記錄。

## 2. 後刪：移除萬用結構背景規則（Removal of wildcard structural background overrides）

- [x] 2.1 Removal of wildcard structural background overrides：依 design「移除 [class*="card/panel/section"] 六條萬用結構背景規則」，先確認 `.glass-card` 等主要表面已由變數著色（Task 1 完成），再從 `src/app/dark-theme.css` 移除 `html.dark [class*="card"]`、`[class*="Card"]`、`[class*="panel"]`、`[class*="Panel"]`、`[class*="section"]`、`[class*="Section"]` 六條背景規則（每組獨立 commit）。完成標準：`dark-theme.css` 搜尋不再含這六條規則。驗證：Grep `dark-theme.css` 確認零命中，且每組刪除後逐頁 sweep 無白底回歸。
- [x] 2.2 評估並處理 `html.dark [class*="container"]`（強制 `transparent`）：移除後若容器仍透明則刪，否則保留並註記原因。完成標準：容器背景行為在深色模式不變。驗證：深色模式檢視含 "container" class 的版面容器，確認背景未出現非預期色塊。

## 3. 縮限具名安全網（Narrowed named safety-net for unhandled surfaces）

- [x] 3.1 Narrowed named safety-net for unhandled surfaces：依 design「縮限 bg-white / bg-slate / bg-gray 為具名安全網」，在 `src/app/dark-theme.css` 移除 `[class*="bg-slate-50/"]` 等萬用 substring 匹配，改列舉具體半透明類別，保留 `.bg-white`／`.bg-slate-50..300`／`.bg-gray-50..300`（含 `:not([style*="background"])` 豁免）作為具名 fallback。完成標準：未顯式宣告深色背景且無 inline 背景的元素仍取得深色 fallback；僅被移除萬用匹配命中的元素不再倚賴它。驗證：Grep 確認 `[class*="bg-slate-50/"]` 已移除，且深色模式 sweep 無新增破圖。

## 4. 保護 inline 顏色與文件（Inline and arbitrary colored components are never hijacked）

- [ ] 4.1 [P] 驗證 Inline and arbitrary colored components are never hijacked：深淺兩模式檢視 `/investment/sectors` 主題視圖，確認每張主題卡片顯示各自 inline 主題色、未被壓成統一深灰（原始回歸案例守門）。驗證：主題卡片在 light 與 dark 皆呈現不同主題色。
- [x] 4.2 [P] 更新 `.claude/rules/dark-mode.md`：新增「變數驅動深色表面」為首選做法，記錄 `globals.css` 的 `html.dark` 變數覆寫存在與用途，並標註 `[class*="card/panel/section"]` 萬用結構規則已移除。完成標準：規則文件反映新做法。驗證：內容審查，確認含變數驅動段落與已移除規則清單。

## 5. 驗證（逐表面 sweep 回歸守門）

- [ ] 5.1 依 design「逐表面深淺雙模式 sweep 作為回歸守門」執行深色模式逐頁 sweep：`/cases`、`/cases/[id]`、`/investment`、`/investment/sectors`、`/investment/[etf]`、`/investment/strategy`、`/investment/equity`、`/knowledge`、`/login`、`/calculator`、`/notes`。完成標準：所有卡片/panel/容器維持深色背景，無白底/淺底破圖。驗證：逐頁目視確認並記錄；破圖頁面回退對應 commit 或補 `dark:` 處理。
- [x] 5.2 [P] 執行 `yarn build` 與 `yarn lint`。完成標準：build 通過、lint 無新增錯誤。驗證：兩指令 exit code 0 且無新增 warning/error。
