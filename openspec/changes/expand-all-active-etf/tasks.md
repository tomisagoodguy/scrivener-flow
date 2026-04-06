## 1. DB Migration

- [x] 1.1 新增 `supabase/migrations/<timestamp>_add_etf_stock_overlap.sql`，建立 `etf_stock_overlap` 表與 `(data_date, etf_count DESC)` 索引
- [x] 1.2 在本地或 Supabase Dashboard 執行 migration，確認表建立成功

## 2. Pocket Scraper

- [x] 2.1 新增 `ETF/scrapers/pocket_scraper.py`，移植 Jupyter notebook 的 `get_etf_holdings_selenium()` 邏輯，函式簽名改為 `scrape_holdings(etf_code: str) -> tuple[pd.DataFrame | None, str | None]`
- [x] 2.2 確認輸出 DataFrame 欄位為 `code`、`name`、`weight`、`shares`（與 moneydj_scraper 一致）
- [ ] 2.3 手動測試 `pocket_scraper.scrape_holdings("00982A")` 可正確回傳資料

## 3. MultiEtfStep 擴充

- [x] 3.1 修改 `ETF/pipeline/steps/multi_etf_step.py`，將 `SECONDARY_ETF_CODES` 從 `["00980A", "00991A"]` 擴充為 9 檔：`["00980A", "00982A", "00984A", "00985A", "00987A", "00991A", "00992A", "00993A", "00994A", "00995A"]`
- [x] 3.2 將 `scrape_holdings` 調用從 `moneydj_scraper` 改為 `pocket_scraper`
- [x] 3.3 更新 `ETF_META` 字典，補齊 7 個新 ETF 的名稱與經理人資訊
- [ ] 3.4 手動執行 `MultiEtfStep` 確認全部 9 檔寫入 `etf_holdings_snapshot`（dry-run 驗證爬取結果）

## 4. OverlapComputeStep

- [x] 4.1 新增 `ETF/pipeline/steps/overlap_compute_step.py`，從 `etf_holdings_snapshot` 聚合當日快照，計算各股的 `etf_count`、`total_weight`、`etf_list`（JSONB）
- [x] 4.2 使用 `ON CONFLICT (stock_code, data_date) DO UPDATE` 確保冪等
- [x] 4.3 修改 `ETF/pipeline/steps/__init__.py`，匯出 `OverlapComputeStep`
- [x] 4.4 修改 `ETF/pipeline/orchestrator.py`，在 `NotifyStep` 之前插入 `OverlapComputeStep`

## 5. Pipeline 整合測試

- [x] 5.1 執行 `uv run python ETF/main.py --dry-run` 確認無 import 錯誤
- [ ] 5.2 執行完整 `uv run python ETF/main.py`，確認 `etf_holdings_snapshot` 有 10 檔 ETF 資料、`etf_stock_overlap` 有當日聚合結果
- [ ] 5.3 確認 `ctx.secondary_stock_codes` 包含全部新增 ETF 成分股（log 輸出驗證）

## 6. API Route

- [x] 6.1 新增 `src/app/api/investment/consensus/route.ts`（GET），查詢 `etf_stock_overlap`，支援 `date`、`min_etf_count`（預設 2）、`limit`（預設 50）query params
- [x] 6.2 `date` 無資料時自動 fallback 最近一個有資料日期
- [x] 6.3 回傳格式：`{ data: [...], date: string, total: number }`

## 7. 前端頁面

- [x] 7.1 新增 `src/app/investment/consensus/page.tsx`（Server Component），呼叫 consensus API 取得資料
- [x] 7.2 實作共識持股排行表，欄位：股票代號（可點擊跳轉 `/investment/stock/[code]`）、名稱、ETF 數量、合計權重、持有 ETF 標籤
- [x] 7.3 實作 `min_etf_count` 篩選器（1/2/3/4+ 選項，Client Component）
- [x] 7.4 套用 `.glass-card` 與專案統一 UI 風格
- [x] 7.5 修改 SideNav，在投資模組區塊新增「經理人共識」連結指向 `/investment/consensus`

## 8. 驗收

- [ ] 8.1 瀏覽器開啟 `/investment/consensus`，確認表格顯示、篩選器可用、點擊股票可跳轉
- [ ] 8.2 確認被 2 檔以上 ETF 同時持有的股票列表合理（如台積電應出現）
- [x] 8.3 執行 `yarn lint` 無錯誤（新增檔案 lint 通過，存量 tools/ 錯誤為既有問題）
