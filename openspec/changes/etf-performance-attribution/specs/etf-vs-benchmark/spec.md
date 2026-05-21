# Spec: ETF vs Benchmark

## Purpose

追蹤每支主動 ETF 的市場報酬相對於台灣加權指數與 0050 的 alpha，使使用者能判斷 ETF 是否長期 outperform 大盤。

---

## ADDED Requirements

### Requirement: BenchmarkSyncStep 每日同步報酬資料

Pipeline 中的 `BenchmarkSyncStep` SHALL 每個交易日從 FinLab 抓取所有 16 支 ETF 的市場收盤價，以及台灣加權指數和 0050 的收盤價，計算 1M/3M/6M/1Y 累積報酬並存入 `etf_benchmark_comparison`。

#### Scenario: 正常執行日

- **WHEN** `BenchmarkSyncStep` 在交易日執行
- **THEN** `etf_benchmark_comparison` 新增一筆 `(date, etf_code)` 記錄，包含 1M/3M/6M/1Y 的 ETF 報酬、加權指數報酬、alpha

#### Scenario: FinLab 無法取得 ETF 價格

- **WHEN** FinLab `price:收盤價` 中不存在某 ETF 代碼
- **THEN** 該 ETF 的報酬欄位為 NULL，其餘 ETF 正常寫入，步驟不 raise

#### Scenario: 輔助步驟失敗不中斷 Pipeline

- **WHEN** `BenchmarkSyncStep` 發生任何 Exception
- **THEN** log error，Pipeline 繼續執行後續步驟（不 raise）

---

### Requirement: etf_benchmark_comparison 表結構

`etf_benchmark_comparison` 資料表 SHALL 儲存每日每支 ETF 對加權指數的相對報酬，欄位含 `date`、`etf_code`、`etf_return_1m/3m/6m/1y`、`taiex_return_1m/3m/6m/1y`、`alpha_1m/3m`，並以 `(date, etf_code)` 為唯一鍵。

#### Scenario: 同日同 ETF 再次執行

- **WHEN** 同一個 `(date, etf_code)` 組合已存在於 `etf_benchmark_comparison`
- **THEN** 以 UPSERT 更新，不產生重複記錄

---

### Requirement: 前端績效歸因頁顯示 ETF vs 大盤累積報酬折線圖

`/investment/attribution` 頁面 SHALL 提供 ETF 選擇器，讓使用者選定一支 ETF 後，顯示該 ETF 與加權指數的累積報酬折線圖（時間範圍：最近 1 年）。

#### Scenario: 使用者選擇 00981A

- **WHEN** 使用者在 `/investment/attribution` 選擇 00981A
- **THEN** 折線圖呈現 00981A 累積報酬（紅色）與加權指數累積報酬（灰色）的對比，並在圖表右側顯示 1M/3M/6M alpha 數值

#### Scenario: alpha 為正（ETF outperform 大盤）

- **WHEN** ETF 的 alpha_1m > 0
- **THEN** alpha 數值以 `text-rose-600` 顯示（台股紅色 = 正報酬慣例）

#### Scenario: alpha 為負（ETF underperform 大盤）

- **WHEN** ETF 的 alpha_1m < 0
- **THEN** alpha 數值以 `text-emerald-600` 顯示
