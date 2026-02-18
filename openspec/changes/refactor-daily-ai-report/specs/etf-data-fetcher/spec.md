# Spec: ETFDataFetcher — 統一資料獲取介面

## Overview

`ETF/ai_report/fetcher.py` 提供 `ETFDataFetcher` class，封裝所有 DB 查詢邏輯，消除 `fetch_technical_data`、`fetch_broker_data`、`fetch_chip_data` 三個函式中重複的 placeholder 建立模板。

## ADDED Requirements

### Requirement: ETFDataFetcher class 建構子

`ETFDataFetcher` 必須：

- 接受 `engine` (SQLAlchemy Engine) 作為建構子參數
- 儲存為 `self.engine`

### Requirement: _query_by_codes 私有 helper

`_query_by_codes(query: text, codes: list[str], extra_params: dict = {}) -> DataFrame` 必須：

- 使用 `codes` 建立 `placeholders` 字串（如 `:code_0, :code_1, ...`）
- 合併 `extra_params` 與 codes params 為單一 dict
- 使用 `with self.engine.connect() as conn: conn.execute(query, params)` 執行
- 回傳 `pd.DataFrame(result.fetchall(), columns=result.keys())`
- 當 `codes` 為空時，直接回傳 `pd.DataFrame()`，不執行 SQL

### Requirement: fetch_holdings() 資料清理

`fetch_holdings(etf_code: str) -> DataFrame` 必須：

- 對 `weight`、`revenue_yoy`、`revenue_mom` 欄位執行 `pd.to_numeric(errors='coerce').fillna(0.0)`
- 移除重複欄位（`df = df.loc[:, ~df.columns.duplicated()]`）

### Requirement: fetch_technical_data / fetch_broker_data / fetch_chip_data

三個方法均使用 `_query_by_codes` 實作，並包含：

- `try/except Exception as e: logger.warning(...); return pd.DataFrame()` 錯誤處理

## Scenarios

#### Scenario: 空 stock_codes 快速返回

- **WHEN** `fetch_technical_data([])` 被呼叫
- **THEN** 立即回傳 `pd.DataFrame()`，不執行任何 SQL

#### Scenario: 資料庫查詢失敗

- **WHEN** `fetch_broker_data()` 的 SQL 執行拋出例外
- **THEN** 記錄 `logger.warning`，回傳 `pd.DataFrame()`，不中斷流程

#### Scenario: holdings 資料清理

- **WHEN** `fetch_holdings()` 回傳含有字串型態的 `weight` 欄位
- **THEN** 欄位被轉換為 float，無法轉換的值填入 `0.0`
