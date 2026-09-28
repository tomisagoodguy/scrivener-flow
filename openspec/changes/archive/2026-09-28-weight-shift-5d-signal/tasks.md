## 1. weight_shift_5d 訊號偵測邏輯

- [x] 1.1 實作 weight_shift_5d 訊號偵測：在 `ETF/pipeline/steps/signal_detect_step.py` 新增私有方法 `_weight_shift_5d(conn, target_date)`：對 `00981A`、`00991A` 兩支 ETF，查詢 `etf_holdings_snapshot` 取得該 etf_code 最近 6 個相異 `data_date`（index 0 = 今日、index 5 = 5 個交易日前），對兩個日期皆存在的每個 stock_code 計算 `delta = weight[index=0] - weight[index=5]`。驗證：新增單元測試 `ETF/tests/test_signal_detect_step.py::test_weight_shift_5d_computes_delta`，餵入 mock 的 6 筆 holdings snapshot（同一 stock_code/etf_code，跨 6 個相異日期），斷言回傳的 `delta` 數值正確。
- [x] 1.2 實作 weight_shift_5d 訊號分級：`abs(delta) < 1.0` 不產生訊號；`1.0 <= abs(delta) < 3.0` 產生 `strength=1`；`abs(delta) >= 3.0` 產生 `strength=2`。驗證：新增 `ETF/tests/test_signal_detect_step.py::test_weight_shift_5d_threshold_boundaries`，以 spec `advanced-signal-detection` 中「Threshold boundaries」表格的 5 組數值（4.0→4.5 無訊號、4.0→5.0 strength=1、4.0→6.9 strength=1、4.0→7.0 strength=2、8.5→5.0 strength=2）為輸入，逐一斷言輸出的 `strength` 或「無訊號」結果。
- [x] 1.3 實作歷史資料不足時靜默跳過該 `(etf_code, stock_code)` pair、不拋例外：`etf_holdings_snapshot` 該 etf_code 相異 `data_date` 少於 6 個，或某 stock_code 只在今日快照出現、未出現在 5 個交易日前快照（反之亦然）。驗證：新增 `ETF/tests/test_signal_detect_step.py::test_weight_shift_5d_skips_insufficient_history`，餵入只有 3 個相異日期的 mock，斷言結果列表為空且不拋例外。
- [x] 1.4 產生的訊號物件包含 `signal_type='weight_shift_5d'`、`etf_codes=[etf_code]`、`metadata` 含 `stock_name`、`weight_5d_ago`、`weight_now`、`delta_pp`（正負號代表加碼/減碼方向），並在 `_detect_all()` 中呼叫 `_weight_shift_5d()` 加入既有 `signals` 清單一併寫入 `etf_signals`。驗證：`ETF/tests/test_signal_detect_step.py::test_weight_shift_5d_signal_shape` 斷言輸出 dict 的欄位完整且 `metadata.delta_pp` 帶正確正負號。

## 2. 前端訊號顯示

- [x] 2.1 實作 Frontend weight_shift_5d 顯示：在 `src/components/features/investment/SignalBadge.tsx` 的 `TYPE_LABELS` 新增 `weight_shift_5d` 對應的繁體中文標籤（與現有 `multi_fund_consensus`/`single_fund_overweight`/`cross_product_accumulation`/`cross_etf_same_day_buy` 四個標籤風格一致、且文字互不重複）。驗證：手動於瀏覽器 render `<SignalBadge type="weight_shift_5d" strength={1} />`，確認顯示的標籤文字非 `weight_shift_5d` 原始字串，且與其他既有標籤文字不同。

## 3. 整合驗證

- [x] 3.1 執行 `uv run pytest ETF/tests/test_signal_detect_step.py -v`，確認新增的 4 個測試（`test_weight_shift_5d_computes_delta`、`test_weight_shift_5d_threshold_boundaries`、`test_weight_shift_5d_skips_insufficient_history`、`test_weight_shift_5d_signal_shape`）全數通過，且既有 `signal_detect_step` 相關測試（若有）不受影響。驗證：測試指令輸出全部 PASSED，exit code 0。
- [x] 3.2 執行 `uv run python ETF/main.py --dry-run` 確認 pipeline 完整跑過 `SignalDetectStep` 不拋例外（dry-run 模式下 `should_skip` 為 True，僅驗證 import 與載入無語法錯誤）。驗證：指令執行完畢 exit code 0，log 中無 `SignalDetectStep failed` 錯誤訊息。
