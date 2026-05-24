## Why

現有 5 種量化策略（`low_vol_alpha`、`low_vol_cap`、`broker_ranked`、`capital_layer`、`super8888`）皆偏向基本面與籌碼面選股，缺乏動能型態偵測能力。HTF（High Tight Flag）是 Qullamaggie 體系中最強力的動能型態——短期爆發性大漲後量縮整理、準備再次啟動——在現有架構中完全空白。

## What Changes

- 新增 `ETF/strategies/htf_momentum.py`：繼承 `BaseStrategy`，實作 HTF 型態偵測邏輯（旗桿高度、旗面收窄、量能萎縮、均線支撐四條件）
- 在 `ETF/strategies/__init__.py` 註冊新策略 `htf_momentum`
- 在 `src/lib/investment/strategyRegistry.ts` 新增 `strategy_id` → 描述對照
- 每日 CI 執行後結果寫入 `strategy_signals` 表（與現有策略同一機制）

## Capabilities

### New Capabilities
- `htf-momentum-strategy`：HTF 動能型態偵測策略，篩選近期爆發性大漲後進入旗面整理的強勢股，每日輸出選股信號至 `strategy_signals`

### Modified Capabilities
- `strategy-signal-compute`：新增一種策略 ID，現有 compute 流程（`strategy_signal_step.py`）透過 `__init__.py` 動態載入，不需修改步驟本身

## Impact

- **Python**：`ETF/strategies/htf_momentum.py`（新增）、`ETF/strategies/__init__.py`（新增策略註冊）
- **TypeScript**：`src/lib/investment/strategyRegistry.ts`（新增一行）
- **DB**：`strategy_signals` 表新增 `strategy_id = 'htf_momentum'` 資料，無 Schema 變更
- **CI**：`strategy_signal_step.py` 動態載入所有已註冊策略，自動涵蓋新策略，無需修改 Pipeline
