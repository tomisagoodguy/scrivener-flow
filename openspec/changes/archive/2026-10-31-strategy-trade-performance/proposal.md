## Why

`/investment/strategy` 只顯示每個策略「今天選了哪些股票」，使用者無從得知選進之後這些股票是賺是賠、哪些產業表現好、被換出的股票之後是否還繼續漲（「漲者恆漲」是否成立）。分析面板的 1/5/20 日漲幅是從今天往回算的近期漲幅，與換股日無關；`strategy_signals` 也只保留 30 天且不記錄進出價格，月頻換股的持股超過一個月就查不到選進日。

## What Changes

- 新增資料表 `strategy_trades`：每一筆代表「某策略持有某股票的一段期間」，記錄訊號日、進場日（訊號日隔一個交易日）、進場價（進場日開盤價）、出場日與出場價（同樣是出場訊號隔日開盤）、最新收盤，以及以還原股價計算的持有報酬與換出後報酬。
- 新增 pipeline 輔助步驟：從各策略 FinLab `get_positions()` 的完整歷史推導持有期間（不依賴只留 30 天的 `strategy_signals`），每天重算近 365 天的紀錄並 upsert；上線當天即可回補過去一年。
- 策略頁（策略視角）新增「換股後表現」面板：
  - 可切換「全部」或單一策略。
  - 摘要：持有中檔數、平均持有報酬、勝率（正報酬檔數 ÷ 持有中檔數）。
  - 持有中個股分成「正報酬」「負報酬」兩欄，台股慣例紅色＝正、綠色＝負，依報酬排序。
  - 產業彙總：每個產業的檔數、平均報酬、正／負報酬檔數。
  - 近 60 天換出的股票：持有報酬與換出後至今的報酬。
- 尚未到進場日（訊號日即今天）的股票標示「待進場」，不計入報酬統計。

## Non-Goals

- 不改動 `strategy_signals` 的結構與 30 天清理規則。
- 不做策略層級的資金曲線、夏普值等完整回測報表（FinLab `sim()` 已有）。
- 不計手續費、證交稅與滑價；報酬為單純價格報酬（含除權息還原）。
- 不改動共選面板、主檢視圖表與策略卡片現有內容。

## Capabilities

### New Capabilities

- `strategy-trade-tracking`: 由 pipeline 推導並保存各策略的持有期間、進出場價與報酬（資料層）。
- `strategy-trade-performance-panel`: 策略頁「換股後表現」面板（摘要、正負報酬個股、產業彙總、近期換出）。

### Modified Capabilities

(none)

## Impact

- 受影響 specs：新增 strategy-trade-tracking、strategy-trade-performance-panel。
- 資料庫：新增 migration supabase/migrations/20261031120000_add_strategy_trades.sql（新表 + RLS 公開讀取），不修改既有表。
- Pipeline：
  - ETF/processors/strategy_trades.py（新檔：持有期間推導與報酬計算的純函式）
  - ETF/pipeline/steps/strategy_trade_step.py（新檔：輔助步驟）
  - ETF/pipeline/steps/strategy_signal_step.py（把各策略 positions 存入 context）
  - ETF/pipeline/context.py（新增 `strategy_positions` 欄位）
  - ETF/pipeline/orchestrator.py（註冊新步驟）
  - ETF/database/sql_storage.py（新增 `upsert_strategy_trades` 與過期刪除）
- 前端：
  - src/app/actions/getStrategyTradePerformance.ts（新 Server Action）
  - src/lib/investment/strategyTradeUtils.ts（新檔：彙總純函式與型別）
  - src/components/features/strategy/ 下新增面板元件
  - src/app/investment/strategy/page.tsx（策略視角加入面板）
- 測試：ETF/tests 新增推導與步驟測試；src 新增彙總函式與面板測試。
