## Why

`StrategySignalStep` 的「連續停更告警」（`finlab-quota-guard` spec）用固定 3 個日曆天判斷策略訊號是否停更。但系列 9 支策略（`super8888`/`super888`/`capital_layer`/`broker_ranked`/`low_vol_alpha`/`low_vol_cap`/`htf_gvi`/`trend_template`/`fundamental_momentum`）的 `get_positions()` 最終都會 `reindex()` 到月營收揭露日（`rev.index_str_to_date().index`），而非每日交易日。月營收於每月約 10–13 日全數揭露完畢後，下一批揭露要等到下個月約 10–13 日才出現，這段近 3 週的空窗期是設計上的正常現象。目前門檻導致每個月都會誤發「策略訊號已停更 N 天」LINE 告警，稀釋告警訊號的可信度，管理員可能因此忽略真正的故障（如 FinLab 配額耗盡或程式例外）。

## What Changes

- `StrategySignalStep._check_signal_staleness()` 判斷停更時，改為以「距最新一次月營收揭露日（`monthly_revenue:當月營收` 資料的最新 index）的天數」為門檻基準，而非「距 server 當日的日曆天數」。若 `strategy_signals` 最新成功寫入日期已等於或晚於最新月營收揭露日，代表訊號已跟上該期揭露，即使距今超過 3 天也不算停更。
- 僅當 `strategy_signals` 最新成功寫入日期**早於**最新月營收揭露日，且兩者差距超過門檻天數（維持 `STALENESS_THRESHOLD_DAYS = 3`）時，才視為真正停更並發出告警——涵蓋「揭露日已出現新一期但策略仍未寫入」的真實故障場景（配額耗盡、例外、程式錯誤）。
- 取得最新月營收揭露日失敗（如 FinLab 例外）時，回退為現行「距 server 當日」邏輯，維持既有保護，不因新邏輯本身失敗而永久壓抑告警。

## Non-Goals

- 不變更「當次全空」告警（`all_rows` 為空時的既有邏輯）與 FinLab 配額耗盡攔截邏輯，僅調整「連續停更升級告警」的門檻判斷基準。
- 不變更 9 支策略本身的 `reindex()` 對齊月營收揭露日的設計，此為既有量化邏輯，不在本次變更範圍。
- 不新增獨立的月營收揭露日快取機制；沿用既有 FinLab `data.get()` 呼叫模式即可。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `finlab-quota-guard`：「策略訊號連續停更升級告警」需求的判斷基準從「距 server 當日的日曆天數」改為「距最新月營收揭露日的天數」，避免月頻策略的正常空窗期被誤判為停更。

## Impact

- Affected specs: `finlab-quota-guard`
- Affected code:
  - Modified: `ETF/pipeline/steps/strategy_signal_step.py`
  - Modified: `ETF/tests/test_strategy_signal_step.py`
