## 0. 盤點（Phase 0）✅

- [x] 0.1 grep 量化依賴 `.rounded-*` 取得深色背景的容器：563 個 className 含 rounded-*，扣除 glass-card(69)、bg-white/slate/gray(263) 後約 231 個僅靠規則著色
- [x] 0.2 / 0.3 確認 `.glass-card` 深色背景完全依賴 `[class*="card"]` 地毯式規則（globals.css 無 `.dark` 變數覆寫）
- [x] 0.4 輸出對照表與修正後策略至 `notes.md`

## 1. 結構性背景規則加 `:not([style*="background"])` 豁免（Phase 1，修正後做法）✅


- [x] 1.1 `.rounded-lg/.rounded-xl/.rounded-2xl`（圓角卡片）加豁免
- [x] 1.2 `button:not(...)` 與 `:hover`（按鈕）加豁免
- [x] 1.3 `.shadow/.shadow-sm/md/lg/xl` 加豁免
- [x] 1.4 `[class*="card"]/[class*="Card"]`、`[class*="container"]/[class*="Container"]`、`[class*="panel/Panel/section/Section"]` 加豁免
- [x] 1.5 `.bg-white`、`.bg-slate-50..300`、`.bg-gray-50..300`（含半透明）加豁免
- [x] 1.6 深色模式逐頁 sweep：`/cases`、`/cases/[id]`、`/investment`、`/investment/sectors`（含主題視圖）、`/investment/[etf]`、`/investment/strategy`、`/investment/equity`、`/todo`、`/knowledge`、`/login`、`/calculator` → 確認無回歸（自帶 inline 背景的元件恢復原色、其餘維持深色）

## 2. 文件（Phase 1 收尾）✅

- [x] 2.1 更新 `.claude/rules/dark-mode.md`：說明 `:not([style*="background"])` 豁免機制；新元件深色背景一律 `dark:` variant 或 `.glass-card`，inline 背景色不再被 hijack
- [x] 2.2 附 `EtfTopicHeatmap`（`.topic-tile` + inline）作為「自帶顏色元件」範例

## 3. 長期方向（已由後續 change `dark-theme-token-migration` 接手）

- [x] 3.1 globals.css 補 `.dark` CSS 變數覆寫（`--card-bg`、`--surface`、`--background`、`--card-border`）→ 由 `dark-theme-token-migration` 完成（commit d6580d3f）
- [x] 3.2 移除 `[class*="card"]` 等地毯式規則（先補後刪）→ 由 `dark-theme-token-migration` 完成（commit d6580d3f）
- [x] 3.3 評估 `.text-gray-*` 文字色 `:not([style*="color"])` 豁免 → 評估完成：暫不豁免，記為已知限制於 `dark-mode.md`（元件以 inline 文字色繞開）

## 4. 驗證 ✅

- [x] 4.1 `yarn build` 通過（2026-07-11，46s exit 0）、`yarn lint` 無新增錯誤（EtfTopicHeatmap.tsx 零 lint 問題；既有 repo-wide 錯誤與本 change 無關）
- [x] 4.2 確認 `/investment/sectors` 主題卡片在兩模式皆顯示各自主題色（1.6 逐頁 sweep 已含主題視圖；靜態驗證：EtfTopicHeatmap 卡片用 inline backgroundColor + dark-theme.css 34 處 `:not([style*="background"])` 豁免，inline 色不被覆蓋）
