## 1. Schema Migration

- [x] 1.1 以 `is_disposal` 欄位擴充 `etf_holdings_snapshot`：新增 Supabase migration 檔案 `supabase/migrations/<timestamp>_add_disposal_flag.sql`，加入 `is_disposal BOOLEAN NOT NULL DEFAULT FALSE` 欄位（schema migration for is_disposal column）

## 2. Pipeline 步驟實作

- [x] 2.1 新增輔助步驟 `DisposalDetectStep`：建立 `ETF/pipeline/steps/disposal_detect_step.py`，繼承 `BaseStep`；處置資訊查詢方式為從 FinLab `disposal_information` 取得資料，篩選 `分時交易` 非 NaN 的記錄，找出 `ctx.date_str` 落在處置期間的股票代號集合（daily disposal stock detection）
- [x] 2.2 在同一步驟中，對 `etf_holdings_snapshot` 執行 UPDATE：持股代號在集合內者設 `is_disposal = TRUE`，其餘設 `is_disposal = FALSE`；使用 SQLAlchemy `sql_storage`（daily disposal stock detection）
- [x] 2.3 DisposalDetectStep 的 `except` 只 `logger.error()`，不 `raise`，確保步驟失敗不中斷 pipeline（disposaldetectstep failure does not interrupt pipeline）
- [x] 2.4 在 `ETF/pipeline/orchestrator.py` 將 `DisposalDetectStep` 插入 `SaveSnapshotStep` 之後、`WeightHistoryStep` 之前（step ordering in pipeline orchestrator）

## 3. TypeScript 型別更新

- [x] 3.1 在 `src/types/index.ts` 的 `EtfHoldingSnapshot` interface 新增 `is_disposal: boolean` 欄位（typescript type includes is_disposal field）

## 4. 前端 ETF 持股列表

- [x] 4.1 在 `src/app/investment/[etf]/page.tsx` 的持股列表 row 中，當 `holding.is_disposal === true` 時，於股票名稱旁顯示紅色「處置中」badge（disposal badge in ETF holdings list）

## 5. 前端個股詳情頁

- [x] 5.1 在 `src/app/investment/stock/[code]/page.tsx` 的頁面頂部，當最新持股快照的 `is_disposal === true` 時，顯示紅色警示 banner「此股票目前處於分盤交易（處置）狀態」（disposal warning on stock detail page）
