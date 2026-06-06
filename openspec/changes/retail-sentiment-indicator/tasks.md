## 1. 資料庫 Migration：擴充 market_breadth_daily 現有資料表

- [x] 1.1 建立 `supabase/migrations/20260606140000_add_retail_sentiment.sql`，對 `market_breadth_daily` 新增 `small_holder_chg_12w NUMERIC`、`small_holder_z_score NUMERIC`、`is_retail_accelerating BOOLEAN`、`is_odd_lot_fragmented BOOLEAN` 四欄，使用 `ADD COLUMN IF NOT EXISTS`（對應 market_breadth_daily schema extension）
- [ ] 1.2 在 Supabase SQL Editor 執行 migration，確認四欄出現於 `market_breadth_daily` schema

## 2. Pipeline：Retail sentiment pipeline step（12 週變化 + 近 3 年滾動 P90 作為信號門檻）

- [x] 2.1 [P] 建立 `ETF/pipeline/steps/retail_sentiment_step.py`：`RetailSentimentStep.run()` 實作 Retail sentiment pipeline step，從 FinLab 取 `etl:inventory:小於十張佔比` 與 `etl:inventory:零股佔比`，以 `median(axis=1)` 計算市場層級序列，計算 12 週變化、156 週滾動 P90/mean/std、Z-score，判斷 `is_retail_accelerating` 與 `is_odd_lot_fragmented`（對應使用全市場中位數聚合（median）決策）
- [x] 2.2 [P] 在 `RetailSentimentStep._save()` 中使用 SQLAlchemy `text()` UPDATE `market_breadth_daily`，寫入最新一筆集保日期對應的行；若本週已存在非 NULL 的 `small_holder_chg_12w` 則 early return 不重複寫入（對應 Weekly data available and not yet persisted 與 Current week already persisted）
- [x] 2.3 在 `RetailSentimentStep.run()` 的 `except` 區塊只 log error、設 `ctx.retail_sentiment = {}`，不 raise（對應 FinLab data fetch fails 與 RetailSentimentStep 定位為輔助步驟決策）
- [x] 2.4 在 `ETF/pipeline/orchestrator.py` 的 `_build_steps()` 輔助步驟清單中，於 `SyncAdlStep()` 後插入 `RetailSentimentStep()`

## 3. Pipeline 驗證

- [ ] 3.1 本機執行 `uv run python -c "from ETF.pipeline.steps.retail_sentiment_step import RetailSentimentStep; ..."` 確認四個欄位值寫入 DB，且重複執行時 early return 不覆蓋
- [ ] 3.2 確認 `market_breadth_daily` 最新行中 `small_holder_chg_12w` 非 NULL、`is_retail_accelerating` 為正確 bool 值

## 4. 後端 Server Action：Retail sentiment Server Action

- [x] 4.1 [P] 建立 `src/app/actions/getRetailSentiment.ts`：匯出 `RetailSentiment` interface（含 `date`、`small_holder_chg_12w`、`small_holder_z_score`、`is_retail_accelerating`、`is_odd_lot_fragmented`）與 `getRetailSentiment()` Server Action，查詢 `market_breadth_daily` 中 `small_holder_chg_12w` IS NOT NULL 的最新行（對應 Retail sentiment Server Action）
- [x] 4.2 [P] 確認 `getRetailSentiment()` 在無資料時回傳 null，不拋出例外（對應 No sentiment rows exist）

## 5. 前端元件：Retail sentiment card on breadth page

- [x] 5.1 [P] 建立 `src/components/features/RetailSentimentCard.tsx` 實作 Retail sentiment card on breadth page：接受 `RetailSentiment | null` props，依 `is_retail_accelerating` × `is_odd_lot_fragmented` 四種組合對應 label（資金擴散/矛盾期/籌碼尾端/中性）與顏色（rose-600/amber-500/emerald-600/gray-500），顯示 12 週變化值、Z-score、日期、兩個 boolean chip（對應 signal color mapping Example）
- [x] 5.2 [P] `RetailSentimentCard` 接收 null 時不渲染任何 DOM（對應 No sentiment data yet）
- [x] 5.3 修改 `src/app/investment/breadth/page.tsx` 實作 Market breadth page：以 `Promise.all` 並行呼叫 `getRetailSentiment()` 與現有資料查詢，將結果傳入 `<RetailSentimentCard data={sentiment} />`，使用前端使用 Server Action 而非 API Route 的決策（對應 Market breadth page MODIFIED Requirement）

## 6. 整合驗證

- [x] 6.1 執行 `yarn build`，確認 TypeScript 無錯誤
- [x] 6.2 在瀏覽器開啟 `/investment/breadth`，確認 `RetailSentimentCard` 正常渲染，label 與顏色符合 signal color mapping 規格
- [x] 6.3 暫時將 `getRetailSentiment()` 回傳 null，確認卡片消失、無 error boundary 觸發
