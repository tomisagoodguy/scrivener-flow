## 1. AI 報告模組參數化

- [ ] 1.1 修改 ETF/ai_report/fetcher.py：將模組層級 `ETF_CODE = "00981A"` 改為 `AiReportFetcher.__init__` 參數，預設 `"00981A"`
- [ ] 1.2 修改 ETF/ai_report/prompt_builder.py：將硬編碼 ETF 代碼 / 名稱改為參數，傳入 etf_code 動態產生標題
- [ ] 1.3 修改 ETF/ai_report/analyzer.py：確認是否有硬編碼，若有一併參數化
- [ ] 1.4 修改 ETF/ai_report/reporter.py：確認 LINE 訊息標頭是否需加入 etf_code

## 2. daily_ai_report.py 迴圈三支 ETF

- [ ] 2.1 重構 `daily_ai_report.py`：抽出 `run_report(etf_code: str)` 函式
- [ ] 2.2 主流程改為迴圈 `["00981A", "00980A", "00991A"]`，每支獨立 try/except，失敗繼續下一支

## 3. MultiEtfStep 加入 Diff 計算

- [ ] 3.1 在 `_save_holdings_snapshot()` 之後，新增 `_compute_diff()` 私有方法
- [ ] 3.2 `_compute_diff()` 從 etf_holdings_snapshot 取前日快照（處理重複執行同日的情況）
- [ ] 3.3 複用 `ETF/processors/diff_engine.compute_diff()` 計算異動
- [ ] 3.4 新增 `_save_diff_logs()` 方法，upsert 結果到 etf_diff_logs（conflict key: etf_code, stock_code, data_date）

## 4. MultiEtfStep 加入 LINE 通知

- [ ] 4.1 在每支 ETF 處理完成後呼叫 `ctx.notifier.notify_diffs(diff_logs, etf_code, snapshot_date)`
- [ ] 4.2 呼叫 `ctx.notifier.notify_completion(summary)`，summary 的 market_signals 帶空 dict
- [ ] 4.3 確認 `ctx.notifier` 在 MultiEtfStep 執行時已初始化（查看 PipelineContext）

## 5. 驗證

- [ ] 5.1 本地用 `uv run python ETF/main.py --dry-run` 確認主流程無 regression
- [ ] 5.2 手動觸發 GitHub Actions workflow_dispatch 執行完整流程
- [ ] 5.3 確認 LINE 收到三份 AI 報告與 00980A / 00991A 的完成摘要
