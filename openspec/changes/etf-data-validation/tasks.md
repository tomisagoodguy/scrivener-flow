## 1. Pipeline Context 擴充

- [ ] 1.1 在 `ETF/pipeline/context.py` 新增 `validation_warnings: list[str]` 欄位（預設空 list）

## 2. DataValidationStep 實作

- [ ] 2.1 建立 `ETF/pipeline/steps/data_validation_step.py`，繼承 `BaseStep`
- [ ] 2.2 實作比重總和驗證（< 50% 或 > 150% → raise ValueError）
- [ ] 2.3 實作持股筆數驗證（= 0 → raise ValueError）
- [ ] 2.4 實作個股價格異常偵測（price ≤ 0 或 > 10000 → log warning + 記入 ctx.validation_warnings）
- [ ] 2.5 整個 step 加外層 try/except，程式 bug 不 raise，改記 ctx.validation_warnings

## 3. Orchestrator 整合

- [ ] 3.1 在 `ETF/pipeline/orchestrator.py` 的步驟清單中，於 `PriceAttachStep` 之後插入 `DataValidationStep`

## 4. FinLab Quota Guard

- [ ] 4.1 在 `ETF/pipeline/steps/strategy_signal_step.py` 的 `run()` 加 `try/except finlab.exceptions.DataError`，捕捉時 log warning + 記入 `ctx.validation_warnings`，不 raise

## 5. NotifyStep 整合

- [ ] 5.1 在 `ETF/pipeline/steps/notify_step.py` 讀取 `ctx.validation_warnings`，若非空則在 LINE 通知底部附上警告摘要（每條一行，前綴 `⚠️`）

## 6. 測試

- [ ] 6.1 建立 `ETF/tests/test_data_validation_step.py`
- [ ] 6.2 測試比重正常場景（總和 98%）→ 不 raise
- [ ] 6.3 測試比重異常場景（總和 12%）→ 拋出 ValueError
- [ ] 6.4 測試筆數歸零場景 → 拋出 ValueError
- [ ] 6.5 測試價格異常場景 → 記入 ctx.validation_warnings，不 raise
- [ ] 6.6 測試 DataValidationStep 內部 KeyError → 繼續執行不 raise

## 7. 驗證與部署

- [ ] 7.1 本地 `uv run python ETF/main.py --dry-run` 確認 DataValidationStep 在 log 中出現
- [ ] 7.2 合併至 main，觀察次日 CI log 確認比重閾值無誤報
