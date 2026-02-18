# Design: Refactor `daily_ai_report.py` — 模組化架構設計

## Context

`daily_ai_report.py` 是一個 371 行的巨石腳本，承擔了資料獲取、分析、Prompt 組裝、AI 呼叫、通知發送等多種職責。詳見 `proposal.md`。

## Goals / Non-Goals

**Goals:**
- 將腳本拆分為職責單一的模組，每個模組 < 100 行
- 消除 3 處重複的 `_query_by_codes` 模板代碼
- 將 AI Prompt 從業務邏輯中分離，使其可獨立修改與測試
- 保持 CLI 介面 (`--dry-run`) 完全向後相容
- 不引入任何新的外部依賴

**Non-Goals:**
- 不重構 `line_notifier.py` 或 `sql_storage.py`
- 不新增單元測試（測試為後續 change）
- 不改變 GitHub Actions workflow

## Decisions

### 決策 1：使用 Class 而非純函式模組

**選擇**：`ETFDataFetcher`、`StockAnalyzer`、`AIReporter` 採用 Class 封裝。

**理由**：
- `ETFDataFetcher` 需要持有 `engine` 實例，Class 比傳遞參數更清晰
- `AIReporter` 需要協調多個依賴 (fetcher, analyzer, notifier)，Class 的 `__init__` 注入更易測試
- `StockAnalyzer` 可以是純函式模組（無狀態），但為一致性採用 Class

### 決策 2：`prompt_builder.py` 使用純函式

**選擇**：`build_report_prompt(holdings_df, stats, technical_map, top_holdings) -> str`

**理由**：Prompt 組裝是純資料轉換，無副作用，純函式最易測試與替換。

### 決策 3：通用 `_query_by_codes()` 為私有 helper

**選擇**：在 `ETFDataFetcher` 內部定義 `_query_by_codes(query_template, stock_codes)` 私有方法。

**理由**：這個 helper 只對 fetcher 有意義，不需要對外暴露。

## Architecture

```
ETF/
├── daily_ai_report.py          # 入口點 (main only)
│   └── main() → AIReporter.run(dry_run)
│
└── ai_report/
    ├── __init__.py             # 空
    │
    ├── fetcher.py              # DB 查詢層
    │   └── class ETFDataFetcher(engine)
    │       ├── _query_by_codes(query, codes) -> DataFrame  # 私有 helper
    │       ├── fetch_holdings() -> DataFrame
    │       ├── fetch_technical_data(codes) -> DataFrame
    │       ├── fetch_broker_data(codes) -> DataFrame
    │       └── fetch_chip_data(codes) -> DataFrame
    │
    ├── analyzer.py             # 分析層 (純計算，無 DB)
    │   └── class StockAnalyzer
    │       └── analyze(code, prices_df, broker_df, chips_df) -> dict | None
    │
    ├── prompt_builder.py       # Prompt 組裝層
    │   └── build_report_prompt(holdings_df, stats, technical_map, top_holdings) -> str
    │
    └── reporter.py             # 協調層 (Orchestrator)
        └── class AIReporter
            ├── __init__(etf_code, models_to_try)
            └── run(dry_run=False) -> None
                # 1. Init storage & fetcher
                # 2. Fetch data via fetcher
                # 3. Analyze via analyzer
                # 4. Build prompt via prompt_builder
                # 5. Call Gemini
                # 6. Notify via LineNotifier
```

## Data Flow

```
main()
  └─ AIReporter.run(dry_run)
       ├─ ETFDataFetcher.fetch_holdings()          → holdings_df
       ├─ ETFDataFetcher.fetch_technical_data()    → prices_df
       ├─ ETFDataFetcher.fetch_broker_data()       → broker_df
       ├─ ETFDataFetcher.fetch_chip_data()         → chips_df
       ├─ StockAnalyzer.analyze() × N stocks       → technical_map
       ├─ build_report_prompt(...)                 → prompt_str
       ├─ genai.GenerativeModel.generate_content() → response
       └─ LineNotifier.broadcast_ai_report()       (skipped if dry_run)
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 重構過程中破壞現有功能 | 保留原始 `daily_ai_report.py` 直到新模組通過 `--dry-run` 驗證 |
| 模組間 import 路徑問題 | 在 `ai_report/__init__.py` 中統一 re-export，避免深層 import |
| `sys.path` 設定在多個模組中重複 | 只在 `daily_ai_report.py` 入口設定，子模組使用相對 import |
