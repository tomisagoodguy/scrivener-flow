# Spec: AIReporter — 協調層

## Overview

`ETF/ai_report/reporter.py` 提供 `AIReporter` class，作為整個 AI 報告生成流程的協調者，依序呼叫 `ETFDataFetcher` → `StockAnalyzer` → `build_report_prompt` → Gemini API → LINE 通知。

## ADDED Requirements

### Requirement: AIReporter class 建構子

`AIReporter(etf_code: str, models_to_try: list[str])` 必須：

- 儲存 `self.etf_code` 與 `self.models_to_try`

### Requirement: AIReporter.run() 執行流程

`run(dry_run: bool = False)` 必須依序執行：

1. 載入 `.env.local`（優先）或 `.env`（fallback）
2. 驗證 `GOOGLE_GEMINI_API_KEY` 存在，缺失時 `logger.error` 並 `return`
3. 初始化 `SQLStorage`，失敗時 `logger.error` 並 `return`
4. 使用 `ETFDataFetcher` 獲取 `holdings_df`、`technical_df`、`broker_df`、`chip_df`
5. `holdings_df` 為空時 `logger.error` 並 `return`
6. 使用 `StockAnalyzer` 分析每支股票，`analyze()` 回傳 `None` 時 `continue`
7. 呼叫 `build_report_prompt()` 組裝 Prompt
8. 依序嘗試 `models_to_try` 中的模型，成功後 `break`
9. `dry_run=True` 時，印出報告前 200 字並 `return`，不發送 LINE 通知
10. `dry_run=False` 時，優先使用 `STOCK_LINE_CHANNEL_ACCESS_TOKEN`，否則使用 `LINE_CHANNEL_ACCESS_TOKEN` 發送通知

### Requirement: LINE Token 優先順序

`run()` 在發送通知時：

- 先檢查 `os.getenv('STOCK_LINE_CHANNEL_ACCESS_TOKEN')`
- 若為 None 或空字串，fallback 至 `os.getenv('LINE_CHANNEL_ACCESS_TOKEN')`

## Scenarios

#### Scenario: dry_run 模式

- **WHEN** `AIReporter('00878', [...]).run(dry_run=True)` 被呼叫
- **THEN** 印出 `[Dry Run Report Output]` 前綴與報告前 200 字，不呼叫 LINE notifier

#### Scenario: API Key 缺失

- **WHEN** 環境中無 `GOOGLE_GEMINI_API_KEY`
- **THEN** `logger.error` 記錄錯誤，`run()` 提前 `return`，不執行後續步驟

#### Scenario: 所有模型失敗

- **WHEN** `models_to_try` 中所有模型的 Gemini API 呼叫均失敗
- **THEN** `logger.error` 記錄錯誤，不發送 LINE 通知

#### Scenario: STOCK token 優先

- **WHEN** `STOCK_LINE_CHANNEL_ACCESS_TOKEN` 與 `LINE_CHANNEL_ACCESS_TOKEN` 均存在
- **THEN** 使用 `STOCK_LINE_CHANNEL_ACCESS_TOKEN` 發送通知
