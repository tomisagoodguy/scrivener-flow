## Context

`/investment/sectors` 熱力圖由 `SectorTreemap` 元件渲染，資料來自 `getTreemapData` server action 讀取 `market_treemap_daily`（欄位：`date, stock_code, stock_name, industry, market_cap, close, change_pct`）。此表由 ETF pipeline 輔助步驟 `SyncTreemapStep` 每日 upsert，資料源為 finlab（`price:收盤價`、`etl:market_cap`、`security_industry_themes`）。

現況方塊大小固定用 `market_cap`、顏色用 `change_pct`。已用 finlab 實測「漲幅 × 成交值」proxy 與 `etf_flow_daily`（法人 flow）幾乎不相關（Spearman ≈ +0.11、方向同向率 ≈ 50%），故此 proxy 定位為**全市場當日資金熱度（量能估算）**，與法人 flow 刻意區隔。finlab 已提供 `price:成交金額`（成交值，單位元）。

## Goals / Non-Goals

**Goals:**

- 讓熱力圖能以「資金熱度」= `|change_pct| × turnover` 決定方塊大小，補足全市場資金集中度視角。
- 成交值 `turnover` 進入 `market_treemap_daily` 並經 server action 帶到前端。
- 明確標示此模式為量能估算，避免與法人資金流向混淆。

**Non-Goals:**

- 不動 `etf_flow_daily` / `DailyFlowPanel`。
- 不新增頁面或路由，只在既有熱力圖加模式切換。
- 不做歷史回補；上線前的舊列 `turnover` 為 null。

## Decisions

- **欄位型別**：`market_treemap_daily.turnover` 用 `BIGINT`（成交值以元計，全市場單股單日成交值最大約數百億，落在 bigint 範圍內），可為 null。
- **pipeline 取值**：`SyncTreemapStep` 以 `fd.get("price:成交金額")` 取最後一列，對齊既有 `last_close` 的日期；取不到時 `turnover` 寫 null，不影響其他欄位（沿用該步驟現有「輔助步驟失敗不中斷」慣例）。
- **前端模式切換**：`SectorTreemap` 新增 `sizeMode: 'market_cap' | 'money_heat'` 本地 state，預設 `market_cap`（維持現有預設，符合 CLAUDE.md「禁止改動預設行為」精神）。`money_heat` 時 `buildTreemapData` 的 `size` 改用 `Math.abs(change_pct) × turnover`。
- **顏色不變**：兩種模式顏色都維持 `change_pct` 的台股慣例（紅漲綠跌），只有「大小」語意改變。
- **null / 缺值處理**：`money_heat` 模式下 `turnover` 為 null 或 0 的股票，其 `size` 退回一個極小正值（例如 1），避免方塊消失或 NaN；`change_pct` 為 null 時視為 0。
- **誠實標示**：`money_heat` 模式下 Hint 列文案改為「方塊大小 = |漲跌幅| × 成交值（當日量能估算，非法人資金流向）· 顏色 = 漲跌幅」。

## Implementation Contract

- **Behavior**：使用者在熱力圖上看到「市值 / 資金熱度」切換鈕。選「資金熱度」後，方塊大小改由 `|漲跌幅| × 成交值` 決定，成交量能集中的個股方塊變大；顏色仍為漲跌幅。切回「市值」恢復現況。頁面首次載入預設為「市值」。
- **Data shape**：
  - `market_treemap_daily` 增欄 `turnover BIGINT NULL`。
  - `SyncTreemapStep` upsert 的 INSERT 欄位與 `ON CONFLICT DO UPDATE` 皆納入 `turnover`，rows dict 新增 `"turnover"` 鍵。
  - `TreemapStock` 型別新增 `turnover: number | null`；`getTreemapData` 的 `.select(...)` 字串加入 `turnover`。
- **Failure modes**：`price:成交金額` 抓取失敗時，`turnover` 為 null，步驟其餘欄位照常寫入、不 raise（沿用輔助步驟慣例）。前端遇 null turnover 於 money_heat 模式以極小正值代入，不得產生 NaN 或空白畫面。
- **Acceptance criteria**：
  1. 執行 migration 後，`market_treemap_daily` 具 `turnover` 欄。
  2. `uv run python ETF/main.py --dry-run` 不因 `SyncTreemapStep` 改動而中斷（dry-run 本就 skip 此步驟，改為以既有 pytest 或手動 `_run` 驗證組裝 rows 含 turnover 鍵）。
  3. 前端切到「資金熱度」時方塊大小明顯依成交值×漲幅重排，切回「市值」還原；`yarn build` 通過、`yarn lint` 無新錯。
  4. money_heat 模式 Hint 文案含「非法人資金流向」字樣。
- **Scope boundaries**：
  - In scope：DB migration 增欄、`SyncTreemapStep` 取值與 upsert、`getTreemapData` 帶欄、`SectorTreemap` 模式切換與大小計算、Hint 文案。
  - Out of scope：`etf_flow_daily` 相關程式、歷史回補、新路由/頁面、顏色規則變更、Top-N 篩選邏輯變更。

## Risks / Trade-offs

- **語意誤解風險**：使用者可能把「資金熱度」當成法人買賣。以 Hint 明確標示「量能估算，非法人資金流向」緩解。
- **舊資料無 turnover**：上線前日期在 money_heat 模式方塊會偏小/退回極小值；屬預期，資料往前自然累積後改善，不做回補。
- **bigint 溢位**：成交值以元計，單股單日極端上限仍遠低於 bigint 上限，無溢位風險。
