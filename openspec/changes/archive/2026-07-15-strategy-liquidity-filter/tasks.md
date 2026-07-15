## 1. 資料庫 Migration

- [x] 1.1 新增 `supabase/migrations/20260715120000_add_liquidity_to_strategy_signals.sql`：以冪等寫法（`ADD COLUMN IF NOT EXISTS`）為 `strategy_signals` 加 `avg_turnover NUMERIC` 與 `liquidity_flag BOOLEAN`（皆 nullable、無 default）。完成判準：SQL 檔存在且重複執行不報錯（語法冪等）。

## 2. Pipeline 端（Python）

- [x] 2.1 在 `ETF/pipeline/steps/strategy_signal_step.py` 頂部新增常數 `LIQUIDITY_TURNOVER_THRESHOLD = 50_000_000`，並實作 module-level 純函式 `compute_liquidity(amt, stock_ids, threshold)`：回傳 `dict[str, tuple[float | None, bool | None]]`；20 日 rolling mean 取最後一列，NaN 或缺欄回 `(None, None)`，低於門檻回 `(值, True)`、高於回 `(值, False)`。不得觸碰 FinLab（僅接收 DataFrame 參數）。（對應 Requirement: Liquidity enrichment on strategy signals）
- [x] 2.2 在 `StrategySignalStep.execute` 收齊 `all_rows` 後呼叫 `compute_liquidity(cache.amt, 全部入選股票, LIQUIDITY_TURNOVER_THRESHOLD)`，為每筆 row 補 `avg_turnover` / `liquidity_flag` 鍵；整段包 try/except，失敗時 `logger.error` 並讓所有 row 兩鍵為 None，訊號寫入照常進行（不 raise，維持輔助步驟原則）。
- [x] 2.3 修改 `ETF/database/sql_storage.py` 的 `upsert_strategy_signals`：INSERT 欄位與 VALUES 加 `avg_turnover, liquidity_flag`，`ON CONFLICT DO UPDATE` 同步更新兩欄；用 `record.get()` 容錯缺鍵（預設 None），寫入前對 avg_turnover 做 `float()` 轉型防 Decimal 問題。（對應 Requirement: Signal persistence includes liquidity columns）
- [x] 2.4 在 `ETF/tests/` 對應測試檔新增 `compute_liquidity` 單元測試：低於門檻→True、高於→False、不足 20 日→(None, None)、股票不在 DataFrame→(None, None)、空 DataFrame 不拋例外；並斷言 execute 產出的 rows 含兩個新鍵。完成判準：`uv run pytest ETF/ -k strategy_signal` 綠燈且既有測試不壞。

## 3. 前端（Next.js）

- [x] 3.1 [P] 修改 `src/lib/investment/strategyUtils.ts`：`StrategyStock` 介面新增 `avg_turnover: number | null` 與 `liquidity_flag: boolean | null`。
- [x] 3.2 修改 `src/app/actions/getStrategySignals.ts`：`SignalRow` 介面與兩處 `.select()` 增列 `avg_turnover, liquidity_flag`；組裝 `StrategyStock` 時帶入（缺值以 `?? null` 正規化）；`unstable_cache` key 由 `strategy-signals-v2` 升為 `strategy-signals-v3` 並更新註解。
- [x] 3.3 修改 `src/app/investment/strategy/page.tsx`：`liquidity_flag === true` 的股票列顯示 amber badge「低流動」（`text-amber-600 dark:text-amber-400` + `bg-amber-500/10`），旁註日均成交值（億元、1 位小數）；`null` / `false` 完全不渲染任何新元素。禁止使用 rose/emerald（保留給漲跌）。（對應 Requirement: Strategy page shows low-liquidity warning）
- [x] 3.4 更新 `getStrategySignals` 既有測試（`src/__tests__/actions/` 與 `src/app/actions/__tests__/` 兩處）：mock 資料補新欄位，新增「flag=true 正確傳遞至 StrategyStock」斷言。完成判準：`yarn test --testPathPatterns getStrategySignals` 綠燈。

## 4. 驗證

- [x] 4.1 全面驗證：`yarn tsc --noEmit` 無型別錯誤、`yarn test --testPathPatterns getStrategySignals` 與 `uv run pytest ETF/ -k strategy_signal` 綠燈、`uv run ruff check ETF/` 乾淨；本地 `uv run python ETF/main.py --dry-run` 確認 StrategySignalStep 不因新程式碼中斷（dry-run 會 skip 該步，改以單測覆蓋為主）。
