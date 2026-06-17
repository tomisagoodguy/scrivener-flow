## Why

`/investment/strategy` 頁面原本應顯示 9 支現役量化策略，目前只剩 `fund_momentum` 一支。根因有兩層：前端只取「全表單一最新日期」做過濾，而 9 支現役策略在 CI 已連續多日靜默無寫入、停在舊日期，導致它們被最新日期過濾掉而消失。這直接讓策略選股中心對使用者失去價值。

## What Changes

- **前端聚合改為 per-strategy 最新日期**：`getStrategySignals()` 改為在「近 N 個交易日視窗」內，對每個 `strategy_id` 取各自最新有 `is_selected` 的日期聚合呈現，取代目前全表單一 `max(date)` 過濾。不同更新節奏的策略不再互相覆蓋。
- **消除每日重複的策略執行以節省 FinLab 配額**：目前 daily CI 同時跑 `main.py` 的 `StrategySignalStep` 與殿後的 `run_strategies.py`，兩者都各自重建巨型 `StrategyDataCache`（`etl:broker_transactions` 與 `inventory` 皆為全市場巨型資料集），一天下載兩次導致配額耗盡、後者抓不到資料而整批回空。改為一天只執行一次完整策略運算。
- **失敗不再靜默**：策略執行步驟在「所有策略皆無輸出」時，發出明確警告並透過既有 LINE 警報通知管理員，取代目前 upsert no-op 後綠燈通過的行為，使資料停更可被及早發現。

## Capabilities

### New Capabilities

- `strategy-signal-freshness`: 規範策略選股頁如何穩健呈現所有現役策略（per-strategy 最新日期聚合），以及每日策略訊號寫入的單一執行者政策與「全空輸出」告警。

### Modified Capabilities

- `finlab-quota-guard`: 現行規範為配額不足時 `StrategySignalStep` 靜默 skip；新增「當所有策略皆無輸出（含配額耗盡情境）時必須發出可觀測告警」的要求，使靜默資料停更不再無聲。

## Impact

- Affected specs: `strategy-signal-freshness`（新增）、`finlab-quota-guard`（修改）
- Affected code:
  - Modified: src/app/actions/getStrategySignals.ts、.github/workflows/etf_daily.yml、ETF/pipeline/steps/strategy_signal_step.py
  - New: openspec/specs/strategy-signal-freshness/spec.md
  - Removed: （無檔案刪除；`run_strategies.py` 保留供手動補跑，僅自每日 CI 移除其重複呼叫）
