## Context

`ETF/optimizer/ga/evaluate.py::_compute()` 是 GA 每個個體的適應度計算入口，流程為：組合條件 → `_ic_decay_ok()` 過濾 → `sim()` 回測 → 交易數/持股數門檻過濾 → `Score().evaluate()` 給分。`_ic_decay_ok()` 已經建立了「近 2 年月頻重新平衡日期」的計算基礎（`monthly = position.resample('ME').last()`、`cutoff = ... - DateOffset(years=2)`），本次新增的洩漏偵測沿用同一種月頻重新平衡技巧，但**不**沿用其 2 年篩選（原因見下方「實作階段修正」）。

`config['close_df']` 已經是 `_ic_decay_ok()` 的既有輸入（全市場歷史收盤價面板），洩漏偵測沿用同一份資料，不需新增資料來源。

> **實作階段修正紀錄**：本 change 完成初版實作後，經獨立 code-reviewer agent 審查，發現 3 個 Critical、2 個 High 等級的正確性問題，皆已修正並補測試（含 mutation check 驗證每個修正對應的測試會抓到對應的 bug）。詳見下方各決策段落與 Risks 的更新內容。

## Goals / Non-Goals

**Goals:**

- 在既有 `_ic_decay_ok()` 的重新平衡日期與候選池基礎上，計算「完美相對強弱」理論年化報酬天花板。
- 個體實際回測年化報酬超過天花板時，視為疑似資料洩漏，適應度歸零並可選擇性印出警告。
- 天花板計算失敗或資料不足時直接放行（fail-open），不影響現有 GA 行為。

**Non-Goals:**

- 不做「完美市場擇時」（大盤方向）天花板 — GA 優化的是候選池內選股條件，不是進出場時機，市場擇時天花板與此不是同一個對照組。
- 不引入外部套件、不改變 DEAP 主流程（`run_ga.py`／`setup.py`）。
- 不稽核 `conditions.yaml` 既有條件定義的邏輯正確性，只在評估結果面做事後攔截。
- 不回溯稽核 `optimizer_results/` 內既有歷史結果。

## Decisions

### 天花板定義：候選池內「完美相對強弱」，而非全市場或固定閾值

三個候選方案：

1. **全市場完美擇時天花板**：每個重新平衡日永遠選中當期報酬最高的股票（不限候選池）。
   - 缺點：GA 優化的是「候選池篩選條件」的品質，讓天花板脫離候選池會使天花板過高（全市場永遠有極端飆股），對候選池較窄的個體（例如條件嚴格、候選池只剩 5-10 檔）幾乎不可能觸發警示，偵測力弱。
2. **固定 Sharpe / 年化報酬閾值**（例如年化 > 100% 直接判定洩漏）：
   - 缺點：閾值武斷，且無法適應不同資料期間（多頭年份天花板本來就該比較高）；`LESSONS.md`／stock-lab 案例已證實固定閾值容易產生誤判或漏判。
3.（採用）**候選池內完美相對強弱**：在 `all_cond`（個體實際的候選股票池，逐日布林遮罩）限定範圍內，每個重新平衡日改選候選池當期表現最好的 `avg_n_stock` 檔（而非模型實際選出的組合），逐期複利得到理論年化報酬上限。

採用方案 3，因為它與被評估的個體使用**完全相同的候選池與持股數**，是公平對照組——天花板會隨候選池寬窄自然縮放，不需要外部假設或武斷常數，也最貼近 stock-lab `leak_canary.py`「完美相對強弱」的精神（同一個資訊集合下的理論上限，而非跨資訊集合比較）。

**已知限制（`Scoring_System` 模式，`ETF/optimizer/run.py` 的 production 預設）**：這個「完全相同」只在 `Compound_Conditions`（布林交集、`sim()` 等權持有）下嚴格成立。`Scoring_System` 下 `combine_selected_conditions()` 是條件加總，候選池判定（見下方 truthy 修正）實質是**聯集**（任一條件貢獻正分數即入選）而非交集；且 `sim()` 對非布林 position 會正規化成**權重**持有（見 finlab `backtest/helpers.py::normalize_position_weights`），並非本函式假設的「候選池內等權持有前 N 檔」。因此在 `Scoring_System` 模式下，本天花板只是**較寬鬆的參考基準**，一個把權重集中在高分股的合法策略有可能超過「候選池等權前 N 檔」均值而被誤判——偵測力明顯弱於 `Compound_Conditions`。完整解法（依 `sim()` 實際權重分配計算加權天花板）超出本次 change 範圍，此處誠實記錄為已知限制，而非宣稱「兩種模式等價」。

### 天花板時間視窗：全歷史，而非 `_ic_decay_ok()` 的近 2 年（實作階段修正）

初版實作誤用了 `_ic_decay_ok()` 的「近 2 年月頻」篩選來限定天花板的重新平衡日期。但 `_compute()` 拿來比較的 `actual_annual_return` 是 `sim()` **全歷史** CAGR（`run.py::get_position()` 呼叫 `sim(position, resample='M', ...)` 沒有指定 start/end），把「全歷史績效」拿去和「近 2 年天花板」比較是視窗不對齊：近 2 年若逢空頭，天花板會偏低甚至為負，誤殺績效主要來自更早年份的合法策略；近 2 年若逢強多頭，天花板膨脹，反而讓全歷史均勻放大型的真洩漏被放行。

修正為：`compute_perfect_foresight_ceiling` 使用 `position.resample('ME').last()` 的**全部**月頻重新平衡日（不套用 2 年 cutoff），與 `actual_annual_return` 的比較基準（全歷史 CAGR）時間範圍一致。`_ic_decay_ok()` 本身維持不變（它的 2 年窗是為了限定計算量與強調近期穩健性，屬於不同的設計目的，不受此修正影響）。

### 檢查時機：插入 `_compute()`，在 `Score().evaluate()` 之前

沿用 `_ic_decay_ok()` 同一個插入點模式（`_compute()` 內、`sim()` 之後、給分之前），因為天花板計算需要用到 `sim()` 回傳的 `metrics['profitability']['annualReturn']` 才能比較，无法像 `_ic_decay_ok()` 一樣在 `sim()` 之前就過濾（`_ic_decay_ok()` 用的是 rank-IC，不需要實際回測結果；本檢查需要實際回測的年化報酬才能比較）。

### Fail-open 容錯風格

延續 `_ic_decay_ok()` 的既有風格：`close_df` 缺失、重新平衡日期不足、候選池任一期無資料 → 直接放行（回傳 `True`），不誤殺個體。理由：這是「額外的異常偵測層」，不應該讓資料缺角反過來讓 GA 整批個體失去評分機會。

## Implementation Contract

**行為**：`ETF/optimizer/ga/evaluate.py::_compute()` 在 `sim()` 回測完成、`Score().evaluate()` 給分之前，新增一道檢查。若判定疑似資料洩漏，該個體的適應度值直接為 `0.0`（與 `_ic_decay_ok()`、`trade_count == 0`、`avgNStock` 不足等既有的「不合格 → 0 分」行為完全一致），使用者在 GA 演化過程中觀察不到任何額外的中斷或例外，只會看到該個體分數為 0。

**介面 / 資料形狀**：

- 新增模組層級純函式 `compute_perfect_foresight_ceiling(position: pd.DataFrame, close: pd.DataFrame, avg_n_stock: float, period: int = 20) -> float | None`：
  - 輸入：`position`（`all_cond`，可能是布林或連續分數 DataFrame，True/正分數 = 候選池當日入選）、`close`（`config['close_df']`）、`avg_n_stock`（本次回測 `metrics['profitability']['avgNStock']`）、`period`（重新平衡對應交易日數，預設 20）。
  - 輸出：理論年化報酬（float）。無法計算時回傳 `None`（呼叫端視為放行）。
  - `avg_n_stock` 必須是有限數且 `>= 1`（`np.isfinite` 檢查），否則直接回傳 `None`（防止 `round(NaN)` 拋 `ValueError`）。
  - 邏輯：用 `position.resample('ME').last()` 取**全歷史**月頻重新平衡日（見上方「天花板時間視窗」決策，< 6 期視為資料不足回傳 `None`）；每個日期取 `position.loc[date] > 0` 為候選池（NaN 自動為 `False`，負值也自動為 `False`——見下方 truthy 修正的後續修正）；候選池與 `close.columns` **取交集**後才索引 `close`（否則候選池含 `close` 沒有的欄位時 `.loc[..., eligible]` 會拋 `KeyError`，見下方 C1 修正）；若候選池檔數 `< n_top` 或 `n_top / len(候選池) > 0.5`（候選池不夠大、天花板會退化成池均值而誤殺合法策略，見 Risks）則跳過該期；計算各檔未來 `period` 交易日報酬，取前 `round(avg_n_stock)` 高者的平均報酬作為該期報酬；把各期報酬複利後年化。

  > **實作階段修正一（原設計曾誤寫「position 為 True」）**：`combine_selected_conditions()` 在預設 `strategy_mode='Scoring_System'` 下回傳的是連續加權分數 DataFrame，而非純布林值，嚴格 `position == True` 判定在此模式下幾乎恆為 False，會讓候選池永遠是空集合、天花板永遠計算失敗（`None`）、洩漏偵測在 production 預設路徑上形同虛設。
  >
  > **實作階段修正二（code review 發現修正一本身也有 bug）**：修正一最初改成 `position.loc[date].fillna(0).astype(bool)`（truthy 判定），但這會把**負分數**也視為入選（`astype(bool)` 對非零負值同樣回傳 `True`）。`conditions.yaml` 目前 58 個條件全部回傳布林值，`Scoring_System` 的加總分數目前恆為非負，今天不會踩到；但只要日後加入連續型條件（如直接用因子原始值而非布林比較式），分數就可能出現負值，而負分數在真實回測裡代表放空部位，天花板卻會把它當成多方候選股。改為 `position.loc[date] > 0`：對布林輸出數學上等價於 `== True`；對分數輸出正確排除負值與零值；NaN 自動判為 `False`，連 `fillna` 都不需要。

- 新增模組層級純函式 `_leak_canary_ok(position, config: dict, actual_annual_return: float, avg_n_stock: float) -> bool`：
  - 讀取 `config.get('leak_canary_enabled', True)`；`False` 時直接回傳 `True`（放行，功能關閉）。
  - 呼叫 `compute_perfect_foresight_ceiling(...)`；回傳 `None` **或天花板 `<= 0`** 時放行（見下方 C2 修正）。
  - 讀取 `config.get('leak_canary_margin', 1.0)`；`actual_annual_return > ceiling * margin` 時回傳 `False`（判定洩漏），否則 `True`。
  - `config.get('print_enabled')` 為真且判定為洩漏時，印出格式如 `[洩漏疑慮] 實際年化 {actual:.1%} 超過候選池完美相對強弱天花板 {ceiling:.1%}` 的警告訊息。

  > **實作階段修正三（code review 發現：margin 語意反轉）**：天花板可能為負（候選池在該期間內連「表現最好的幾檔」都是虧損）。此時 `ceiling * margin` 隨 `margin` 增加而**更負**——`leak_canary_margin` 原意是「放寬容忍度」，在天花板為負時卻變成「收緊」，且天花板為負會讓幾乎所有正報酬個體都超過門檻，導致單一世代全族群適應度歸零、GA 演化停滯，而且是靜默發生（只看到分數全 0，不知道是 canary 造成的）。修正為天花板 `<= 0` 時直接放行：負值/零值天花板代表這個候選池在該期間本身就是無效的對照組，不該拿來判定洩漏。

- `_compute()` 內插入點：取得 `metrics` 後、`Score(metrics, config).evaluate()` 之前，用 `profitability = metrics.get("profitability", {})`（而非硬索引 `metrics["profitability"]`，避免 `min_hold_stock` 被設為 `0` 時 `_leak_canary_ok` 呼叫處出現未防護的 `KeyError`）呼叫 `_leak_canary_ok(all_cond, config, profitability.get('annualReturn', 0), profitability.get('avgNStock', 0))`，回傳 `False` 時直接 `return 0.0`。

**失敗模式**：

- `close_df` 未提供、`avg_n_stock` 非有限數、全歷史月頻重新平衡日 < 6 期、任一期候選池（交集 `close.columns` 後）檔數不足 `avg_n_stock` 或候選池相對 `avg_n_stock` 太窄（`n_top/len(候選池) > 0.5`）→ 該期被跳過；所有期都被跳過時 `compute_perfect_foresight_ceiling` 回傳 `None`，`_leak_canary_ok` 放行，不影響既有 GA 行為。
- 天花板計算出的值 `<= 0` → `_leak_canary_ok` 放行（見修正三）。
- `leak_canary_enabled=False` → 完全跳過計算，零效能影響。

**驗收條件**：

- `ETF/tests/optimizer/test_leak_canary.py` 使用合成 `position`／`close` DataFrame（不連 FinLab），涵蓋：
  1. 實際年化報酬低於天花板 → `_leak_canary_ok` 回傳 `True`。
  2. 實際年化報酬高於天花板（人為建構一組「模型分數等於未來報酬」的極端合成資料）→ 回傳 `False`。
  3. `leak_canary_enabled=False` → 無論天花板為何都回傳 `True`。
  4. `close_df` 缺失 / 資料不足 → 回傳 `True`（fail-open）。
- `uv run pytest ETF/tests/optimizer/test_leak_canary.py` 全數通過。
- `uv run ruff check --fix && uv run ruff format` 對 `evaluate.py` 與新測試檔無報錯。

**範圍邊界**：僅修改 `ETF/optimizer/ga/evaluate.py` 與新增對應測試檔；不動 `run_ga.py`、`setup.py`、`score.py`、`compat.py`、`tool.py`。不修改 `conditions.yaml` 或任何條件定義。

## Risks / Trade-offs

- [Risk] 候選池股數過少（例如個體條件極嚴格，某期候選池只剩 1-2 檔）時，「前 avg_n_stock 高者」等於全體，天花板會退化成池均值，而實際策略是加權持有 + 停損停利，合法超越池均值並不代表洩漏 → Mitigation：**不再只依賴 `min_hold_stock` 門檻**（`min_hold_stock` 是持股檔數下限，跟「池大小 vs n_top 比值」無關，攔不到這個退化情境——此為初版設計的錯誤緩解描述，code review 後修正）。改為 `compute_perfect_foresight_ceiling` 內逐期檢查 `n_top / len(候選池) > 0.5` 時直接跳過該期。
- [Risk] `leak_canary_margin=1.0`（天花板本身不留寬容）在資料雜訊大的期間可能誤殺極少數表現優異但合法的個體 → Mitigation：`leak_canary_margin` 設計為可調參數，使用者觀察到誤殺率過高時可自行調高（例如 1.1）；預設值先保守（無寬容）以優先攔截洩漏。**已知限制**：`margin` 只在天花板 `> 0` 時才有意義地生效（見「天花板 `<=0` 一律放行」修正），天花板 `<=0` 的期間 `margin` 不生效。
- [Risk] `compute_perfect_foresight_ceiling` 逐期迭代計算，改為全歷史（而非近 2 年）後期數會隨 FinLab 可用歷史增加（可能達數百期，非原估的 ~24 期）→ Mitigation：每期運算量仍是常數（`nlargest` + 平均），數百期量級下單次 GA 個體評估仍應在次秒等級；若日後 GA 迭代速度明顯下降，可考慮把 `compute_perfect_foresight_ceiling` 的天花板結果依 `position` 內容雜湊快取（目前未實作，非本次範圍）。
- [Risk] `Scoring_System` 模式下天花板只是較寬鬆的參考基準（候選池判定是聯集而非交集、`sim()` 對分數 position 做權重正規化而非等權持有 top-N）→ Mitigation：已在「天花板定義」決策段落誠實記錄為已知限制；不在本次 change 內修正，需要時另開 change 處理權重感知的天花板計算。
- [Risk] `eligible.index.intersection(close.columns)` 修正前，候選池含 `close` 沒有的欄位（例如條件用了 `monthly_revenue`/`fundamental_features` 等非 `price:收盤價` 宇宙的資料源，欄位集合可能不是 `close_df` 的子集）時會拋出未被任何 `try` 覆蓋的 `KeyError`，導致整個 GA run 崩潰 → Mitigation：已修正為交集後才索引；`ETF/tests/optimizer/test_leak_canary.py::test_compute_perfect_foresight_ceiling_ignores_columns_missing_from_close` 鎖定此行為（含 mutation check 驗證測試會抓到回歸）。

