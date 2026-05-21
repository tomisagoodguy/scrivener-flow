# Spec: FinLab Quota Guard

## Purpose

當 FinLab API 配額接近耗盡時，`StrategySignalStep` 應優雅 skip 而非拋出例外讓 Pipeline 崩潰。

---

## ADDED Requirements

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

---

### Requirement: 配額耗盡事件記入 Pipeline Context

`StrategySignalStep` 攔截到配額耗盡時，SHALL 在 `ctx.validation_warnings` 中加入「FinLab 配額耗盡，策略訊號本日 skip」，讓 `NotifyStep` 一併通知使用者。

#### Scenario: 配額耗盡後 NotifyStep 收到通知

- **WHEN** `StrategySignalStep` 捕捉到配額錯誤
- **THEN** `ctx.validation_warnings` 含有 FinLab 配額警告字串，LINE 通知底部顯示該警告
