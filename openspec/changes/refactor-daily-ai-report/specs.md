# Specs: Refactor `daily_ai_report.py`

## ADDED Requirements

### Requirement: ETFDataFetcher — 統一資料獲取介面

`ETF/ai_report/fetcher.py` 中的 `ETFDataFetcher` class 必須：

- 接受 `engine` (SQLAlchemy Engine) 作為建構子參數
- 提供私有方法 `_query_by_codes(query: text, codes: list[str], extra_params: dict = {}) -> DataFrame`，封裝重複的 placeholder 建立與執行邏輯
- 所有 `fetch_*` 方法在 `codes` 為空時，直接回傳 `pd.DataFrame()`，不執行 DB 查詢
- `fetch_holdings()` 在回傳前，對 `weight`、`revenue_yoy`、`revenue_mom` 欄位執行 `pd.to_numeric(errors='coerce').fillna(0.0)`，並移除重複欄位

#### Scenario: 空 stock_codes 快速返回
- **WHEN** `fetch_technical_data([])` 被呼叫
- **THEN** 立即回傳 `pd.DataFrame()`，不執行任何 SQL

#### Scenario: 資料庫查詢失敗
- **WHEN** `fetch_broker_data()` 或 `fetch_chip_data()` 的 SQL 執行拋出例外
- **THEN** 記錄 `logger.warning`，回傳 `pd.DataFrame()`，不中斷流程

---

### Requirement: StockAnalyzer — 純計算分析

`ETF/ai_report/analyzer.py` 中的 `StockAnalyzer` class 必須：

- 提供 `analyze(code, prices_df, broker_df, chips_df) -> dict | None` 方法
- 當 `prices_df` 中該 `code` 的資料筆數 < 20 時，回傳 `None`
- 計算並回傳以下欄位：
  - `trend`: `'Bullish'` / `'Bearish'` / `'Neutral'` (基於 close vs MA5 vs MA20)
  - `ma20Trend`: `'Rising'` / `'Falling'` / `'Flat'` (基於 MA20 斜率)
  - `isOverheated3M`: `bool`，近 60 個交易日最高價/最低價漲幅 >= 100%
  - `highestPrice3M`: `float`
  - `itBuy5d`: `float`，近 5 日投信買賣超加總
  - `brokerNetBuy20d`: `float`，近 20 日主力券商買賣超加總
  - `largeShareholderTrend`: `'Increasing'` / `'Decreasing'` / `'Stable'`

#### Scenario: 資料不足
- **WHEN** 某股票在 `prices_df` 中只有 15 筆資料
- **THEN** `analyze()` 回傳 `None`

#### Scenario: 過熱偵測
- **WHEN** 近 60 日最高價為 200，最低價為 90 (漲幅 122%)
- **THEN** `isOverheated3M` 為 `True`

---

### Requirement: build_report_prompt — Prompt 純函式

`ETF/ai_report/prompt_builder.py` 中的 `build_report_prompt()` 函式必須：

- 簽名：`build_report_prompt(holdings_df, stats, technical_map, top_holdings) -> str`
- 回傳完整的 f-string Prompt，包含所有分析要求區塊
- 包含風險警示區塊，要求 AI 識別 `isOverheated3M=True` 且 `ma20Trend=Falling` 的個股

---

### Requirement: AIReporter — 協調層

`ETF/ai_report/reporter.py` 中的 `AIReporter` class 必須：

- 建構子接受 `etf_code: str`、`models_to_try: list[str]`
- `run(dry_run: bool = False)` 方法：
  1. 載入 `.env.local` 或 `.env`
  2. 驗證 `GOOGLE_GEMINI_API_KEY`，缺失時 `logger.error` 並 `return`
  3. 初始化 `SQLStorage`，失敗時 `logger.error` 並 `return`
  4. 使用 `ETFDataFetcher` 獲取所有資料
  5. `holdings_df` 為空時 `logger.error` 並 `return`
  6. 使用 `StockAnalyzer` 分析每支股票，失敗時 `continue`
  7. 呼叫 `build_report_prompt()` 組裝 Prompt
  8. 依序嘗試 `models_to_try` 中的模型，成功後 `break`
  9. `dry_run=True` 時，印出報告前 200 字並 `return`，不發送通知
  10. 優先使用 `STOCK_LINE_CHANNEL_ACCESS_TOKEN`，否則使用 `LINE_CHANNEL_ACCESS_TOKEN`

---

### Requirement: daily_ai_report.py — 精簡入口

重構後的 `ETF/daily_ai_report.py` 必須：

- 行數 < 40 行
- 只包含 `sys.path` 設定、`argparse` 解析、`AIReporter` 初始化與 `run()` 呼叫
- CLI 介面保持不變：`python daily_ai_report.py --dry-run`

## REMOVED Requirements

### Requirement: 巨石 `generate_report()` 函式
**Reason**: 職責拆分至 `AIReporter.run()`、`ETFDataFetcher`、`StockAnalyzer`、`build_report_prompt()`

### Requirement: 重複的 placeholder 建立邏輯
**Reason**: 統一封裝至 `ETFDataFetcher._query_by_codes()`
