# Proposal: Refactor `daily_ai_report.py` — 消除巨石代碼

## Problem

`ETF/daily_ai_report.py` 目前是一個 **371 行的巨石腳本 (Monolith Script)**，違反單一職責原則 (SRP)，存在以下問題：

### 1. 職責混雜 (God Function)
`generate_report()` 函式承擔了 **5 種不同職責**：
- 環境初始化 (載入 .env、設定 API Key)
- 資料庫連線與資料獲取
- 個股技術/籌碼分析
- AI Prompt 組裝與 Gemini API 呼叫
- LINE 通知發送

這使得函式難以測試、難以維護，任何一個環節出錯都會導致整個流程失敗。

### 2. 資料獲取邏輯重複 (DRY Violation)
`fetch_technical_data`、`fetch_broker_data`、`fetch_chip_data` 三個函式有 **完全相同的模板**：
- 建立 `placeholders` 字串
- 建立 `params` dict
- `conn.execute()` + `pd.DataFrame()`
- 相同的 `try/except` 包裝

這段邏輯重複了 3 次，應封裝成通用的 `_query_by_codes()` helper。

### 3. Prompt 硬編碼在業務邏輯中 (Separation of Concerns)
AI Prompt（約 50 行的 f-string）直接嵌入在 `generate_report()` 中，導致：
- 修改 Prompt 需要理解整個函式的上下文
- 無法對 Prompt 進行單元測試
- 未來若要支援多種報告格式 (如週報、月報) 將極難擴展

### 4. 分析邏輯與資料獲取耦合
`analyze_stock()` 直接接收 3 個 DataFrame 參數，並在函式內部進行 DataFrame 過濾。這讓函式難以獨立測試，且若資料結構改變，需修改多處。

## Proposed Solution

將 `daily_ai_report.py` 拆分為以下模組結構：

```
ETF/
├── daily_ai_report.py          # 入口點 (main only, <30 行)
└── ai_report/
    ├── __init__.py
    ├── fetcher.py              # 所有 DB 查詢邏輯
    ├── analyzer.py             # 個股技術/籌碼分析邏輯
    ├── prompt_builder.py       # AI Prompt 組裝
    └── reporter.py             # 協調整個流程 (原 generate_report)
```

## New Capabilities

- `fetcher.py`: 提供 `ETFDataFetcher` class，封裝所有 DB 查詢，含通用 `_query_by_codes()` helper
- `analyzer.py`: 提供 `StockAnalyzer` class，純函式分析，易於單元測試
- `prompt_builder.py`: 提供 `build_report_prompt()` 函式，接受結構化資料，輸出 Prompt 字串
- `reporter.py`: 提供 `AIReporter` class，協調 fetcher → analyzer → prompt → gemini → notifier

## Modified Capabilities

- `daily_ai_report.py`: 僅保留 `main()` 入口，呼叫 `AIReporter`

## Impact

- **影響範圍**：`ETF/daily_ai_report.py`（全面重構）
- **新增檔案**：`ETF/ai_report/` 目錄下 4 個模組
- **不影響**：`ETF/notifiers/line_notifier.py`、`ETF/database/sql_storage.py`、GitHub Actions workflow
- **向後相容**：CLI 介面 (`--dry-run`) 保持不變
