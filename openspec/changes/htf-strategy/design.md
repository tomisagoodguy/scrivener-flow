## Context

現有 5 種策略（super8888、capital_layer、broker_ranked、low_vol_alpha、low_vol_cap）全部繼承 `BaseStrategy`，透過 `strategy_signal_step.py` 動態載入並寫入 `strategy_signals` 表。新策略只需在 `__init__.py` 的 `ALL_STRATEGIES` 清單中加入實例，Pipeline 不需任何修改。

HTF（High Tight Flag）型態的核心假設：短期爆發性大漲（旗桿）→ 量縮橫盤整理（旗面）→ 再次突破啟動。量化時拆成四個獨立條件聯集篩選。

## Goals / Non-Goals

**Goals:**
- 新增 `htf_momentum` 策略，偵測旗桿夠高、旗面收窄、量能萎縮、均線支撐四條件同時成立的標的
- 每日 CI 自動執行並寫入 `strategy_signals`
- 前端 `/investment/strategy` 頁面自動顯示（StrategyId 型別新增一項）

**Non-Goals:**
- 不實作進出場訊號或停損機制（只偵測型態，不模擬交易）
- 不做 VectorBT 歷史回測（可後續另立 change）
- 不修改 DB Schema

## Decisions

### 旗桿條件：近 N 日漲幅
- **決定**：取 `close / close.shift(20) - 1 > 0.30`（20 交易日漲逾 30%）
- **理由**：Qullamaggie 原文要求「前期漲幅 30% 以上」；20 日（約一個月）兼顧短線爆發與整理期
- **備選**：15 日（太短，易誤觸非爆發性走勢）、30 日（太長，整理已完成的機率高）

### 旗面條件：近期波幅收窄
- **決定**：`std(close.pct_change, 10) < std(close.pct_change, 20) × 0.70`
- **理由**：10 日波幅 / 20 日波幅 < 0.70 代表整理已明顯收斂；0.70 係數比對歷史台股 HTF 案例（南亞科）推估
- **備選**：用 ATR 取代 std（FinLab `indicator('ATR')` 可用，但和其他策略風格不一致，維持 rolling std）

### 量能萎縮條件
- **決定**：`vol.rolling(10).mean() < vol.rolling(20).mean() × 0.80`
- **理由**：10 日均量 < 20 日均量 80% 代表整理期成交意願降低，與 HTF 旗面特徵吻合

### 均線支撐條件
- **決定**：`close > close.rolling(20).mean()`（收盤在 MA20 以上）
- **理由**：最基本的趨勢確認，避免選到跌破支撐的假旗型

### 流動性門檻
- **決定**：`amt > 3 × 10^7`（每日成交金額 > 3000 萬）
- **理由**：比 low_vol_alpha（1500 萬）略高，HTF 標的通常是已爆量拉升的中型股；過低會選到無法出場的小票

### 最終選股數量
- **決定**：`is_largest(15)` 依旗桿漲幅排名取前 15 名
- **理由**：HTF 是「強中選強」，旗桿越高的標的市場認可度越高；取 15 名提供足夠覆蓋但不稀釋強度
- **備選**：直接回傳全部命中（可能每日 50～100 筆，前端難以消化）

### 資料 universe
- **決定**：`data.universe('TSE_OTC')`（與 low_vol_alpha / low_vol_cap 相同）
- **理由**：涵蓋上市上櫃全市場，與其他策略保持一致

### Score 語意
- **決定**：0/1 布林等效（與 super8888 等相同），`is_largest(15)` 回傳 boolean DataFrame
- **理由**：HTF 是型態選股，不是強弱排名；前端 `strategyUtils.ts` 統一以 `score > 0` 判斷是否入選

## Risks / Trade-offs

- **假突破多**：台股 HTF 假突破率高於美股，純技術條件可能雜訊較多 → 後續可考慮加入「旗面突破量能確認」作為第二版強化
- **旗面 10 日窗口過短**：部分慢整理標的在 10 日內波幅仍高 → 可於未來將旗面條件改為動態（e.g. Bollinger Band 收窄）
- **FinLab 配額消耗**：使用 `data.universe('TSE_OTC')` 拉取全市場資料，與現有兩個 low_vol 策略結構相同，對配額的邊際影響小（相同資料集已快取）

## Migration Plan

1. 新增 `htf_momentum.py`（不影響現有策略）
2. 在 `__init__.py` append `HtfMomentumStrategy()` → 下次 CI 執行自動生效
3. 在 `strategyRegistry.ts` 新增一行 → 前端自動渲染
4. 不需 DB migration，不需 rollback 計畫（只寫新 `strategy_id` 的資料，不影響現有）
