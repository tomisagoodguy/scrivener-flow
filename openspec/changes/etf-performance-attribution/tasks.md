## 1. DB Schema（Supabase Migration）

- [ ] 1.1 新增 `supabase/migrations/<timestamp>_add_etf_benchmark_comparison.sql`（建立 `etf_benchmark_comparison` 表 + `(date, etf_code)` unique index）
- [ ] 1.2 新增 `supabase/migrations/<timestamp>_add_etf_holding_attribution.sql`（建立 `etf_holding_attribution` 表 + `(date, etf_code, stock_code)` unique index）

## 2. BenchmarkSyncStep 實作

- [ ] 2.1 建立 `ETF/pipeline/steps/benchmark_sync_step.py`，繼承 `BaseStep`（輔助步驟）
- [ ] 2.2 本地驗證 FinLab `price:收盤價` 對 ETF 代碼（00981A, 00980A）有效性（`--dry-run` 模式）
- [ ] 2.3 本地驗證 FinLab `index_price:收盤價` 對台灣加權指數有效性
- [ ] 2.4 實作 1M/3M/6M/1Y 累積報酬計算（`(price_t / price_t-N) - 1`）
- [ ] 2.5 實作 alpha 計算（etf_return - taiex_return）
- [ ] 2.6 UPSERT 寫入 `etf_benchmark_comparison`，失敗不 raise

## 3. AttributionComputeStep 實作

- [ ] 3.1 建立 `ETF/pipeline/steps/attribution_compute_step.py`，繼承 `BaseStep`（輔助步驟）
- [ ] 3.2 實作月末判斷邏輯（利用 `ctx.date_str` 判斷是否為當月最後一個交易日）
- [ ] 3.3 從 `etf_holdings_snapshot` 取上月末持股權重
- [ ] 3.4 從 `stock_prices_daily` 計算各持股本月報酬（月初收盤 vs 月末收盤）
- [ ] 3.5 計算 `contribution = weight × period_return / 100`（單位：bp）
- [ ] 3.6 UPSERT 寫入 `etf_holding_attribution`，失敗不 raise

## 4. Orchestrator 整合

- [ ] 4.1 在 `ETF/pipeline/orchestrator.py` 的 `PositionSummaryStep` 之後插入 `BenchmarkSyncStep` 和 `AttributionComputeStep`

## 5. Server Action

- [ ] 5.1 建立 `src/app/actions/getAttribution.ts`：
  - `getBenchmarkComparison(etfCode: string)` → 讀取 `etf_benchmark_comparison` 最近 1 年資料
  - `getHoldingAttribution(etfCode: string, date?: string)` → 讀取 `etf_holding_attribution` 最近一期資料

## 6. 前端頁面

- [ ] 6.1 建立 `src/app/investment/attribution/page.tsx`（Server Component）
- [ ] 6.2 實作 ETF 選擇器（沿用現有 ETF selector 元件或仿照 `[etf]/page.tsx`）
- [ ] 6.3 實作 ETF vs 加權指數累積報酬折線圖（使用 Lightweight Charts，沿用 `bare-k` 頁面的圖表元件）
- [ ] 6.4 實作 1M/3M/6M alpha 數值卡片（正值 rose、負值 emerald）
- [ ] 6.5 實作前五大貢獻者 / 拖累者橫向長條圖（`<BarChart>` 或純 Tailwind 實作）
- [ ] 6.6 在 `src/app/investment/layout.tsx` 的「更多」下拉選單加入「績效歸因」連結

## 7. 驗證

- [ ] 7.1 月末本地手動執行 `AttributionComputeStep` 驗證貢獻度計算正確性（加總應接近 ETF 當月報酬）
- [ ] 7.2 前端頁面確認折線圖、alpha 卡片、長條圖均正常顯示
- [ ] 7.3 合併至 main，觀察次日 CI log 確認兩個新步驟正常執行
