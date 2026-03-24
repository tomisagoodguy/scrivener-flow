# Spec: StockAnalyzer — 純計算分析層

## Overview

`ETF/ai_report/analyzer.py` 提供 `StockAnalyzer` class，將個股技術指標與籌碼分析邏輯從 `generate_report()` 中解耦，成為可獨立測試的純計算層。

## ADDED Requirements

### Requirement: StockAnalyzer.analyze() 方法簽名

`analyze(code: str, prices_df: DataFrame, broker_df: DataFrame, chips_df: DataFrame) -> dict | None` 必須：

- 過濾 `prices_df` 取得該 `code` 的資料列
- 當資料筆數 < 20 時，回傳 `None`（資料不足，無法計算 MA20）

### Requirement: 技術指標計算

回傳 dict 必須包含：

- `trend`: `'Bullish'` / `'Bearish'` / `'Neutral'`
  - `close > MA5 > MA20` → `'Bullish'`
  - `close < MA5 < MA20` → `'Bearish'`
  - 其他 → `'Neutral'`
- `ma20Trend`: `'Rising'` / `'Falling'` / `'Flat'`
  - 基於最近 5 日 MA20 斜率（線性回歸或簡單差值）
  - 斜率 > 閾值 → `'Rising'`，< -閾值 → `'Falling'`，否則 `'Flat'`
- `isOverheated3M`: `bool`
  - 近 60 個交易日最高價 / 最低價 - 1 >= 1.0（漲幅 >= 100%）
- `highestPrice3M`: `float`，近 60 個交易日最高收盤價

### Requirement: 籌碼指標計算

回傳 dict 必須包含：

- `itBuy5d`: `float`，近 5 日投信買賣超加總（來自 `chips_df`）
- `brokerNetBuy20d`: `float`，近 20 日主力券商買賣超加總（來自 `broker_df`）
- `largeShareholderTrend`: `'Increasing'` / `'Decreasing'` / `'Stable'`
  - 基於大戶持股比例趨勢（來自 `chips_df`）

## Scenarios

### Scenario: 資料不足

- **WHEN** 某股票在 `prices_df` 中只有 15 筆資料
- **THEN** `analyze()` 回傳 `None`

### Scenario: 過熱偵測

- **WHEN** 近 60 日最高價為 200，最低價為 90（漲幅 122%）
- **THEN** `isOverheated3M` 為 `True`

### Scenario: 多頭趨勢

- **WHEN** `close > MA5 > MA20`
- **THEN** `trend` 為 `'Bullish'`

### Scenario: 籌碼資料缺失

- **WHEN** `broker_df` 中無該股票資料
- **THEN** `brokerNetBuy20d` 為 `0.0`，不拋出例外
