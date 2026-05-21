# Spec: ETF Holding Attribution

## Purpose

計算每支 ETF 各持股對當月報酬的貢獻度（contribution = weight × return），讓使用者清楚看到哪幾支股票是 ETF 的主要報酬來源或拖累者。

---

## ADDED Requirements

### Requirement: AttributionComputeStep 月末計算持股貢獻度

`AttributionComputeStep` SHALL 在每個月的最後一個交易日執行時，計算所有 ETF 過去一個月內各持股的貢獻度並存入 `etf_holding_attribution`。非月末交易日執行時，步驟 skip（log info 後直接返回）。

#### Scenario: 月末交易日執行

- **WHEN** `AttributionComputeStep` 在月末最後一個交易日執行
- **THEN** 對 16 支 ETF 各自計算：`contribution_i = w_i(上月末) × r_i(本月)`，寫入 `etf_holding_attribution`

#### Scenario: 非月末交易日執行

- **WHEN** `AttributionComputeStep` 在非月末日執行
- **THEN** log "Skipping attribution: not month-end"，步驟正常結束（不 raise，不寫 DB）

#### Scenario: 某持股在 stock_prices_daily 中無資料

- **WHEN** 某持股代碼在 `stock_prices_daily` 中找不到對應月份的收盤價
- **THEN** 該持股的 `period_return` 和 `contribution` 設為 NULL，其餘持股正常計算

#### Scenario: 輔助步驟失敗不中斷 Pipeline

- **WHEN** `AttributionComputeStep` 發生任何 Exception
- **THEN** log error，Pipeline 繼續執行後續步驟（不 raise）

---

### Requirement: etf_holding_attribution 表結構

`etf_holding_attribution` 資料表 SHALL 儲存每月每支 ETF 各持股的貢獻度，欄位含 `date`（月末日期）、`etf_code`、`stock_code`、`stock_name`、`weight`（%）、`period_return`（%）、`contribution`（bp，basis points），並以 `(date, etf_code, stock_code)` 為唯一鍵。

#### Scenario: 同月同 ETF 同持股再次執行

- **WHEN** 同一個 `(date, etf_code, stock_code)` 已存在
- **THEN** 以 UPSERT 更新，不產生重複記錄

---

### Requirement: 前端顯示持股貢獻度排行

`/investment/attribution` 頁面 SHALL 在 ETF vs 大盤折線圖下方，顯示最近一個月各持股的貢獻度排行，分為「前五大貢獻者」與「前五大拖累者」兩組長條圖。

#### Scenario: 使用者查看 00981A 的持股貢獻度

- **WHEN** 使用者選擇 00981A 並查看持股貢獻度區塊
- **THEN** 頁面顯示兩組橫向長條圖：貢獻者組（正向，rose 色系）、拖累者組（負向，emerald 色系），每組最多 5 筆，含股票代碼、名稱、貢獻度數值（bp）

#### Scenario: 月末資料尚未產生（月初幾天）

- **WHEN** 當前月份的 `etf_holding_attribution` 資料尚不存在
- **THEN** 顯示上個月的資料，並標示「資料日期：{上月末}」

---

### Requirement: 頁面附上估算免責說明

`/investment/attribution` 頁面 SHALL 在持股貢獻度區塊下方顯示固定說明文字：「貢獻度為估算值，以持股公告日權重為基準，未含費用與現金部位」。

#### Scenario: 頁面載入完成

- **WHEN** 使用者進入 `/investment/attribution`
- **THEN** 免責說明文字以較小字型（text-xs text-gray-500）顯示於圖表下方
