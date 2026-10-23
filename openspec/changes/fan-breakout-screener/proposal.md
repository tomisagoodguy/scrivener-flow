## Why

外部參考頁（「狼群專用」均線發散突破）以「均線多頭發散」列出候選股供人工看圖，但其條件未公開。我們以 FinLab 回測自建版本並驗證：單純均線發散的 60 日超額僅 +2%、多數訊號失敗；疊加兩個月營收條件後，樣本內（2013–2020-09）挑出的組合在樣本外（2021 起）60 日超額 +7.2%、超額勝率 49%，14 年中 13 年為正。但組合回測在樣本外風險調整後未勝大盤（最大回撤 −44%），因此定位為**候選股篩選器**——由系統每日列出候選、使用者看圖後人工判斷，而非自動買賣訊號。

## What Changes

- 新增第 10 支量化策略 `fan_breakout`（均線發散突破），使用還原收盤價計算 MA5/10/20/60/120，並以兩個月營收條件過濾；每日輸出當日符合條件的股票。
- 策略為每支入選股輸出訊號中繼資料（首次／再次、連續天數、發散幅度、市場別、近期訊號日清單），由 StrategySignalStep 寫入 `strategy_signals.conditions`（JSONB）。為此 `BaseStrategy` 新增選用的中繼資料介面，既有 9 支策略不受影響（仍寫入 null）。
- `StrategyDataCache` 新增還原收盤價（`etl:adj_close`）。
- 新增「均線發散候選」頁：日期區間、首次／再次、連續天數、市場別篩選與分頁；選取個股後顯示 K 線、MA5/10/20/60/120、訊號日 ▲ 標記，以及訊號後至今報酬、期間最高、期間最低。
- `StockChart` 新增選用的均線週期與標記 props，未傳入時維持現有 MA5/20/60、無標記的行為。
- 前端策略 registry 加入 `fan_breakout` 的顯示名稱與縮寫。

## Capabilities

### New Capabilities

- `fan-breakout-strategy`: 均線發散突破策略的選股條件、營收過濾、訊號中繼資料計算，以及 StrategySignalStep 寫入中繼資料的契約
- `fan-breakout-screener-page`: 均線發散候選清單頁的篩選、分頁、個股切換、K 線與訊號後績效顯示

### Modified Capabilities

(none)

## Impact

- Affected specs: `fan-breakout-strategy`（新）、`fan-breakout-screener-page`（新）
- Affected code:
  - New:
    - ETF/strategies/fan_breakout.py
    - ETF/tests/test_fan_breakout_strategy.py
    - src/lib/investment/fanBreakout.ts
    - src/lib/investment/__tests__/fanBreakout.test.ts
    - src/app/actions/getFanBreakoutSignals.ts
    - src/app/actions/__tests__/getFanBreakoutSignals.test.ts
    - src/app/investment/strategy/fan-breakout/page.tsx
    - src/components/features/strategy/FanBreakoutScreener.tsx
    - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - Modified:
    - ETF/strategies/__init__.py
    - ETF/strategies/base_strategy.py
    - ETF/strategies/shared_cache.py
    - ETF/pipeline/steps/strategy_signal_step.py
    - ETF/tests/test_strategy_signal_step.py
    - src/app/actions/strategyRegistry.ts
    - src/lib/investment/strategyUtils.ts
    - src/components/features/strategy/StrategyMonitorCard.tsx
    - src/components/features/investment/StockChart.tsx
    - src/app/investment/strategy/page.tsx
  - Removed: (none)
- 資料庫：不改 schema；沿用 `strategy_signals.conditions`（JSONB）與 `stock_prices_daily`。
- FinLab 配額：每日多抓 `etl:adj_close`（約 35 MB，VIP 每日 5000 MB）。
