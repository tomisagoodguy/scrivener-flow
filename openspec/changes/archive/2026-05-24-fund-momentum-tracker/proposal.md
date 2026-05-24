## Why

現有投資監控系統缺乏對「投信買超」這個長線主力指標的系統性追蹤。投信建倉週期長、黏性強，連續買超訊號比外資更具參考價值，但目前無法在系統內快速掌握持倉的投信動向與全市場相對強度。

## What Changes

- **新增** ETF Pipeline 輔助步驟 `FundMomentumStep`，每日計算全市場個股的投信買超多維度指標（1/5/20 日累積量、連續天數、佔成交比率、全市場排名），寫入 `strategy_signals`（strategy_id = `fund_momentum`）
- **新增** `/investment/fund-tracker` 頁面，顯示自選股的投信買超健康度面板、建倉週期偵測、ETF × 投信交叉驗證訊號
- **新增** 建倉確認時透過 LINE 推播通知（連續 3 天買超 + 20 日累積排名進入全市場 Top 10%）

## Capabilities

### New Capabilities

- `fund-momentum-signal`: ETF Pipeline 每日計算投信買超訊號並寫入 strategy_signals（1日/5日/20日累積、連續天數、佔成交比率、全市場排名百分位）
- `fund-tracker-page`: `/investment/fund-tracker` 獨立監控頁面，顯示持倉投信健康度面板與 ETF × 投信交叉驗證

### Modified Capabilities

- `strategy-signal-compute`: 新增 `fund_momentum` 作為第六種策略類型，`score` 欄位語意調整為 0–100 的買超強度百分位

## Impact

- Affected specs: `fund-momentum-signal`（新）、`fund-tracker-page`（新）、`strategy-signal-compute`（修改）
- Affected code:
  - New: `ETF/pipeline/steps/fund_momentum_step.py`
  - New: `src/app/investment/fund-tracker/page.tsx`
  - New: `src/app/investment/fund-tracker/components/FundHealthTable.tsx`
  - New: `src/app/investment/fund-tracker/components/AccumulationCycleCard.tsx`
  - New: `src/app/investment/fund-tracker/components/EtfFundCrossSignal.tsx`
  - New: `src/app/actions/getFundMomentumSignals.ts`
  - Modified: `ETF/pipeline/orchestrator.py`
  - Modified: `src/lib/investment/strategyUtils.ts`
  - Modified: `src/app/investment/strategy/page.tsx`
