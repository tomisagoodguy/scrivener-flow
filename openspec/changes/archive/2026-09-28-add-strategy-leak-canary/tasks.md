## 1. Perfect-foresight ceiling computation

- [x] 1.1 實作需求「Perfect-foresight ceiling computation」：在 `ETF/optimizer/ga/evaluate.py` 新增模組層級純函式 `compute_perfect_foresight_ceiling(position, close, avg_n_stock, period=20)`，重用 `_ic_decay_ok()` 既有的近 2 年月頻重新平衡日期計算邏輯（對應設計決策「天花板定義：候選池內「完美相對強弱」，而非全市場或固定閾值」），對每個重新平衡日在 `position` 為 True 的候選池內取未來 `period` 交易日報酬前 `round(avg_n_stock)` 高者取平均，逐期複利年化後回傳；資料不足時回傳 `None`。以 `uv run pytest ETF/tests/optimizer/test_leak_canary.py::test_compute_perfect_foresight_ceiling_normal` 驗證：合成 2 期資料可正確複利出天花板數值。
- [x] 1.2 為 `compute_perfect_foresight_ceiling` 的「資料不足回傳 None（fail-open）」行為撰寫測試：涵蓋 `close=None`、重新平衡日期 < 6 期、候選池某期無合格股票三種情境。以 `uv run pytest ETF/tests/optimizer/test_leak_canary.py::test_compute_perfect_foresight_ceiling_insufficient_data` 驗證三種情境皆回傳 `None`。

## 2. Leak canary gate in GA fitness evaluation

- [x] 2.1 實作需求「Leak canary gate in GA fitness evaluation」：在 `ETF/optimizer/ga/evaluate.py` 新增模組層級純函式 `_leak_canary_ok(position, config, actual_annual_return, avg_n_stock)`，讀取 `config.get('leak_canary_enabled', True)` 與 `config.get('leak_canary_margin', 1.0)`，呼叫 `compute_perfect_foresight_ceiling`，`actual_annual_return > ceiling * leak_canary_margin` 時回傳 `False`，其餘情況（含 `leak_canary_enabled=False`、天花板為 `None`）回傳 `True`（對應設計決策「Fail-open 容錯風格」）。以 `uv run pytest ETF/tests/optimizer/test_leak_canary.py::test_leak_canary_ok_gate` 驗證超過天花板回傳 `False`、未超過回傳 `True`、`leak_canary_enabled=False` 一律回傳 `True`。
- [x] 2.2 在 `_compute()` 內、取得 `metrics` 之後、呼叫 `Score(metrics, config).evaluate()` 之前，插入 `_leak_canary_ok(...)` 呼叫（對應設計決策「檢查時機：插入 `_compute()`，在 `Score().evaluate()` 之前」）；回傳 `False` 時 `_compute()` 直接回傳 `0.0`，與既有 `_ic_decay_ok()` 失敗時行為一致。`config.get('print_enabled')` 為真且判定洩漏時印出含實際年化報酬與天花板數值的警告訊息。以 `uv run pytest ETF/tests/optimizer/test_leak_canary.py::test_compute_disqualifies_on_leak` 驗證：合成一組「模型分數等於未來報酬」的極端資料，`_compute()` 回傳 `0.0`。
- [x] 2.3 確保新增邏輯不影響既有通過個體的既有行為：以 `uv run pytest ETF/tests/optimizer/test_leak_canary.py::test_compute_unaffected_when_within_ceiling` 驗證合成一組實際年化報酬明顯低於天花板的個體，`_compute()` 回傳值與停用 `leak_canary_enabled` 時相同（即洩漏檢查未改變原本給分結果）。

## 3. Validation

- [x] 3.1 `uv run pytest ETF/tests/optimizer/` 全數通過（含既有測試與本次新增的 `test_leak_canary.py`），確認本次修改未破壞 GA 評估器既有回歸測試。
- [x] 3.2 `uv run ruff check --fix ETF/optimizer/ga/evaluate.py ETF/tests/optimizer/test_leak_canary.py && uv run ruff format ETF/optimizer/ga/evaluate.py ETF/tests/optimizer/test_leak_canary.py` 無錯誤、無需再次修正。

## 4. Code review fixes（獨立 code-reviewer agent 審查後修正）

- [x] 4.1 修正 C1（KeyError 崩潰）：`compute_perfect_foresight_ceiling` 的候選池索引 `close` 前改為 `eligible.intersection(close.columns)`，避免候選池含 `close` 沒有的欄位時拋出未防護的 `KeyError` 導致整個 GA run 崩潰；同時為 `avg_n_stock` 加上 `np.isfinite` 有限數檢查，避免 `round(NaN)` 拋 `ValueError`。以 `uv run pytest ETF/tests/optimizer/test_leak_canary.py::test_compute_perfect_foresight_ceiling_ignores_columns_missing_from_close` 與 `::test_compute_perfect_foresight_ceiling_avg_n_stock_not_finite` 驗證，並以 mutation check（暫時還原成 bug 版本、確認測試會失敗、再還原修正）確認兩個測試都真的鎖定對應行為。
- [x] 4.2 修正 C2（margin 對負天花板語意反轉）：`_leak_canary_ok` 改為天花板 `<= 0` 時直接放行（不再讓 `leak_canary_margin` 作用在負值天花板上，避免 margin 越大反而門檻越嚴格、進而導致整個世代適應度靜默全歸零）。以 `uv run pytest ETF/tests/optimizer/test_leak_canary.py::test_leak_canary_ok_negative_ceiling_fails_open_regardless_of_margin` 驗證，並以 mutation check 確認測試會抓到回歸。
- [x] 4.3 對應設計決策「天花板時間視窗：全歷史，而非 `_ic_decay_ok()` 的近 2 年（實作階段修正）」修正 C3（比較視窗不對齊）：`compute_perfect_foresight_ceiling` 改用 `position` 全歷史月頻重新平衡日，不再套用 `_ic_decay_ok()` 的近 2 年篩選，使天花板與 `actual_annual_return`（`sim()` 全歷史 CAGR）比較基準的時間視窗一致。以 `uv run pytest ETF/tests/optimizer/test_leak_canary.py` 全數通過驗證既有測試不受影響（原兩期合成資料本就在 6 個月內，2 年篩選對它是 no-op）。
- [x] 4.4 修正 H1(c)（負分數股票誤判入選）：候選池判定由 `position.loc[date].fillna(0).astype(bool)` 改為 `position.loc[date] > 0`，正確排除負分數（放空訊號）與零分數，NaN 自動視為未入選。以 `uv run pytest ETF/tests/optimizer/test_leak_canary.py::test_compute_perfect_foresight_ceiling_excludes_negative_scores` 驗證，並以 mutation check 確認測試會抓到回歸；同步在 design.md／spec.md 誠實記錄 `Scoring_System` 模式下候選池是聯集而非交集、`sim()` 權重正規化與本函式等權假設不一致的已知限制（不在本次修正範圍）。
- [x] 4.5 修正 M1（`_compute()` 內 metrics 存取不一致）：取得 `annualReturn`/`avgNStock` 改用 `metrics.get("profitability", {})` 而非硬索引 `metrics["profitability"]`，避免 `min_hold_stock` 設為 `0` 時觸發未防護的 `KeyError`。以既有 `test_compute_disqualifies_on_leak`／`test_compute_unaffected_when_within_ceiling` 通過驗證未改變既有行為。
- [x] 4.6 修正 L2（候選池退化保護）：`compute_perfect_foresight_ceiling` 逐期加入 `n_top / len(eligible) > 0.5` 時跳過該期的保護，避免候選池不夠大時天花板退化成池均值而誤殺合法的加權/風控策略；同步修正 design.md Risks 中「`min_hold_stock` 門檻可攔截候選池過小」的錯誤緩解描述。
- [x] 4.7 `uv run pytest ETF/tests/optimizer/` 全數通過（13/13，含 4 個新增回歸測試）、`uv run ruff check` 與 `ruff format` 皆乾淨；同步更新 design.md／spec.md 記錄本輪修正，避免文件與程式碼不同步。
