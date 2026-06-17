## MODIFIED Requirements

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
