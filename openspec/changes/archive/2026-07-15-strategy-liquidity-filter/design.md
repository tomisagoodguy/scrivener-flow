## Context

`StrategySignalStep`（ETF/pipeline/steps/strategy_signal_step.py）每日執行 9 支策略，將入選訊號 upsert 至 `strategy_signals`（30 天保留期）。訊號僅含 `strategy_id, date, stock_id, score, is_selected, conditions`，無任何流動性資訊。共用快取 `StrategyDataCache.amt` 已提供 FinLab `price:成交金額` DataFrame（index=日期、columns=股票代號），策略層可能已觸發下載，複用不增加配額成本。前端 `/investment/strategy` 經 `getStrategySignals` Server Action（`unstable_cache`, revalidate 3600）讀取。

限制：本 step 為輔助步驟，`except` 禁止 `raise`；FinLab 配額耗盡時既有 quota-guard 模式必須維持。

## Goals / Non-Goals

**Goals**
- 每筆新寫入的策略訊號帶 20 日均成交值與低流動性旗標
- 前端策略頁對低流動性標的顯示警示，不改變列表結構與排序

**Non-Goals**
- 不剔除低流動性股票（下游 consensus、SyncBareKStep 消費行為不變）
- 不回補歷史訊號（歷史列兩欄為 NULL）
- 不動 fund_momentum / etf_signals / fund_signals
- 門檻不做 UI 可調

## Decisions

1. **標記而非過濾**：`liquidity_flag` 只標記，`is_selected` 判定不變。替代方案「直接剔除」被否決——會靜默改變 consensus 命中數與 BareK 同步批次，影響面不可控。
2. **門檻常數**：`LIQUIDITY_TURNOVER_THRESHOLD = 50_000_000`（台幣 5 千萬/日）置於 strategy_signal_step.py 頂部，與 `STALENESS_THRESHOLD_DAYS` 同區。替代方案「環境變數」被否決——無多環境差異需求，常數最可稽核。
3. **計算方式**：`cache.amt.rolling(20).mean()` 取最後一列；對每支入選股取值。NaN（上市未滿 20 日或無資料）→ `avg_turnover = NULL`、`liquidity_flag = NULL`（「未知」不等於「低流動性」，不可誤標 true/false）。
4. **獨立純函式**：抽 module-level `compute_liquidity(amt, stock_ids, threshold) -> dict[str, tuple[float | None, bool | None]]` 於 strategy_signal_step.py，供單元測試直接以合成 DataFrame 驗證，不需 mock FinLab。
5. **Fail-soft**：流動性計算整段包 try/except——失敗時 log error、所有訊號兩欄寫 NULL，訊號本體照常寫入。流動性是附加資訊，不得因它中斷訊號線（對齊輔助步驟原則與 finlab-quota-guard）。
6. **DB 欄位**：`avg_turnover NUMERIC`、`liquidity_flag BOOLEAN`，皆 nullable、無 default；upsert 的 `ON CONFLICT DO UPDATE` 同步更新兩欄。
7. **前端快取升版**：`unstable_cache` key `strategy-signals-v2` → `strategy-signals-v3`（欄位變更需手動失效，沿用專案既有 invalidation 慣例）。
8. **Badge 配色**：低流動性警示用 amber（`text-amber-600 dark:text-amber-400` + `bg-amber-500/10`）。紅/綠保留給台股漲跌慣例，警示不得占用。

## Implementation Contract

**Python（pipeline）**
- `compute_liquidity(amt, stock_ids, threshold)`：輸入成交金額 DataFrame 與股票清單，輸出每股 `(avg_turnover, liquidity_flag)`；20 日窗不足或缺欄回 `(None, None)`。驗證：`ETF/tests/test_strategy_signal_step.py` 新增測試——低於門檻標 true、高於標 false、資料不足回 None、空 DataFrame 不拋例外。
- `StrategySignalStep.execute`：all_rows 每筆 dict 增加 `avg_turnover`、`liquidity_flag` 兩鍵（計算失敗時為 None）。驗證：既有測試通過 + 新測試斷言 rows 含新鍵。
- `sql_storage.upsert_strategy_signals`：INSERT 欄位清單與 ON CONFLICT UPDATE 增兩欄；records 缺鍵時容錯（`.get()` 預設 None）不得 KeyError。驗證：`uv run pytest ETF/` 綠燈。

**DB**
- Migration `supabase/migrations/20260715120000_add_liquidity_to_strategy_signals.sql`：`ALTER TABLE strategy_signals ADD COLUMN avg_turnover NUMERIC, ADD COLUMN liquidity_flag BOOLEAN;` 冪等寫法（`IF NOT EXISTS`）。

**前端**
- `getStrategySignals`：兩處 select 增列 `avg_turnover, liquidity_flag`；`SignalRow` 與 `StrategyStock`（src/lib/investment/strategyUtils.ts）增 `avg_turnover: number | null` 與 `liquidity_flag: boolean | null`；組裝 `StrategyStock` 時帶入。cache key 升 v3。驗證：`yarn test --testPathPatterns getStrategySignals` 綠燈、`yarn tsc --noEmit` 無錯。
- `/investment/strategy` 頁：`liquidity_flag === true` 的股票列顯示「低流動」amber badge（tooltip 或括注顯示日均成交值，億元格式）；`null` 與 `false` 不顯示任何標記。驗證：頁面實跑確認 badge 只出現在 flag=true 的列。
