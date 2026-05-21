## 1. DB Schema（Supabase Migration）

- [ ] 1.1 新增 `supabase/migrations/<timestamp>_add_etf_resonance_signals.sql`（建立 `etf_resonance_signals` 表 + unique index）
- [ ] 1.2 新增 `supabase/migrations/<timestamp>_add_etf_holding_periods.sql`（建立 `etf_holding_periods` 表 + unique index）

## 2. DiffComputeStep 擴充

- [ ] 2.1 在 `ETF/pipeline/steps/diff_compute_step.py` 執行完 diff 後，將當日 BUY/IN 事件的 stock_code 彙整寫入 `ctx.new_buy_codes: set[str]`
- [ ] 2.2 在 `ETF/pipeline/context.py` 新增 `new_buy_codes: set[str]` 欄位（預設空 set）

## 3. ResonanceSignalStep 實作

- [ ] 3.1 建立 `ETF/pipeline/steps/resonance_signal_step.py`，繼承 `BaseStep`（輔助步驟）
- [ ] 3.2 若 `ctx.new_buy_codes` 為空集合則 skip（log + return）
- [ ] 3.3 從 FinLab 取 `it_buy`、`foreign_buy` 近 10 個交易日資料，僅查 `ctx.new_buy_codes` 中的代碼
- [ ] 3.4 計算每個代碼的 10 日累計淨買超，依規則判斷 `resonance_type`
- [ ] 3.5 UPSERT 寫入 `etf_resonance_signals`，失敗不 raise

## 4. HoldingDurationStep 實作

- [ ] 4.1 建立 `ETF/pipeline/steps/holding_duration_step.py`，繼承 `BaseStep`（輔助步驟）
- [ ] 4.2 實作月末判斷邏輯（利用 `ctx.date_str`）
- [ ] 4.3 從 `etf_diff_logs` 依 `(etf_code, stock_code)` 分組查詢 IN/OUT 歷史事件，計算 entry_date
- [ ] 4.4 判斷 is_active（最後一筆事件為 IN/BUY 則 active，OUT/SELL 則 inactive）
- [ ] 4.5 計算 `holding_days = (today - entry_date).days`（is_active = TRUE）或 `(exit_date - entry_date).days`
- [ ] 4.6 UPSERT 寫入 `etf_holding_periods`，失敗不 raise

## 5. Orchestrator 整合

- [ ] 5.1 在 `ETF/pipeline/orchestrator.py` 的 `SignalDetectStep` 之後插入 `ResonanceSignalStep`
- [ ] 5.2 在 `PositionSummaryStep` 之後插入 `HoldingDurationStep`

## 6. Server Actions

- [ ] 6.1 建立 `src/app/actions/getResonanceSignals.ts`：`getResonanceSignals(etfCode, date)` → 讀取 `etf_resonance_signals`
- [ ] 6.2 建立 `src/app/actions/getHoldingDuration.ts`：`getHoldingDuration(etfCode)` → 讀取 `etf_holding_periods` is_active = TRUE
- [ ] 6.3 建立 `src/app/actions/getStrategyCrowding.ts`：`getStrategyCrowding(date?)` → 從 `strategy_signals` 即時計算 Jaccard 矩陣

## 7. 前端：ETF 持股列表擴充

- [ ] 7.1 在 `/investment/[etf]` 的持股列表加入「持倉天數」欄位（顯示 holding_days，超過 365 天標不同顏色）
- [ ] 7.2 在持股列表對 `resonance_type != 'none'` 的持股加入共鳴 badge（💎 雙向 / 📈 投信 / 🌏 外資）

## 8. 前端：策略頁擴充

- [ ] 8.1 在 `/investment/strategy` 頁面加入「策略重疊矩陣」5×5 熱力圖（純 Tailwind 實作，不引入新圖表庫）
- [ ] 8.2 在熱力圖下方加入「高擁擠股票」清單（被 3 策略以上選中者）

## 9. 驗證

- [ ] 9.1 本地 `--dry-run` 確認 `ResonanceSignalStep` 在 log 中出現，ctx.new_buy_codes 有值
- [ ] 9.2 月末本地手動執行 `HoldingDurationStep`，確認 `etf_holding_periods` 資料正確
- [ ] 9.3 前端頁面確認 badge、持倉天數欄、熱力圖、高擁擠清單均正常顯示
- [ ] 9.4 合併 main，觀察次日 CI log
