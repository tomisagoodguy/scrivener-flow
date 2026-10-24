## Why

策略頁的「多策略共選」面板目前只列出「被 ≥2 支策略選中」的股票與一個數量 badge，使用者看不出是哪幾支策略選中、無法提高門檻聚焦高共識標的，也看不到「近幾天反覆被多策略點名」的股票。同時既有 spec 要求「同一日期」才算共選，但實作與 `strategy-signal-freshness` 規格都採「各策略取自身最新日期」——10 支策略中有 9 支對齊月營收揭露日、每月約 3 週停更，若硬性要求同日，面板大部分時間會是空的。規格與實作必須對齊，且面板要讓使用者看得到各策略的資料日期。

## What Changes

- 面板新增共選門檻切換（≥2 / ≥3 / ≥4），以 URL 參數保存，預設 ≥2。
- 每檔共選股顯示「哪幾支策略選中」的策略名稱 badge。
- 面板標示每支參與策略的資料日期，並修訂既有 spec 的共選口徑為「各策略取自身最新日期」。
- 新增「矩陣」檢視：列為共選股、欄為策略，格子標示該策略是否選中該股，欄標頭帶策略資料日期。
- 新增「近 N 天」模式（7 / 14 / 30 日曆天）：統計每檔股票在視窗內被多少支「不同策略」選中過，依此套用門檻。此模式需新增 `strategy_signals` 查詢的 Server Action。
- `StrategyEntry` 型別新增每策略資料日期欄位 `date`，`getStrategySignals` 快取 key 版本號遞增。
- 面板元件拆分以符合單一元件 ≤150 行限制。

## Capabilities

### New Capabilities

- `strategy-consensus-matrix`: 多策略共選的「股票 × 策略」矩陣檢視
- `strategy-consensus-history`: 近 N 天跨策略共選統計（不同策略數）與其 Server Action

### Modified Capabilities

- `strategy-multi-consensus-panel`: 共選日期口徑改為各策略自身最新日期；新增門檻切換、策略名稱 badge、各策略資料日期標示

## Impact

- Affected specs: `strategy-multi-consensus-panel`（modified）、`strategy-consensus-matrix`（new）、`strategy-consensus-history`（new）
- Affected code:
  - New:
    - src/app/actions/getStrategyConsensusHistory.ts
    - src/components/features/strategy/ConsensusControls.tsx
    - src/components/features/strategy/ConsensusStockChip.tsx
    - src/components/features/strategy/ConsensusMatrix.tsx
    - src/__tests__/components/ConsensusMatrix.test.tsx
    - src/__tests__/lib/buildConsensusHistory.test.ts
  - Modified:
    - src/lib/investment/strategyUtils.ts
    - src/lib/investment/strategyConsensusUtils.ts
    - src/app/actions/getStrategySignals.ts
    - src/app/investment/strategy/page.tsx
    - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
    - src/__tests__/lib/buildMultiConsensusStocks.test.ts
    - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
    - src/components/features/__tests__/StrategySignalCard.test.tsx
