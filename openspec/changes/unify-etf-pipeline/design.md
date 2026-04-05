## Context

目前 pipeline 有兩條並行路徑：
1. **主流程**（00981A）：完整 9 步驟，含 Diff、Price、OHLCV、Notify、AI 報告
2. **MultiEtfStep**（00980A / 00991A）：僅持股快照 + weight history + AUM + 產業分布

三支 ETF 同為每日追蹤標的，功能應對等。

## Goals / Non-Goals

**Goals:**
- 00980A / 00991A 加入 Diff 計算（IN/OUT/BUY/SELL，對比前日 etf_holdings_snapshot）
- 00980A / 00991A 加入 LINE 通知（異動通知 + 完成摘要）
- daily_ai_report.py 迴圈三支 ETF，各自獨立產出 AI 報告
- ai_report/ 模組全面參數化（移除硬編碼 ETF_CODE）

**Non-Goals:**
- 不為 00980A / 00991A 加入 PriceAttachStep / SyncOHLCVStep（需確認 MoneyDJ scraper 有無股價欄位）
- 不改變通知格式或 Supabase schema

## Decisions

### 1. Diff 計算整合進 MultiEtfStep，不新增獨立 Step
**理由**：00980A / 00991A 的持股資料來自 MoneyDJ（不含技術指標），與 00981A 的主流程 context 不相容。在 MultiEtfStep 內，持股抓完後直接從 DB 取前日快照做 diff，邏輯自洽，不需改動 PipelineContext。

**替代方案**：新增 MultiEtfDiffStep — 需要在 context 中存放多 ETF 的 df，造成結構複雜化，捨棄。

### 2. 通知整合進 MultiEtfStep，複用 LineNotifier
**理由**：NotifyStep 依賴 `ctx.df` 與 `ctx.diff_logs`（00981A 專屬欄位）。次要 ETF 直接在 MultiEtfStep 內呼叫 `ctx.notifier.notify_diffs()` 與 `notify_completion()`，避免汙染主流程 context。

### 3. AI 報告：daily_ai_report.py 改為接受 etf_code 參數
**理由**：fetcher / prompt_builder / analyzer 只需將 `ETF_CODE = "00981A"` 改為函數參數，改動最小。外層 daily_ai_report.py 迴圈 `["00981A", "00980A", "00991A"]`。

## Risks / Trade-offs

- [MoneyDJ 持股欄位較少] → MultiEtfStep 的 diff 只比對 stock_code + weight，不含技術指標，notify_completion 的 market_signals 區塊留空
- [AI 報告執行時間增加 3x] → 三份報告序列執行，每份約 30-60 秒，總計約 2-3 分鐘，在 GitHub Actions 60 分鐘 timeout 內安全

## Migration Plan

1. 修改 ai_report/ 模組（參數化）
2. 修改 daily_ai_report.py（加迴圈）
3. 修改 MultiEtfStep（加 diff + notify）
4. 手動觸發 workflow_dispatch 驗證
