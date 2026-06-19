# Spec: FinLab Quota Guard

## Purpose

當 FinLab API 配額接近耗盡時，`StrategySignalStep` 應優雅 skip 而非拋出例外讓 Pipeline 崩潰。

---

## Requirements

### Requirement: StrategySignalStep 攔截 FinLab 配額錯誤

`StrategySignalStep.run()` SHALL 以 `try/except` 包裹整個策略執行流程，攔截 FinLab `DataError`（含配額耗盡場景），步驟 skip 並記錄警告，**不 raise**。

#### Scenario: FinLab 配額耗盡

- **WHEN** `data.get()` 拋出 `finlab.exceptions.DataError`（因配額超過）
- **THEN** `StrategySignalStep` 記錄 warning log「FinLab quota exceeded, skipping strategy signals」，不寫入 `strategy_signals`，不 raise，Pipeline 繼續執行後續步驟

#### Scenario: 配額充足，策略正常執行

- **WHEN** `data.get()` 成功回傳資料
- **THEN** 策略訊號正常計算並寫入 `strategy_signals`，行為與現有一致

#### Scenario: 非配額原因的 FinLab 錯誤

- **WHEN** `data.get()` 拋出非 `DataError` 的其他 Exception
- **THEN** 維持現有輔助步驟行為：log error，不 raise（因 `StrategySignalStep` 為輔助步驟）


<!-- @trace
source: etf-data-validation
updated: 2026-05-21
code:
  - ETF/pipeline/steps/data_validation_step.py
  - ETF/pipeline/steps/notify_step.py
  - EOCS/0521代辦.md
  - ETF/pipeline/orchestrator.py
  - ETF/pipeline/context.py
  - ETF/pipeline/steps/strategy_signal_step.py
tests:
  - ETF/tests/test_data_validation_step.py
-->

---
### Requirement: 配額耗盡事件記入 Pipeline Context

`StrategySignalStep` SHALL 在以下兩種情況各自於 `ctx.validation_warnings` 加入一筆繁體中文告警，讓既有 LINE 通知管道一併通知管理員：

1. 攔截到 FinLab 配額耗盡（`DataError`）時，加入「FinLab 配額耗盡，策略訊號本日 skip」。
2. 步驟跑完所有現役策略後 `all_rows` 為空（即所有策略皆未產生任何 `is_selected` 列，不論成因為配額、例外或全數無選股）時，加入一筆指明「策略訊號全空」與日期的告警。

個別單一策略回空或拋例外（其他策略仍有輸出）SHALL 維持只 `logger.error`/`logger.warning` 並 `continue`，不升級為 `ctx.validation_warnings` 告警。

#### Scenario: 配額耗盡後 NotifyStep 收到通知

- **WHEN** `StrategySignalStep` 捕捉到 FinLab 配額錯誤
- **THEN** `ctx.validation_warnings` 含有 FinLab 配額警告字串，LINE 通知底部顯示該警告

#### Scenario: 所有策略皆無輸出時升級為告警

- **WHEN** 步驟執行完畢且 `all_rows` 為空
- **THEN** `ctx.validation_warnings` 新增一筆指明策略訊號全空與當日日期的告警字串，步驟不 raise，Pipeline 繼續執行

#### Scenario: 部分策略有輸出時不告警

- **WHEN** 至少一支現役策略產生 `is_selected` 列（`all_rows` 非空），即使其他策略當日回空
- **THEN** `ctx.validation_warnings` 不因「全空」原因新增告警

<!-- @trace
source: restore-strategy-signals
updated: 2026-06-19
code:
  - src/app/actions/getStrategySignals.ts
  - ETF/pipeline/context.py
  - jest.config.js
  - next-env.d.ts
  - src/components/features/investment/DailyFlowPanel.tsx
  - src/lib/investment/etfSectorActivityUtils.ts
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - ETF/database/__pycache__/connection.cpython-313.pyc
  - ETF/pipeline/steps/flow_compute_step.py
  - ETF/pipeline/steps/sector_strength_step.py
  - ETF/pipeline/steps/strategy_signal_step.py
  - .github/workflows/etf_daily.yml
tests:
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - ETF/tests/test_sector_fund_flow.py
  - src/__tests__/hooks/useHoldingsFilter.test.ts
  - ETF/tests/test_strategy_signal_step.py
  - ETF/test_strategy_simple.py
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
-->