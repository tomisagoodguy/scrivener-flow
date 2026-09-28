## Why

`ETF/optimizer/ga/evaluate.py` 的 `_ic_decay_ok()` 只做「下限」過濾：剔除近 2 年月頻 rank-IC 均值低於門檻的個體，確保入選策略有基本的橫斷面選股能力。但 GA 每代演化數百個體、數十代迭代，本質上是在大量條件組合中做窮舉搜尋，統計上必然偶爾撞出「回測績效好到不合理」的組合——這類組合通常源於條件邏輯本身帶有未來資訊（例如條件用到未 shift 的欄位、或條件與標的池產生非預期的前視關聯），而不是真的找到有效訊號。目前沒有任何機制攔截這類異常結果，只能等人工事後覺得可疑才去追查，容易讓洩漏的策略被誤判為「GA 找到的黃金組合」寫入 `optimizer_results/`。

## What Changes

- 新增 `compute_perfect_foresight_ceiling()`：在 `_ic_decay_ok()` 既有的近 2 年月頻重新平衡日期基礎上，對同一個 `all_cond` 候選池（而非全市場），計算「完美相對強弱」天花板——即每個重新平衡日改選候選池中實際表現最好的 `avg_n_stock` 檔（而非模型實際選出的組合），逐期複利得出理論年化報酬上限。
- 新增 `_leak_canary_ok()`：比較個體實際回測的 `annualReturn`（來自 `get_metrics_compat()`）是否超過上述理論天花板（含安全邊際），超過即判定為疑似資料洩漏。
- 在 `_compute()` 中，於 `Score(metrics, config).evaluate()` 之前插入 `_leak_canary_ok()` 檢查；未通過則該個體適應度直接記為 `0.0`（與 `_ic_decay_ok()` 失敗時行為一致），並在 `config.get('print_enabled')` 時印出警告（含天花板值與實際值），方便使用者在終端機觀察是否頻繁觸發。
- 新增設定項 `leak_canary_enabled`（預設 `True`）與 `leak_canary_margin`（預設 `1.0`，即天花板本身不留寬容），皆走既有的 `config: dict` 傳遞模式，與 `ic_decay_threshold` 同一風格，不新增設定檔案。
- 天花板計算失敗（如資料不足、`close_df` 未傳入）時直接放行，不誤殺個體——與 `_ic_decay_ok()` 現有的容錯風格一致。

## Non-Goals

- 不引入外部套件或改變 DEAP/GA 主流程（`run_ga.py`、`setup.py`）。
- 不對 `condition_pool.py` 或 `conditions.yaml` 既有條件定義做任何邏輯稽核，只在評估階段做結果面攔截。
- 不處理「完美市場擇時」（大盤方向）天花板，只做「完美相對強弱」（候選池內選股）天花板，因為 GA 優化的是選股條件而非擇時。
- 不回溯稽核 `optimizer_results/` 內既有歷史結果，只影響此後新跑的 GA。

## Capabilities

### New Capabilities

- `ga-leak-canary-detection`: GA 優化器評估階段的資料洩漏偵測機制——計算候選池內「完美相對強弱」理論報酬天花板，個體實際回測績效超過天花板即判定為疑似洩漏並剔除。

### Modified Capabilities

(none)

## Impact

- Affected specs: `ga-leak-canary-detection`（新增）
- Affected code:
  - Modified: `ETF/optimizer/ga/evaluate.py`
  - New: `ETF/tests/optimizer/test_leak_canary.py`（若 `ETF/tests/optimizer/` 不存在則一併建立此目錄）
