## Context

現有系統架構：
- ETF Pipeline 每日在 GitHub Actions 執行，各步驟繼承 `BaseStep`，結果寫入 Supabase 資料表
- `strategy_signals` 表已存放 5 種量化策略（`strategy_id, stock_id, date, score, is_selected`），前端透過 `getStrategySignals()` Server Action 讀取
- 自選股（`watch_list`）為投信監控的追蹤母體
- LINE 通知機制已在 `notify_step.py` 與 `lineService.ts` 實作，有 `etf_notification_log` 防重複

目前痛點：無法快速掌握持倉的投信動向、連續買超天數、全市場相對強度，也沒有 ETF × 投信交叉驗證機制。

## Goals / Non-Goals

**Goals:**

- Pipeline 每日自動計算投信買超多維度指標，寫入 `strategy_signals`
- 前端顯示自選股投信健康度面板（1/5/20 日累積、連續天數、佔成交比率、全市場排名）
- 建倉確認時（連續 3 天 + Top 10%）觸發 LINE 推播
- 交叉比對：同日同股 ETF 加碼 + 投信買超 → 機構共識標記

**Non-Goals:**

- 不修改現有 5 種量化策略的計算邏輯
- 不支援外資、自營商指標（本次僅投信）
- 不實作歷史回測介面
- 不新增資料庫 table（複用 `strategy_signals`）

## Decisions

### 投信指標計算方式

使用 FinLab `data.get('institutional_investors_trading_summary:投信買賣超股數')` 計算以下指標：

| 指標 | 計算方式 | 存放欄位 |
|------|---------|---------|
| 1日買超股數 | 當日值 | `metadata.fund_1d` |
| 5日累積買超 | `rolling(5).sum()` | `metadata.fund_5d` |
| 20日累積買超 | `rolling(20).sum()` | `metadata.fund_20d` |
| 連續買超天數 | 從今日往回計算連續正值天數 | `metadata.consec_days` |
| 佔成交量比率（5日）| `fund_5d / volume_5d` | `metadata.fund_ratio_5d` |
| 全市場排名百分位 | `fund_20d.rank(pct=True)` | `score`（0–100） |
| 是否建倉確認 | 連續 ≥ 3 天 AND score ≥ 90 | `is_selected` |

替代方案考量：另開新資料表 vs 複用 `strategy_signals`。選擇複用的理由：前端 `/investment/strategy` 頁面已有讀取架構，無需 migration，直接支援跨策略比較。

### ETF × 投信交叉驗證邏輯

在 `getFundMomentumSignals()` Server Action 中執行：
1. 查詢自選股當日 `strategy_signals`（strategy_id = `fund_momentum`）
2. 查詢同日同股的 `etf_diff_logs`（change_type IN `['BUY', 'IN']`）
3. 兩表 join 後，同日同股同時有投信買超（score ≥ 70）且 ETF 加碼者，標記 `etf_consensus: true`
4. 此計算在 Server Action 完成，不落資料庫，前端只收到已聚合結果

替代方案：在 Pipeline 步驟計算後落資料庫。排除理由：交叉查詢依賴 watch_list（使用者個人化），不適合在無 session 的 Pipeline 執行。

### FundMomentumStep 在 Pipeline 的定位

定位為**輔助步驟**，失敗不中斷 Pipeline（`except` 不 raise）。

執行順序：放在 `SyncOHLCVStep`（需要 volume 資料）之後、`NotifyStep` 之前。若 `is_selected = True` 的股票有新增，在 `NotifyStep` 順帶推播建倉確認通知。

### LINE 通知整合方式

不新增獨立通知步驟，改為在 `FundMomentumStep` 計算完成後，直接呼叫 `lineService` 推播。`etf_notification_log` 表以 `(date, 'fund_momentum', stock_id)` 為唯一鍵防重複推播。

## Risks / Trade-offs

- [FinLab 配額風險] 新增 `institutional_investors_trading_summary` 資料查詢，每日約增加 30–50 MB 配額消耗 → 監控 `data.get_role()` 配額使用量，必要時改為每週執行
- [score 語意衝突] 現有策略的 `score` 是 0/1 布林值，`fund_momentum` 改為 0–100 百分位 → 前端讀取時必須以 `strategy_id` 區分，不可混用 `score > 0.5` 之類的通用過濾條件
- [metadata 欄位] `strategy_signals.metadata` 為 JSONB，儲存多維度指標；查詢時需明確取出 `metadata->>'consec_days'` 等欄位，無法直接 ORDER BY

## Migration Plan

1. 部署 `FundMomentumStep` 到 Pipeline（不需 DB migration，複用現有 `strategy_signals` 表）
2. 首次執行會回填當日資料；如需歷史資料，手動執行 `--backfill-days 20` 參數（選做）
3. 前端頁面獨立路由，不影響現有 `/investment/strategy` 頁面
4. 回滾：停用 `FundMomentumStep`（從 orchestrator 移除），前端頁面顯示空狀態
