## Context

現有 ETF Pipeline 追蹤 3 檔主動式 ETF：
- **00981A**（主流程）— 復華投信，走 `fhtrust_scraper.py`
- **00980A / 00991A**（次要）— 走 `moneydj_scraper.py` + `MultiEtfStep`

Jupyter notebook `EOCS/下載主動式ETF.ipynb` 已驗證 Pocket.tw 可抓取全部 10 檔主動式 ETF 持股（00980A/00981A/00982A/00984A/00985A/00987A/00991A/00992A/00993A/00994A/00995A），輸出格式一致（代號/名稱/權重/持有數）。

Supabase 已有表：`etf_holdings_snapshot`、`etf_weight_history`、`etf_sectors`、`etf_aum`，schema 支援任意 `etf_code`，只需寫入新資料即可。

## Goals / Non-Goals

**Goals:**
- 全部 10 檔主動式 ETF 每日持股快照自動存入 Supabase
- 每日預計算各股票的「共識分數」（被幾檔 ETF 持有、合計權重）
- 前端 `/investment/consensus` 頁面展示共識持股排行與個股分布

**Non-Goals:**
- 不修改 00981A 主流程（fhtrust_scraper 保持不動）
- 不做歷史回補（只從整合後的第一天開始累積）
- 不追蹤 ETF 本身的股價或報酬率

## Decisions

### 決策 1：新增 `pocket_scraper.py`，不修改現有 scrapers

**選擇**：新增 `ETF/scrapers/pocket_scraper.py` 封裝 Pocket.tw 邏輯，`moneydj_scraper.py` 和 `fhtrust_scraper.py` 保持不動。

**理由**：
- Jupyter 已驗證 Pocket.tw 可抓全部 10 檔，資料格式一致
- MoneyDJ 爬蟲依賴 `requests + BeautifulSoup`（靜態），Pocket.tw 需要 Selenium（JS 渲染），兩者混用反而增加維護複雜度
- 保持現有 scraper 不變，降低 00981A 主流程的迴歸風險

**替代方案**：擴充 `moneydj_scraper.py` 支援更多 ETF — 但 MoneyDJ 不一定有全部 10 檔資料。

### 決策 2：擴充 `MultiEtfStep` 而非新建步驟

**選擇**：`MultiEtfStep` 改用 `pocket_scraper` 並擴充 `SECONDARY_ETF_CODES` 為 9 檔。

**理由**：
- `MultiEtfStep` 職責本就是「處理非主流程的 ETF」，語意吻合
- 避免 Orchestrator 步驟數爆炸
- `ctx.secondary_stock_codes` 的收集邏輯不需改動

**替代方案**：新建 `AllEtfStep` — 過度設計，現有架構足夠。

### 決策 3：新增 `etf_stock_overlap` 表，預計算共識

**選擇**：`OverlapComputeStep` 在每次 Pipeline 跑完後，對當日所有 ETF 快照做聚合，寫入 `etf_stock_overlap(stock_code, data_date, etf_count, total_weight, etf_list)`。

**理由**：
- 前端查詢直接讀預計算結果，不做即時 JOIN，避免慢查詢
- `etf_list` 用 JSONB 存持有 ETF 清單（含各自 weight），前端可直接展示

**替代方案**：前端即時聚合 — 10 檔 × 最多 111 檔持股，每次查詢掃描 ~600 列，可接受；但未來擴充至更多 ETF 時會變慢。預計算更穩健。

### 決策 4：API Route 而非 Server Action

**選擇**：新增 `src/app/api/investment/consensus/route.ts`（GET）供前端呼叫。

**理由**：共識頁面為純讀取，無資料突變；且需要分頁參數（`?date=&min_etf_count=`），REST GET 更自然。依照 CLAUDE.md 規範，Webhook 以外的第三方整合才用 Route，此處是內部 API 查詢，符合例外條件（需要特定 HTTP Method + query params）。

## Risks / Trade-offs

- **Selenium 並行穩定性** → Jupyter 已用 `ThreadPoolExecutor(max_workers=4)` 驗證，Pipeline CI 環境需確認 Chrome headless 可用；若失敗，`MultiEtfStep` 對個別 ETF 已有 try/catch，不影響整體 Pipeline。
- **Pocket.tw 資料延遲** → 若資料日期與今日不同，記錄實際 `data_date` 而非執行日期，避免資料污染。
- **overlap 表與快照不一致** → `OverlapComputeStep` 依賴同一天的快照，若某 ETF 當日爬取失敗，overlap 會低估。接受此限制，前端顯示「基於 N 檔 ETF 資料」說明。

## Migration Plan

1. 部署新 migration SQL（`etf_stock_overlap` 表）
2. 部署 Pipeline 程式碼（`pocket_scraper`、`MultiEtfStep` 擴充、`OverlapComputeStep`）
3. 手動執行一次 `ETF/main.py` 確認全部 10 檔寫入成功
4. 部署前端 `/investment/consensus` 頁面

Rollback：`OverlapComputeStep` 失敗不影響主流程（獨立 try/catch）；前端頁面 rollback 只需移除路由。

## Open Questions

- 00987A（凱基主動式 ETF）持股數僅 26 檔，確認 Pocket.tw 是否穩定？（Jupyter 已抓到，應無問題）
- `etf_stock_overlap` 要不要保留歷史？目前設計每日一筆，可查歷史趨勢。保留。
