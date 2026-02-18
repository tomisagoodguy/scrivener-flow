# Tasks: Refactor `daily_ai_report.py`

## 1. 建立模組目錄結構

- [x] 1.1 建立 `ETF/ai_report/` 目錄，新增空白 `__init__.py`

## 2. 實作 `fetcher.py` — 資料獲取層

- [x] 2.1 建立 `ETF/ai_report/fetcher.py`，定義 `ETFDataFetcher(engine)` class
- [x] 2.2 實作私有方法 `_query_by_codes(query, codes, extra_params={})` — 封裝 placeholder 建立、`conn.execute()`、`pd.DataFrame()` 三步驟
- [x] 2.3 將 `fetch_holdings()` 遷移至 `ETFDataFetcher`，使用 `_query_by_codes`，保留數值型別轉換與去重複欄位邏輯
- [x] 2.4 將 `fetch_technical_data()`、`fetch_broker_data()`、`fetch_chip_data()` 遷移至 `ETFDataFetcher`，統一使用 `_query_by_codes`

## 3. 實作 `analyzer.py` — 個股分析層

- [x] 3.1 建立 `ETF/ai_report/analyzer.py`，定義 `StockAnalyzer` class
- [x] 3.2 將 `analyze_stock()` 邏輯遷移至 `StockAnalyzer.analyze()`，保留所有現有計算 (MA5/MA20、MA20 斜率、3M 過熱偵測、投信/主力/大戶籌碼)

## 4. 實作 `prompt_builder.py` — Prompt 組裝層

- [x] 4.1 建立 `ETF/ai_report/prompt_builder.py`
- [x] 4.2 將 `generate_report()` 中的 f-string Prompt 提取為 `build_report_prompt(holdings_df, stats, technical_map, top_holdings) -> str` 純函式

## 5. 實作 `reporter.py` — 協調層

- [x] 5.1 建立 `ETF/ai_report/reporter.py`，定義 `AIReporter(etf_code, models_to_try)` class
- [x] 5.2 將 `generate_report()` 的協調邏輯遷移至 `AIReporter.run(dry_run=False)`，依序呼叫 fetcher → analyzer → prompt_builder → gemini → notifier

## 6. 精簡入口 `daily_ai_report.py`

- [x] 6.1 將 `daily_ai_report.py` 精簡至 < 40 行，只保留 `sys.path` 設定、`argparse`、`AIReporter` 呼叫
- [x] 6.2 移除原有的所有函式定義（已遷移至子模組）

## 7. 驗證

- [x] 7.1 執行 `uv run python ETF/daily_ai_report.py --dry-run`，確認輸出正常，無 import 錯誤
- [x] 7.2 確認 `[Dry Run Report Output]` 有正確印出 AI 報告前 200 字
