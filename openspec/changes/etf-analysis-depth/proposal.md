## Why

系統有 ETF 持股動向（etf_diff_logs）、法人買賣超（FinLab）、策略選股訊號（strategy_signals），但三者完全獨立運作。使用者必須跨三個頁面手動對照才能得出「ETF 加碼 + 投信同步買 = 強訊號」這類有行動價值的洞察，且沒有任何工具能告訴他「現在策略選出來的股票有多集中（擁擠）」或「這支股票 ETF 持有了多久」。

## What Changes

- 新增 `ResonanceSignalStep`（輔助步驟）：當 ETF 有 BUY/IN 事件時，自動交叉比對投信/外資近 10 日買賣超，計算共鳴分數，存入 `etf_resonance_signals`
- 新增 `HoldingDurationStep`（輔助步驟）：從 `etf_diff_logs` 歷史事件推算每支持股的進場日期與持倉天數，存入 `etf_holding_periods`（月末執行）
- 新增前端「策略擁擠度」功能：在現有 `/investment/strategy` 頁面加入策略選股重疊矩陣，從現有 `strategy_signals` 即時計算，無需新增 DB 表
- 擴充現有頁面：`/investment/[etf]` 持股列表加入「持倉天數」欄位；`etf_resonance_signals` 訊號整合進現有 `/investment/consensus` 或以 badge 顯示在持股列表

## Capabilities

### New Capabilities

- `etf-resonance-signal`: ETF 加碼事件 × 法人（投信/外資）同向買進的共鳴偵測，量化兩者一致程度
- `etf-holding-duration`: 從歷史 diff logs 推算各持股進場日與持倉天數，識別長期持股與即將換手候選
- `etf-strategy-crowding`: 5 大策略選股的兩兩重疊度矩陣（Jaccard similarity），前端熱力圖呈現，識別高度擁擠的「眾人搶同一批股」風險

### Modified Capabilities

（無既有 spec 需變更）

## Impact

- **新增 Pipeline 步驟**：`ETF/pipeline/steps/resonance_signal_step.py`、`ETF/pipeline/steps/holding_duration_step.py`
- **新增 DB 表（Supabase migration）**：`etf_resonance_signals`、`etf_holding_periods`
- **修改 Orchestrator**：插入兩個新輔助步驟
- **新增 Server Action**：`src/app/actions/getResonanceSignals.ts`、`src/app/actions/getHoldingDuration.ts`、`src/app/actions/getStrategyCrowding.ts`
- **修改前端**：`/investment/[etf]` 加持倉天數欄、`/investment/strategy` 加策略重疊矩陣
- **FinLab 依賴**：`it_buy`（投信買賣超）、`foreign_buy`（外資買賣超）（`FinlabClient` 已有映射）
