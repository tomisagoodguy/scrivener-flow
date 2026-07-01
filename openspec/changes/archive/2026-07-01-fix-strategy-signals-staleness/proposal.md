## Problem

策略選股頁（`/investment/strategy`）在雲端只顯示 `fund_momentum` 一支策略，`StrategySignalStep` 產生的 9 支現役策略（`super8888`、`super888`、`capital_layer`、`broker_ranked`、`low_vol_alpha`、`low_vol_cap`、`htf_gvi`、`trend_template`、`fundamental_momentum`）全部消失。使用者的「月營收策略」（`fundamental_momentum`）看不到。

Production `strategy_signals` 現況：`fund_momentum` 每日更新（最新 2026-06-30），其餘 9 支全部停在 2026-06-10，過去 30 天保留期內各只有 1 個日期。

## Root Cause

兩層問題疊加：

1. **後端停更（根因）**：`StrategySignalStep` 的 9 支策略需要重量級 FinLab 資料（集保 `inventory`、全市場 `broker_transactions`、多張財報），雲端每日 FinLab 配額在跑到該步驟前多已耗盡，觸發 `finlab-quota-guard` 的配額攔截而整步 skip、不寫入。`FundMomentumStep` 只抓 2 個輕量表（投信買賣超、成交股數），故仍每日更新。目前的告警只在「當次執行且全空」時發出，無法區分「單日 skip」與「連續數週停更」，管理員因此未察覺已停更 3 週。

2. **前端視窗放大症狀**：`getStrategySignals()` 未指定日期時，近期視窗以 `strategy_signals` 全域最新日期（`maxDate`）為錨、往前 14 天。`fund_momentum` 每日把 `maxDate` 推到 2026-06-30，視窗起點變成 2026-06-16，於是所有停在 2026-06-10 的策略全部落在視窗外被過濾掉。此視窗寬度（14 天）也短於 DB 保留期（30 天），且以全域最新為錨的設計會讓更新較慢的策略被更新較快的策略擠出視窗——即使那些策略的資料仍在 DB 保留期內。既有 strategy-signal-freshness spec 文字寫「自當日往前」，與實際程式（以 `maxDate` 為錨）不符。

## Proposed Solution

1. **前端視窗改以當日為錨、對齊保留期**：`getStrategySignals()` 未指定日期時，近期視窗改以「當日（server 今天）」為錨、往前對齊 DB 保留期（30 天）的固定日曆天數常數，取窗內所有 `is_selected` 訊號後依 `strategy_id` 各取自身最新日期。如此只要某策略在 30 天保留期內有訊號就會顯示，不會因其他策略更新較快而被擠出。顯式傳入 `date` 維持精確比對。

2. **後端新增停更升級告警**：`StrategySignalStep` 執行後，若 `StrategySignalStep` 系列策略（即 `ALL_STRATEGIES` 的 `strategy_id`，排除 `fund_momentum`）在 `strategy_signals` 的最新成功寫入日期距當日超過門檻（3 個日曆天）——不論本次是配額 skip、例外或全空——SHALL 於 `ctx.validation_warnings` 加入一筆指明「策略訊號已停更 N 天」與最後成功日期的繁體中文告警，透過既有 LINE 通知管道通知管理員，使停更成為可見、可行動的事件。

## Non-Goals

- 不提升 FinLab 配額層級（VIP）、不改變 CI 排程或為策略拆分獨立配額——消除配額耗盡本身不在此範圍。
- 不調整 pipeline 步驟順序。
- 不修改任何個別策略的選股邏輯（如 `fundamental_momentum` 的 7 條件）。
- 不改動 `strategy_signals` 的 30 天保留期設定。

## Success Criteria

- 當 `fund_momentum` 最新日期為當日、其餘策略最新日期在 30 天保留期內但早於 14 天前時，`getStrategySignals()`（未指定 date）回傳的 `strategies` 仍包含那些較舊策略，各自呈現其最新日期的入選股票；策略頁不再只顯示 `fund_momentum`。
- 顯式 `getStrategySignals(date)` 行為不變。
- 當 `StrategySignalStep` 系列策略最後成功寫入日期距當日超過 3 天時，`ctx.validation_warnings` 出現指明停更天數與最後日期的告警字串；未超過門檻或當次有正常寫入時不出現該告警。
- 既有 `getStrategySignals` 與 `StrategySignalStep` 測試維持通過；新增涵蓋上述兩種行為的測試。

## Impact

- Affected specs:
  - strategy-signal-freshness（MODIFIED：視窗錨點與寬度）
  - finlab-quota-guard（ADDED：策略訊號停更升級告警）
- Affected code:
  - Modified:
    - src/app/actions/getStrategySignals.ts
    - ETF/pipeline/steps/strategy_signal_step.py
  - New:
    - (none)
  - Removed:
    - (none)

