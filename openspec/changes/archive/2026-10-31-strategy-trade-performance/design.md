## Context

每日 pipeline 的 `StrategySignalStep` 對 `ALL_STRATEGIES` 逐一呼叫 `get_positions(cache)`，取得 FinLab 布林持股 DataFrame（index＝訊號日、columns＝股票代號），但只取最後一列寫入 `strategy_signals`（`strategy_id, date, stock_id, score, is_selected, conditions`）。`sql_storage.py` 每天刪除 30 天前的 `strategy_signals`、260 天前的 `stock_prices_daily`。多數策略對齊月營收揭露日每月換股一次，持股常抱超過 30 天。

前端 `/investment/strategy` 是 Server Component，`getStrategyAnalytics` 的報酬欄位來自 `sector_strength_stocks.ret_1d/5d/20d`（從今天往回算）。投資模組資料表慣例：`ENABLE ROW LEVEL SECURITY` + `"公開讀取"` SELECT policy（`USING (true)`），寫入走 pipeline 的 `SUPABASE_DB_URL`（不受 RLS）。大量寫入一律用 `sql_storage._bulk_upsert`（execute_values）。輔助步驟的 `except` 禁止 `raise`。

## Goals / Non-Goals

**Goals:**

- 保存每個策略每段持有期間的進出場日、進出場價與報酬，上線即可回補近一年。
- 策略頁讓使用者看出：持有中哪些正報酬、哪些負報酬、哪些產業好或壞、換出的股票之後漲還是跌。

**Non-Goals:**

- 不改 `strategy_signals` 結構或清理規則。
- 不計交易成本；不做資金曲線或風險指標。
- 不在共選圖表、主檢視圖表或策略卡片上加報酬資訊。

## Decisions

### 持有期間從 FinLab positions 完整歷史推導

新步驟使用 `get_positions()` 回傳的整張 DataFrame，而不是比對 `strategy_signals` 的每日快照。對每檔股票，連續為真的列構成一段持有期間：首個為真的列日期＝進場訊號日；之後第一個為假的列日期＝出場訊號日；至最後一列仍為真則持有中。這讓上線當天即可回補過去一年，也不受 30 天清理影響。替代方案「每日比對前後兩天名單」被否決：歷史無法回補，且 pipeline 漏跑一天就會漏記進出。

`StrategySignalStep` 已算出 positions，為避免重算，它把每個策略的 DataFrame 存入 `ctx.strategy_positions: Dict[str, pd.DataFrame]`，新步驟只讀 context。index 無法轉成日期的策略記 warning 並跳過。

### 進出場價採訊號日隔一個交易日的開盤價

進場日＝進場訊號日之後的第一個交易日，進場價＝該日開盤價；出場同理。交易日以 FinLab `price:開盤價` 的 index 為準。訊號日之後尚無交易日（例如訊號日就是今天）時，進場日與進場價為 null，前端顯示「待進場」且不計入統計。這與使用者指定的「換股日隔天開盤」一致，也接近實際能成交的價格。

### 報酬以還原股價計算，原始價格另存顯示

報酬使用還原價避免除權息造成假跌：還原開盤價＝`price:開盤價 × etl:adj_close ÷ price:收盤價`（同日同股），還原收盤價＝`etl:adj_close`。
- 持有報酬：已出場＝出場還原開盤 ÷ 進場還原開盤 − 1；持有中＝最新還原收盤 ÷ 進場還原開盤 − 1。
- 換出後報酬（僅已出場）＝最新還原收盤 ÷ 出場還原開盤 − 1。
- 報酬存為小數（0.07＝7%）。`entry_price`、`exit_price`、`latest_close` 存原始價格供顯示。

### 每日重算近 365 天並 upsert

步驟每天重算「出場訊號日在近 365 天內」或「仍持有中」的所有持有期間（以出場判斷，長期持有後近期才出場者不會漏掉），以 `(strategy_id, stock_id, entry_signal_date)` 為唯一鍵 upsert（重跑冪等），報酬與最新收盤每日更新。每個推導成功的策略，再刪除其視窗內本次未推導出的舊列（策略邏輯改寫歷史後殘留的列）；推導失敗的策略不清理。最後刪除 `exit_date` 早於 365 天前的列。資料量：首次回補實測 1051 列（9 個策略；2026-10-31 以 `SELECT count(*) FROM strategy_trades` 確認，原估計「數千列」）。日頻策略換手較頻繁會更多，但仍在 `_bulk_upsert` 可處理範圍。

### 前端讀預算好的報酬，彙總在純函式中完成

Server Action `getStrategyTradePerformance()` 讀 `strategy_trades`（持有中＋`exit_date` 在近 60 天內），join `stock_basic_info` 取名稱與產業，以 `unstable_cache`（revalidate 3600，key `strategy-trade-performance-v1`）快取。摘要、正負分欄、產業彙總寫在 `src/lib/investment/strategyTradeUtils.ts` 的純函式，前端不做任何價格計算。

### 面板放在策略視角、共選面板之後

「換股後表現」面板只在策略視角（未設 `view`）出現，位於共選面板之後、策略卡片之前；策略切換用 client 端 state（不進 URL），避免與共選參數 `cmin/cview/cwin` 互相干擾。若 parked change `strategy-consensus-chart-view` 先上線，`cview=chart` 時此面板與策略卡片一起隱藏。

## Implementation Contract

**Behavior**

- 每日 pipeline 執行後，`strategy_trades` 含所有現役策略近 365 天的持有期間；同一天重跑結果相同。
- 策略頁顯示「換股後表現」面板：
  - 切換鈕：「全部」＋每個策略的簡稱（`shortStrategyLabel`）。
  - 摘要：持有中 N 檔、平均持有報酬、勝率；近 60 天換出 M 檔、換出後平均報酬。
  - 正報酬欄（報酬 > 0，遞減排序）與負報酬欄（報酬 ≤ 0，遞增排序），每列：名稱、代號、產業、持有報酬、持有天數（進場日到最新資料日的日曆天數）；「全部」模式每列另標策略簡稱。
  - 產業彙總：產業、檔數、平均報酬、正報酬檔數、負報酬檔數，依平均報酬遞減排序；無產業者歸「未分類」。
  - 近期換出：名稱、代號、出場日、持有報酬、換出後報酬，依出場日遞減排序。
  - 報酬色彩：正＝`text-rose-600 dark:text-rose-400`，負＝`text-emerald-600 dark:text-emerald-400`，0 為灰色。
  - 「待進場」列另成一小段，不計入摘要、正負欄與產業彙總。

**Interface / data shape**

- 表 `strategy_trades`：`id BIGSERIAL PK`、`strategy_id TEXT NOT NULL`、`stock_id TEXT NOT NULL`、`entry_signal_date DATE NOT NULL`、`entry_date DATE`、`entry_price FLOAT`、`exit_signal_date DATE`、`exit_date DATE`、`exit_price FLOAT`、`latest_date DATE`、`latest_close FLOAT`、`holding_return FLOAT`、`post_exit_return FLOAT`、`updated_at TIMESTAMPTZ DEFAULT NOW()`；`UNIQUE (strategy_id, stock_id, entry_signal_date)`；索引 `(strategy_id, exit_date)`；RLS 啟用 + `"公開讀取"` SELECT policy。
- `ETF/processors/strategy_trades.py`：
  - `derive_trade_episodes(positions: pd.DataFrame, since: date) -> list[TradeEpisode]`（`strategy_id` 由呼叫端補上）。
  - `price_trade_episodes(episodes, open_: pd.DataFrame, close: pd.DataFrame, adj_close: pd.DataFrame) -> list[dict]`，輸出可直接 upsert 的 row dict。
- `PipelineContext.strategy_positions: Dict[str, pd.DataFrame]`（預設空 dict）。
- `SqlStorage.upsert_strategy_trades(rows: list[dict]) -> None`、`SqlStorage.delete_expired_strategy_trades(days: int = 365) -> int`。
- TS 型別（`strategyTradeUtils.ts`）：`StrategyTrade { strategyId; stockId; name; industry; entrySignalDate; entryDate: string | null; entryPrice: number | null; exitDate: string | null; exitPrice: number | null; latestDate: string | null; holdingReturn: number | null; postExitReturn: number | null }`；純函式 `summarizeTrades(trades)`、`splitByReturn(trades)`、`groupByIndustry(trades)`。

**Failure modes**

- 單一策略 positions 為空、index 非日期或價格缺漏：記 warning，跳過該策略或該筆，其餘照常。
- 整個步驟例外：log error 後繼續，不 `raise`（輔助步驟）。
- 進場價或最新價缺漏：該筆 `holding_return` 為 null，前端顯示「—」並不計入統計。
- Server Action 查詢失敗：回傳空陣列並 `console.error`，面板顯示「尚無換股後表現資料」，不影響頁面其他部分。

**Acceptance criteria**

- `uv run pytest ETF/tests/test_strategy_trades.py ETF/tests/test_strategy_trade_step.py` 綠燈，涵蓋：連續區段切分、持有中、隔日開盤取價、待進場、除權息還原、365 天範圍、步驟例外不中斷。
- `uv run ruff check` 改動的 Python 檔無錯誤。
- `yarn test --testPathPatterns strategyTradeUtils` 與 `--testPathPatterns StrategyTradePerformance` 綠燈。
- `yarn tsc --noEmit` 無新錯誤；`yarn eslint` 改動檔無新錯誤。
- 本地以 `FORCE_RUN=true` 跑一次 pipeline（或只跑新步驟的腳本），`SELECT count(*), count(*) FILTER (WHERE exit_date IS NULL) FROM strategy_trades` 有資料；開 `/investment/strategy` 看到面板，抽一檔用 FinLab 開盤價人工核對進場價。

**Scope boundaries**

- In scope：上列 migration、pipeline 檔案、Server Action、彙總函式、面板元件、策略頁整合與測試。
- Out of scope：`strategy_signals` 結構與清理、策略邏輯本身、共選面板、主檢視圖表、手續費／稅模擬。

## Risks / Trade-offs

- [FinLab positions 的歷史可能因策略邏輯修改而改寫] → 每日重算 365 天會讓過去紀錄跟著現行邏輯更新，代表「現行策略回推」而非「當時實際訊號」。面板以說明文字註明。
- [月頻策略的 positions 只在揭露日有列] → 區段切分以列為單位，月頻與日頻皆適用；月中停更期間持有中的報酬仍以最新收盤每日更新。
- [migration 需手動套用] → 本 change 只新增表（無 DROP），實作時請使用者在 Supabase SQL Editor 執行或核准套用，套用後再跑 pipeline。
- [FinLab 用量] → 新步驟只多取 `price:開盤價`（`etl:adj_close`、收盤價共用 `StrategyDataCache`），額外用量有限（估計值，可看 `finlab-quota-guard` 的每日用量紀錄確認）。
