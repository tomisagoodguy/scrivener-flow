## Why

ETF Pipeline 每日記錄基金經理人的買進行為（etf_diff_logs），但目前只做訊號偵測，沒有量化「這種買法之後股票表現如何」。透過事件研究分析 7 種買進行為模式的前瞻報酬，可讓投資人判斷哪種籌碼訊號最具跟進價值。

## What Changes

- 新增 Pipeline Step `BuyingPatternStep`，每日自動分類當天事件並補齊舊事件的前瞻報酬，寫入 `etf_buying_patterns` 表
- 新增 DB 表 `etf_buying_patterns`（含 migration），存放每筆事件的模式分類與 1~30 日前瞻報酬（jsonb）
- 新增前端頁面 `/investment/buying-patterns`，以折線圖、熱力圖、勝率圖呈現 7 種模式的統計結果

## Capabilities

### New Capabilities

- `etf-buying-pattern-classify`: 分類 7 種 ETF 買進行為模式（買量異常、追高買、只買一張、空窗後首買、連續強買、新建部位、低接買），並存入 etf_buying_patterns 表
- `etf-buying-pattern-forward-return`: 每日補齊 etf_buying_patterns 中舊事件的未來 1~30 日收盤報酬率，用 stock_prices_daily 計算
- `etf-buying-pattern-ui`: 前端 /investment/buying-patterns 頁面，展示 3 張圖表（折線圖、熱力圖、勝率圖）

### Modified Capabilities

(none)

## Impact

- Affected specs: etf-buying-pattern-classify, etf-buying-pattern-forward-return, etf-buying-pattern-ui
- Affected code:
  - New: ETF/pipeline/steps/buying_pattern_step.py
  - New: supabase/migrations/20260512000000_add_etf_buying_patterns.sql
  - New: src/app/investment/buying-patterns/page.tsx
  - New: src/app/investment/buying-patterns/BuyingPatternCharts.tsx
  - Modified: ETF/pipeline/orchestrator.py
