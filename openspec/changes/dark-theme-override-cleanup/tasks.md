## 0. 盤點（Phase 0）✅

- [x] 0.1 grep 量化依賴 `.rounded-*` 取得深色背景的容器：563 個 className 含 rounded-*，扣除 glass-card(69)、bg-white/slate/gray(263) 後約 231 個僅靠規則著色
- [x] 0.2 / 0.3 確認 `.glass-card` 深色背景完全依賴 `[class*="card"]` 地毯式規則（globals.css 無 `.dark` 變數覆寫）
- [x] 0.4 輸出對照表與修正後策略至 `notes.md`

## 1. 結構性背景規則加 `:not([style*="background"])` 豁免（Phase 1，修正後做法）✅

> Phase 0 後改採此法取代「先補後刪 200+ 元件」：規則自動跳過自帶 inline 背景的元件，零元件改動、近乎零回歸。

- [x] 1.1 `.rounded-lg/.rounded-xl/.rounded-2xl`（圓角卡片）加豁免
- [x] 1.2 `button:not(...)` 與 `:hover`（按鈕）加豁免
- [x] 1.3 `.shadow/.shadow-sm/md/lg/xl` 加豁免
- [x] 1.4 `[class*="card"]/[class*="Card"]`、`[class*="container"]/[class*="Container"]`、`[class*="panel/Panel/section/Section"]` 加豁免
- [x] 1.5 `.bg-white`、`.bg-slate-50..300`、`.bg-gray-50..300`（含半透明）加豁免
- [ ] 1.6 深色模式逐頁 sweep：`/cases`、`/cases/[id]`、`/investment`、`/investment/sectors`（含主題視圖）、`/investment/[etf]`、`/investment/strategy`、`/investment/equity`、`/todo`、`/knowledge`、`/login`、`/calculator` → 確認無回歸（自帶 inline 背景的元件恢復原色、其餘維持深色）

## 2. 文件（Phase 1 收尾）✅

- [x] 2.1 更新 `.claude/rules/dark-mode.md`：說明 `:not([style*="background"])` 豁免機制；新元件深色背景一律 `dark:` variant 或 `.glass-card`，inline 背景色不再被 hijack
- [x] 2.2 附 `EtfTopicHeatmap`（`.topic-tile` + inline）作為「自帶顏色元件」範例

## 3. 長期方向（未來，非本次）

- [ ] 3.1 globals.css 補 `.dark` CSS 變數覆寫（`--card-bg`、`--surface`、`--background`、`--card-border`）→ glass-card 等變數驅動元件自帶深色
- [ ] 3.2 變數就位後，逐步移除 `[class*="card"]` 等地毯式規則（先補後刪）
- [ ] 3.3 評估是否對 `.text-gray-*` 文字色加 `:not([style*="color"])` 豁免（目前已知限制）

## 4. 驗證

- [ ] 4.1 `yarn build` 通過、`yarn lint` 無新增錯誤
- [ ] 4.2 確認 `/investment/sectors` 主題卡片在兩模式皆顯示各自主題色（本問題的回歸守門）

## 4. 文件（Phase 4）

- [ ] 4.1 更新 `.claude/rules/dark-mode.md`：新增「正確做法：深色背景用 `dark:` variant 或 `.glass-card`」段落，明文禁止新增地毯式 `!important` 結構覆蓋
- [ ] 4.2 在 `.claude/rules/dark-mode.md` 附本次 before/after 與 `EtfTopicHeatmap`（`.topic-tile` + inline 文字色）作為「繞開覆蓋」範例

## 5. 驗證

- [ ] 5.1 `yarn build` 通過、`yarn lint` 無新增錯誤
- [ ] 5.2 深淺兩模式逐頁 sweep 完成，無視覺回歸（截圖歸檔）
- [ ] 5.3 確認 `/investment/sectors` 主題卡片在兩模式皆顯示各自主題色（本問題的回歸守門）
