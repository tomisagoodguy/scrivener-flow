# Spec: ETF Holding Duration

## Purpose

從歷史 `etf_diff_logs` 推算每支 ETF 各持股的進場日期與持倉天數，讓使用者能識別長期核心持股、短期試探部位，以及推測即將換手的候選（持倉天數遠超平均）。

---

## ADDED Requirements

### Requirement: HoldingDurationStep 月末更新持股週期

`HoldingDurationStep` SHALL 在月末最後一個交易日執行，對所有 ETF 查詢 `etf_diff_logs` 歷史，推算各持股的進場日期並 UPSERT 至 `etf_holding_periods`。非月末日執行時直接 skip。

進場日推算規則：
- 對每個 `(etf_code, stock_code)` 組合，找出最近一個 OUT 或 SELL 事件之後的第一個 IN 或 BUY 事件日期，作為 `entry_date`
- 若歷史無 OUT/SELL 記錄，則取全歷史最早的 IN 或 BUY 事件日期

#### Scenario: 月末交易日執行

- **WHEN** `HoldingDurationStep` 在月末最後一個交易日執行
- **THEN** 對所有 16 支 ETF 計算持股進場日，UPSERT 至 `etf_holding_periods`

#### Scenario: 非月末交易日執行

- **WHEN** `HoldingDurationStep` 在非月末日執行
- **THEN** log "Skipping holding duration: not month-end"，直接結束，不操作 DB

#### Scenario: 已退出持股的處理

- **WHEN** 某持股有 IN 事件後又有 OUT 事件，且之後無新的 IN 事件
- **THEN** `etf_holding_periods` 中該記錄的 `is_active = FALSE`，`exit_date` 設為最後 OUT 事件日，`holding_days` 為 exit_date - entry_date

#### Scenario: 輔助步驟失敗不中斷 Pipeline

- **WHEN** `HoldingDurationStep` 發生任何 Exception
- **THEN** log error，不 raise，Pipeline 繼續

---

### Requirement: etf_holding_periods 每個 (etf_code, stock_code) 只保留最近一次持倉

`etf_holding_periods` 以 `(etf_code, stock_code)` 為唯一鍵，只追蹤最近一次的持倉週期（不保留歷史多次進出記錄）。

#### Scenario: 同一持股再次進場

- **WHEN** 某股過去有 IN→OUT 記錄，現在又有新的 IN 事件
- **THEN** UPSERT 覆蓋為新的 entry_date，is_active = TRUE，exit_date = NULL

---

### Requirement: ETF 持股列表顯示持倉天數

`/investment/[etf]` 頁面的持股列表 SHALL 新增「持倉天數」欄位，顯示各持股的 `holding_days` 值。

#### Scenario: 持倉天數正常顯示

- **WHEN** 持股在 `etf_holding_periods` 中有 `is_active = TRUE` 的記錄
- **THEN** 顯示「XXX 天」，超過 365 天的以不同顏色標示（長期核心持股）

#### Scenario: 無持倉天數資料

- **WHEN** 持股不在 `etf_holding_periods`（例如月末前的新進持股）
- **THEN** 顯示「—」佔位，不顯示錯誤

---

### Requirement: getHoldingDuration Server Action 提供持倉天數資料

`src/app/actions/getHoldingDuration.ts` 的 `getHoldingDuration(etfCode: string)` Server Action SHALL 查詢 `etf_holding_periods` 中 `etf_code` 匹配且 `is_active = TRUE` 的記錄，回傳 `{ stock_code, holding_days, entry_date }[]`。

#### Scenario: ETF 有持倉資料

- **WHEN** 呼叫 `getHoldingDuration('00981A')`
- **THEN** 回傳陣列，每筆含 `stock_code`、`holding_days`（整數）、`entry_date`（ISO date string）
