## 1. 資料層：turnover 欄位

- [x] 1.1 [P] 新增 migration `supabase/migrations/20260701120000_add_treemap_turnover.sql`，對 `market_treemap_daily` 加入 `turnover BIGINT`（可為 null）。驗證：於 Supabase 執行後查 `information_schema.columns` 確認 `market_treemap_daily.turnover` 存在且型別為 bigint。

## 2. Pipeline：SyncTreemapStep 取成交值（實作 Requirement: Treemap data pipeline step）

- [x] 2.1 （Requirement: Treemap data pipeline step）在 `ETF/pipeline/steps/sync_treemap_step.py` 的 `_run` 中以 `fd.get("price:成交金額")` 取最後一列 turnover，並在組裝 rows 的 dict 加入 `"turnover"`（取不到或 NaN 時填 None）。驗證：手動或 pytest 呼叫 `_run` 後，rows 每筆含 `turnover` 鍵，且成交值缺值者為 None。
- [x] 2.2 更新 `_upsert` 的 INSERT 欄位清單、VALUES 佔位符與 `ON CONFLICT DO UPDATE SET` 皆納入 `turnover`。驗證：實際 upsert 一批含 turnover 的 rows 後，查 `market_treemap_daily` 最新日期該欄有值；`uv run ruff check ETF/pipeline/steps/sync_treemap_step.py` 無錯。

## 3. Server Action：帶出 turnover

- [x] 3.1 [P] 在 `src/app/actions/getTreemapData.ts` 的 `TreemapStock` 介面新增 `turnover: number | null`，並在 `.select(...)` 字串加入 `turnover`。驗證：`yarn build` 型別檢查通過，回傳物件含 `turnover` 欄位。

## 4. 前端：資金熱度模式切換（實作 Requirement: Treemap money-heat display mode）

- [x] 4.1 （Requirement: Treemap money-heat display mode）在 `src/app/investment/sectors/components/SectorTreemap.tsx` 新增 `sizeMode: 'market_cap' | 'money_heat'` 本地 state（預設 `market_cap`）與切換 UI（「市值 / 資金熱度」兩鈕）。驗證：手動操作可切換，預設載入為「市值」。
- [x] 4.2 讓 `buildTreemapData` 依 `sizeMode` 決定 `size`：`money_heat` 時 `size = Math.abs(change_pct ?? 0) × (turnover ?? 0)`，值為 0 或缺值時退回極小正值（1），顏色維持 `change_pct`。驗證：切到「資金熱度」時方塊依成交值×漲幅重排、無空白或 NaN；切回「市值」還原。
- [x] 4.3 `money_heat` 模式下 Hint 文案改為含「方塊大小 = |漲跌幅| × 成交值（當日量能估算，非法人資金流向）」。驗證：切換模式時 Hint 文字對應更新且含「非法人資金流向」字樣。

## 5. 驗證

- [x] 5.1 `yarn build` 與 `yarn lint` 通過、無新增錯誤。驗證：兩指令 exit code 0。
