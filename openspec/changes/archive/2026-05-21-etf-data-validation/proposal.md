## Why

ETF Pipeline 在爬取持股後直接存入 DB，缺少任何正確性驗證。若爬蟲解析錯誤（HTML 格式改版、Excel 欄位偏移、回傳空資料），髒資料會靜默寫入並被前端顯示，直到使用者人工發現才察覺。

## What Changes

- 新增 `DataValidationStep`，插入 `DiffComputeStep` 之前（`SaveSnapshotStep` 之前），驗證爬取結果的正確性
- 驗證失敗時：關鍵錯誤（比重嚴重異常、筆數歸零）→ 中斷 Pipeline 並發 LINE 警報；警告（比重稍偏、價格異常個股）→ log warning 並繼續
- 新增 FinLab 配額 Guard：`StrategySignalStep` 執行前檢查配額是否接近耗盡，不足時 skip 並 log warning（不中斷 Pipeline）
- 驗證結果寫入 `ctx`，供 `NotifyStep` 在 LINE 通知中附上「本次資料品質」摘要

## Capabilities

### New Capabilities

- `etf-data-validation-step`: Pipeline 資料驗證步驟，涵蓋持股比重總和、筆數合理性、價格異常偵測三項規則
- `finlab-quota-guard`: FinLab API 配額使用量監控，配額不足時優雅降級而非拋出例外

### Modified Capabilities

- `etf-registry-sync-validation`（`ETF/scripts/validate_registry_sync.py`）：無 spec 行為變更，僅實作細節調整，不列入

## Impact

- **新增檔案**：`ETF/pipeline/steps/data_validation_step.py`
- **修改 Orchestrator**：`ETF/pipeline/orchestrator.py`（在 step 3 前插入 DataValidationStep）
- **修改 Context**：`ETF/pipeline/context.py`（新增 `validation_warnings: list[str]` 欄位）
- **修改 NotifyStep**：`ETF/pipeline/steps/notify_step.py`（LINE 通知附上品質摘要）
- **修改 StrategySignalStep**：`ETF/pipeline/steps/strategy_signal_step.py`（加 quota guard）
- **新增測試**：`ETF/tests/test_data_validation_step.py`
