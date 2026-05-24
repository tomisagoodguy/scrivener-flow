## 1. Python 策略實作

- [x] 1.1 新增 `ETF/strategies/htf_momentum.py`，實作 `HtfMomentumStrategy`（繼承 `BaseStrategy`，`strategy_id = "htf_momentum"`）
- [x] 1.2 在 `_build_position()` 中實作四條件選股：旗桿（20日漲幅>30%）、旗面收窄（10日std < 20日std × 0.70）、量能萎縮（10日均量 < 20日均量 × 0.80）、均線支撐（close > MA20）
- [x] 1.3 加入流動性過濾（成交金額 > 3000 萬）
- [x] 1.4 依旗桿漲幅取前 15 名（`is_largest(15)`），回傳 Boolean FinlabDataFrame

## 2. 策略註冊

- [x] 2.1 在 `ETF/strategies/__init__.py` import `HtfMomentumStrategy` 並 append 至 `ALL_STRATEGIES`

## 3. 前端型別更新

- [x] 3.1 在 `src/lib/investment/strategyUtils.ts` 的 `StrategyId` union 新增 `'htf_momentum'`
- [x] 3.2 確認前端 TypeScript build 無錯誤（`yarn build` 或 `yarn tsc --noEmit`）

## 4. 驗證

- [x] 4.1 本地執行 `uv run --with "finlab>=1.5.9" python -c "from ETF.strategies.htf_momentum import HtfMomentumStrategy; s = HtfMomentumStrategy(); print(s.strategy_id, s.description)"` 確認類別正常載入
- [x] 4.2 確認 `ETF/strategies/__init__.py` 的 `ALL_STRATEGIES` 長度由 5 增加為 6
