## Context

`OverlapComputeStep` 目前在每次 Pipeline 執行後，從 `etf_holdings_snapshot` 聚合各股票的靜態持倉資訊（`etf_count`、`total_weight`、`etf_list`），並 upsert 至 `etf_stock_overlap`。`etf_diff_logs` 表已持久化每次快照比對的逐 ETF 異動紀錄（IN / OUT / BUY / SELL / TRIM / CLOSE），但這些動態訊號目前只在前端個別 ETF 頁面（`/investment/[etf]`）展示，未被聚合至共識層。

前端 `/investment/consensus` 頁（`src/app/investment/consensus/page.tsx`）僅顯示靜態欄位，無法告知使用者「近期是否有多支 ETF 同時加碼」。

## Goals / Non-Goals

**Goals:**
- 在 `etf_stock_overlap` 加入 `consensus_buy_count` 與 `consensus_sell_count` 兩個整數欄，代表「最近 7 個自然日內，有幾支 ETF 以 diff_weight ≥ 0.05pp 加碼 / 減碼此股票」
- 透過 DB migration 讓欄位有預設值 `0`，既有資料不需回填
- `OverlapComputeStep` 在同一 transaction 內完成靜態持倉 upsert 後，計算並填入方向性計數
- 前端 `consensus/page.tsx` 呈現兩個計數，以台股色彩慣例（rose＝加碼、emerald＝減碼）標示

**Non-Goals:**
- 不修改 `WEIGHT_CHANGE_THRESHOLD`（0.10pp）；新增常數 `CONSENSUS_WEIGHT_THRESHOLD = 0.05` 獨立存在
- 不建立新 Pipeline 步驟，共識計算在現有 `OverlapComputeStep.execute()` 中串接
- 不回填歷史 `consensus_*` 欄位（舊日期 row 維持 `0`，前端只查最新日期）
- 不影響其他前端頁面

## Decisions

### 計算時間窗口：固定 7 個自然日

採用 `data_date - INTERVAL '7 days'` 的滾動窗口，而非「最近 N 個交易日」。原因：
- 交易日判斷需額外查詢或維護台股日曆，增加複雜度
- Pocket.tw 來源的 ETF 公告可能跨 3–5 天才更新，7 個自然日足以涵蓋
- 窗口固定後查詢 SQL 最簡單，不需任何額外狀態

### 閾值：0.05pp（獨立常數 `CONSENSUS_WEIGHT_THRESHOLD`）

選擇比現有 `is_significant`（0.10pp）更細的 0.05pp，理由：
- 共識計算是「有幾支 ETF 一起動」，單支 ETF 各自異動可以比 is_significant 更小仍有意義
- 0.05pp 過濾掉 TRIM 等噪音，同時保留 BUY/SELL 的中等異動
- 維持獨立常數而非重用 `WEIGHT_CHANGE_THRESHOLD`，以便日後各自調整

### 計算位置：`OverlapComputeStep` 內串接而非獨立步驟

兩者共用同一 `target_date`，在同一 step 內順序執行可避免日期不一致問題。若拆成獨立步驟，需透過 `PipelineContext` 傳遞 `target_date`，增加耦合複雜度。由於計算量小（一次 SQL 聚合），串接不影響 Pipeline 效能。

### DB 欄位加在 `etf_stock_overlap` 而非另建表

共識方向是 overlap 的附加屬性，語義上屬於同一表。另建 JOIN 表會增加前端查詢複雜度（目前 `consensus/page.tsx` 是單表 select）。

### 前端：僅顯示非零計數

`consensus_buy_count = 0` 且 `consensus_sell_count = 0` 時不渲染 badge，保持表格簡潔。非零時以 `Xb`（buy）/ `Xs`（sell）帶圓角 badge 顯示。

## Risks / Trade-offs

- [Risk] 7 天窗口內同一 ETF 可能出現多筆同向異動（例如連續 3 天各加碼一次）→ SQL 使用 `COUNT(DISTINCT etf_code)` 而非 `COUNT(*)`，確保每支 ETF 最多計 1 次
- [Risk] `etf_diff_logs` 資料不完整（Pipeline 失敗日無 log）→ `COUNT(DISTINCT etf_code)` 為下界估計，仍合理，不需特殊處理
- [Risk] migration 加欄後舊程式 upsert SQL 少了新欄 → 新欄 `DEFAULT 0` 確保不衝突；新的 upsert SQL 在同一 step 內覆蓋

## Migration Plan

1. 執行 `20260509000000_add_consensus_counts_to_overlap.sql`（ALTER TABLE + UPDATE 0 rows）
2. 部署 `OverlapComputeStep` 更新（新增方向計數 SQL）
3. 部署前端 `consensus/page.tsx` 更新（新欄顯示）
4. 下次 Pipeline 執行後驗證 DB 欄位非零

Rollback：移除前端新欄顯示不影響功能；`OverlapComputeStep` 若回退，DB 欄位維持 `0` 不影響現有查詢。
