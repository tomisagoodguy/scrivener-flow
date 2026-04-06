## Why

現有 Pipeline 只追蹤 3 檔主動式 ETF（00981A/00980A/00991A），台灣市場已有 10 檔主動式 ETF 在運作。無法看出多位基金經理人同時加碼的股票（「共識持股」），錯失重要選股訊號。

## What Changes

- 新增 `ETF/scrapers/pocket_scraper.py`，封裝 Pocket.tw 爬蟲（已在 EOCS/下載主動式ETF.ipynb 驗證），支援全部 10 檔 ETF 統一爬取
- 擴充 `ETF/pipeline/steps/multi_etf_step.py`，SECONDARY_ETF_CODES 從 2 檔擴充至 9 檔（加入 00982A/00984A/00985A/00987A/00992A/00993A/00994A/00995A）
- 新增 DB migration：`etf_stock_overlap` 表，每日預計算各股票被幾檔 ETF 持有及合計權重
- 新增 `ETF/pipeline/steps/overlap_compute_step.py`，Pipeline 每日執行後自動更新 overlap 表
- 新增前端頁面 `src/app/investment/consensus/page.tsx`，展示共識持股排行、個股持有分布、本週異動

## Capabilities

### New Capabilities
- `pocket-scraper`: 通用 Pocket.tw ETF 持股爬蟲，支援任意主動式 ETF 代號，輸出統一格式 DataFrame（code, name, weight, shares）
- `all-etf-pipeline`: 擴充 MultiEtfStep 支援全部 10 檔主動式 ETF，確保每日快照、weight history、AUM 一併更新
- `etf-stock-overlap`: 每日計算各股票的共識分數（持有 ETF 數量、合計權重、ETF 清單），存入 Supabase
- `consensus-ui`: 前端 `/investment/consensus` 頁面，顯示跨 ETF 共識持股排行、個股被哪些 ETF 持有與各自權重、本週新增/移出共識的異動清單

### Modified Capabilities
- `multi-etf-pipeline`: MultiEtfStep 的追蹤 ETF 清單從 00980A/00991A 擴充至 9 檔，並整合 pocket_scraper 作為備援資料源

## Impact

- `ETF/scrapers/pocket_scraper.py`：新增檔案
- `ETF/pipeline/steps/multi_etf_step.py`：修改 SECONDARY_ETF_CODES 與爬蟲調用邏輯
- `ETF/pipeline/steps/overlap_compute_step.py`：新增檔案
- `ETF/pipeline/orchestrator.py`：加入 OverlapComputeStep
- `ETF/pipeline/context.py`：secondary_stock_codes 需涵蓋全部新增 ETF
- `supabase/migrations/`：新增 migration SQL（etf_stock_overlap 表）
- `src/app/investment/consensus/page.tsx`：新增頁面
- `src/app/api/investment/consensus/route.ts`：新增 API Route（讀取 overlap 資料）
- `src/components/layout/SideNav`：新增導覽連結
- 依賴：Selenium（已有）、無新增外部依賴
