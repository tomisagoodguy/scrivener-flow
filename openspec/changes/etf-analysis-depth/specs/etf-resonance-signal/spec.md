# Spec: ETF Resonance Signal

## Purpose

當 ETF 當日加碼某股，且投信或外資近 10 日同向淨買超時，產生共鳴訊號，讓使用者能識別「主動 ETF 經理人 + 大型法人方向一致」的高確信度機會。

---

## ADDED Requirements

### Requirement: DiffComputeStep 輸出當日新增買進代碼集合

`DiffComputeStep` SHALL 在計算完 diff 後，將當日所有 ETF 的 BUY 或 IN 事件的 `stock_code` 彙整並寫入 `ctx.new_buy_codes: set[str]`，供 `ResonanceSignalStep` 使用。

#### Scenario: 當日有 ETF 買進事件

- **WHEN** `DiffComputeStep` 計算到 change_type 為 `BUY` 或 `IN` 的 diff 記錄
- **THEN** 對應 stock_code 加入 `ctx.new_buy_codes`

#### Scenario: 當日無 ETF 買進事件

- **WHEN** 當日所有 diff 均為 SELL/OUT/HOLD
- **THEN** `ctx.new_buy_codes` 為空集合，`ResonanceSignalStep` 收到後直接 skip

---

### Requirement: ResonanceSignalStep 計算共鳴類型

`ResonanceSignalStep` SHALL 對 `ctx.new_buy_codes` 中的每個股票代碼，從 FinLab 取得過去 10 個交易日的投信與外資買賣超累計值，依規則判斷共鳴類型並存入 `etf_resonance_signals`。

共鳴類型規則：
- `both`：投信近 10 日淨買超 > 0 且外資近 10 日淨買超 > 0
- `it`：僅投信近 10 日淨買超 > 0
- `foreign`：僅外資近 10 日淨買超 > 0
- `none`：均不符合（仍記錄，供日後統計）

#### Scenario: 雙向共鳴

- **WHEN** ETF 買進股票 A，且投信近 10 日累計淨買超 50,000 股，外資近 10 日累計淨買超 200,000 股
- **THEN** `etf_resonance_signals` 插入 `resonance_type = 'both'`，`it_net_10d = 50000`，`foreign_net_10d = 200000`

#### Scenario: ctx.new_buy_codes 為空

- **WHEN** `ctx.new_buy_codes` 為空集合
- **THEN** `ResonanceSignalStep` log "No new buys today, skipping resonance"，直接結束，不查 FinLab

#### Scenario: 輔助步驟失敗不中斷 Pipeline

- **WHEN** FinLab API 或 DB 寫入發生任何 Exception
- **THEN** log error，不 raise，Pipeline 繼續

---

### Requirement: etf_resonance_signals 以 UPSERT 避免重複

同一 `(date, etf_code, stock_code)` 組合重複執行時，SHALL 以 UPSERT 更新而非插入重複記錄。

#### Scenario: 同日重複執行

- **WHEN** 同一 `(date, etf_code, stock_code)` 已存在
- **THEN** 更新 `resonance_type`、`it_net_10d`、`foreign_net_10d`，不產生重複行

---

### Requirement: ETF 持股列表顯示共鳴 badge

`/investment/[etf]` 頁面的持股列表 SHALL 對當日 `etf_resonance_signals` 中 `resonance_type != 'none'` 的持股，在股票代碼旁顯示共鳴 badge。

#### Scenario: 雙向共鳴持股

- **WHEN** 某持股的 `resonance_type = 'both'`
- **THEN** 顯示 badge「💎 雙向」（紫色底）

#### Scenario: 僅投信共鳴

- **WHEN** `resonance_type = 'it'`
- **THEN** 顯示 badge「📈 投信」（藍色底）

#### Scenario: 僅外資共鳴

- **WHEN** `resonance_type = 'foreign'`
- **THEN** 顯示 badge「🌏 外資」（橙色底）

#### Scenario: 無共鳴或非當日買進

- **WHEN** 持股不在今日共鳴訊號中
- **THEN** 不顯示任何 badge，持股列表外觀不變
