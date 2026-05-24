## 1. Pipeline：FundMomentumStep 核心計算

- [x] 1.1 [P] 建立 `ETF/pipeline/steps/fund_momentum_step.py`，繼承 `BaseStep`，實作 `run(ctx)` 方法；依「FundMomentumStep 在 Pipeline 的定位」設計為輔助步驟，取得 `institutional_investors_trading_summary:投信買賣超股數` 與 `price:成交股數` FinLab 資料
- [x] 1.2 [P] 依「投信指標計算方式」設計決策，實作 `fund_1d`、`fund_5d`（rolling 5 sum）、`fund_20d`（rolling 20 sum）、`consec_days`（從今日往回計算連續正值天數）、`fund_ratio_5d`（5日買超÷5日成交量）五項指標計算邏輯（daily fund momentum signal computation）
- [x] 1.3 [P] 實作 `score` 計算：`fund_20d.rank(pct=True) * 100`，取整數 0–100（strategy_signals score column semantics）
- [x] 1.4 實作 `is_selected` 判定：`consec_days >= 3 AND score >= 90`
- [x] 1.5 實作 upsert 邏輯，將計算結果寫入 `strategy_signals`，`strategy_id = 'fund_momentum'`，metadata 欄位含 `fund_1d/fund_5d/fund_20d/consec_days/fund_ratio_5d`（metadata storage in strategy_signals）
- [x] 1.6 實作輔助步驟錯誤隔離：`except Exception` 只 log 不 raise（step failure isolation）

## 2. Pipeline：建倉確認 LINE 通知

- [x] 2.1 在 `FundMomentumStep.run()` 末尾，查詢前一日同股 `is_selected`，找出新增的 `is_selected = True` 個股
- [x] 2.2 依「LINE 通知整合方式」決策，在 `FundMomentumStep` 內直接呼叫 `lineService` 推播建倉確認訊息，格式含股票代號、連續天數、全市場排名；以 `(date, 'fund_momentum', stock_id)` 為唯一鍵 upsert `etf_notification_log` 防重複（accumulation confirmation LINE notification）
- [x] 2.3 在 `ETF/pipeline/orchestrator.py` 將 `FundMomentumStep` 插入 `SyncOHLCVStep` 之後、`NotifyStep` 之前（step placement in pipeline orchestrator）

## 3. Server Action：投信 × ETF 交叉驗證

- [x] 3.1 [P] 建立 `src/app/actions/getFundMomentumSignals.ts`，接受 `stockCodes: string[]` 參數，查詢 `strategy_signals`（strategy_id = `fund_momentum`，最新日期）並解析 metadata 欄位
- [x] 3.2 在同一 Server Action 內查詢 `etf_diff_logs`（同日、同 stock_code、change_type IN BUY/IN），與 strategy_signals 做 join，標記 `etf_consensus: true/false`（ETF × fund cross-signal detection）
- [x] 3.3 回傳型別定義在 `src/types/index.ts`，含 `FundMomentumSignal`（fund_1d/fund_5d/fund_20d/consec_days/fund_ratio_5d/score/is_selected/etf_consensus）

## 4. 前端：`/investment/fund-tracker` 頁面

- [x] 4.1 [P] 建立 `src/app/investment/fund-tracker/page.tsx`（Server Component），讀取 `watch_list` 後呼叫 `getFundMomentumSignals()`，組合資料後傳入子元件（fund tracker page route）
- [x] 4.2 [P] 建立 `src/app/investment/fund-tracker/components/FundHealthTable.tsx`，實作可排序表格，欄位含：股票代號/名稱、1日買超（張）、5日累積（張）、20日累積（張）、連續天數、買超比率（%）、全市場排名、建倉確認 badge、ETF共識 badge（fund health table）
- [x] 4.3 實作 `FundHealthTable` 顏色規則：`consec_days >= 10` → `text-emerald-600`；1日買超 < 0 → `text-rose-600`（台股慣例：紅漲綠跌）；預設排序 score 降冪（colour coding / default sort order）
- [x] 4.4 [P] 建立 `src/app/investment/fund-tracker/components/AccumulationCycleCard.tsx`，顯示 `consec_days >= 3` 的個股卡片，無符合股票時顯示「目前無持倉進入建倉週期」（accumulation cycle detection card）
- [x] 4.5 [P] 建立 `src/app/investment/fund-tracker/components/EtfFundCrossSignal.tsx`，顯示 `etf_consensus = true` 的機構共識清單（ETF × fund cross-signal detection）
- [x] 4.6 在 `src/components/layout/SideNav.tsx`（或對應的投資區側欄元件）新增「投信追蹤」連結，指向 `/investment/fund-tracker`（navigation entry）

## 5. 型別與 strategy_signals 語意更新

- [x] 5.1 更新 `src/lib/investment/strategyUtils.ts`，新增 `'fund_momentum'` 到 strategy_id 型別聯合，並加入 `score` 語意說明 comment，提示 `fund_momentum` score 為 0–100 百分位（strategy_signals score column semantics）
- [x] 5.2 確認 `src/app/investment/strategy/page.tsx` 讀取 strategy_signals 時有以 `strategy_id` 區分，不會錯誤套用 `score > 0.5` 之類的通用過濾（front-end reads fund_momentum score）

## 6. 測試

- [x] 6.1 [P] 在 `ETF/tests/` 建立 `test_fund_momentum_step.py`，Mock FinLab 資料，驗證 score 計算、is_selected 判定、metadata 結構
- [x] 6.2 [P] 在 `src/__tests__/` 建立 `getFundMomentumSignals.test.ts`，Mock Supabase，驗證 ETF × 投信交叉驗證邏輯（etf_consensus flag）
