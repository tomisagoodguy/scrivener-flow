## 1. 實作：策略訊號連續停更升級告警改用月營收揭露日基準

- [x] 1.1 在 `ETF/pipeline/steps/strategy_signal_step.py` 新增私有方法取得 `monthly_revenue:當月營收`（`data.get('monthly_revenue:當月營收')`）最新 index 日期，作為「最新揭露日」；取得失敗時捕捉例外並回傳 `None`。驗證：新增單元測試 mock `finlab.data.get` 拋例外，斷言該方法回傳 `None` 且不 raise。
- [x] 1.2 改寫 `_check_signal_staleness()`：當最新揭露日可取得時，若 `strategy_signals` 系列策略最新成功寫入日期已等於或晚於最新揭露日，不加入停更告警（即使距 server 當日超過 3 天）；若早於最新揭露日且天數差距超過 `STALENESS_THRESHOLD_DAYS`，加入告警字串（訊息載明「距最新揭露日已停更 N 天」與最後成功寫入日期）。驗證：`ETF/tests/test_strategy_signal_step.py` 新增測試涵蓋「策略訊號連續停更升級告警」情境 1（月營收揭露空窗期不誤判停更，對應 spec Scenario: 月營收揭露空窗期不誤判停更）與情境 2（新一期揭露已出現但訊號未跟上，判定為真實停更，對應 spec Scenario: 新一期揭露已出現但訊號未跟上，判定為真實停更）。
- [x] 1.3 當取得最新揭露日過程拋出例外時，`_check_signal_staleness()` 回退為現行「距 server 當日超過 3 個日曆天」判斷邏輯。驗證：新增測試 mock 最新揭露日取得失敗，斷言仍執行既有距今日判斷（對應 spec Scenario: 取得最新揭露日失敗時回退為距今日曆天判斷），並確認既有「停更在門檻內不告警」「本次正常寫入不告警」兩個場景測試（`ETF/tests/test_strategy_signal_step.py` 既有測試）在新邏輯下仍通過。
- [x] 1.4 執行 `uv run pytest ETF/tests/test_strategy_signal_step.py -v` 全數通過，並執行 `uv run ruff check ETF/pipeline/steps/strategy_signal_step.py --fix && uv run ruff format ETF/pipeline/steps/strategy_signal_step.py` 確認 lint 與格式通過。驗證：終端機輸出顯示 pytest 全綠、ruff 無錯誤。
