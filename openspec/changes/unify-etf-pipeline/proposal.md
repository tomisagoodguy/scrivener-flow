## Why

三支 ETF（00981A、00980A、00991A）同屬每日追蹤標的，但 00980A / 00991A 缺少
Diff 計算、LINE 通知與 AI 報告，造成功能不對等、每日收到的資訊僅來自 00981A。

## What Changes

- MultiEtfStep 擴充：為 00980A / 00991A 加入 Diff 計算（對比前日快照）
- NotifyStep 擴充：Diff 通知與完成摘要支援多 ETF
- daily_ai_report.py 改為迴圈執行三支 ETF，不再硬編碼 00981A
- ai_report/fetcher.py、prompt_builder.py 的 ETF_CODE 改為參數化

## Capabilities

### New Capabilities
- `multi-etf-diff`: 為次要 ETF 計算每日持股異動（IN/OUT/BUY/SELL）
- `multi-etf-notify`: 次要 ETF 的 LINE 異動通知與完成摘要
- `multi-etf-ai-report`: AI 每日報告支援三支 ETF，各自獨立產出

### Modified Capabilities
（無 spec-level 行為變更，只有實作擴充）

## Impact

- ETF/pipeline/steps/multi_etf_step.py
- ETF/pipeline/steps/notify_step.py
- ETF/daily_ai_report.py
- ETF/ai_report/fetcher.py
- ETF/ai_report/prompt_builder.py
- ETF/ai_report/analyzer.py（可能需參數化）
