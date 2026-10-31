## 1. 視角解析與切換列元件

- [x] 1.1 在 `src/lib/investment/strategyUtils.ts` 新增 `StrategyView` 型別與 `parseStrategyView(view?: string)`：`monitor`／`chart`／`trades` 回傳同名值，缺值或其他值回傳 `'strategy'`。驗證：`src/lib/investment/__tests__/strategyUtils.test.ts` 以 spec「View parsing」表格五列參數化斷言，`yarn test --testPathPatterns strategyUtils` 綠燈。（需求：Trades view tab in strategy page toggle；決策：視角解析集中為 parseStrategyView）
- [x] 1.2 [after: 1.1] 新增 `src/components/features/strategy/StrategyViewTabs.tsx`（props `{ active: StrategyView }`，≤150 行，沿用現有切換列 class 字串）：依序渲染策略視角、監控清單、圖表、均線發散候選、換股後表現五個連結，目前視角高亮，均線發散候選永不高亮。驗證：新增 `src/components/features/strategy/__tests__/StrategyViewTabs.test.tsx`，斷言五個連結的文字順序與 href、`active='trades'` 時只有換股後表現帶高亮 class、`active='strategy'` 時只有策略視角高亮，`yarn test --testPathPatterns StrategyViewTabs` 綠燈。（需求：Trades view tab in strategy page toggle；決策：切換列抽成 StrategyViewTabs 元件）

## 2. 頁面整合

- [x] 2.1 [after: 1.2] `src/app/investment/strategy/page.tsx` 改用 `parseStrategyView` 與 `StrategyViewTabs`；trades 視角只渲染「換股後表現」面板（標題列、切換列保留），只查 `getStrategySignals()` 與 `getStrategyTradePerformance()`，標題日期為 `result?.date ?? tradePerformance.asOf`，且不套用「尚無策略訊號資料」提早返回；策略視角移除「換股後表現」面板且不再查詢其資料；監控清單、圖表、共選圖表模式行為不變。驗證：`yarn tsc --noEmit` 與改動檔 `yarn eslint` 無錯誤；本地 `yarn dev` 以 Playwright 確認 `?view=trades` 有面板、無共選面板與策略卡片，`/investment/strategy` 有共選面板與策略卡片、無面板，切換列五個分頁順序正確；把指令與結果寫回本任務下方。（需求：Trade performance panel placement and strategy switch、Trades view data loading；決策：以 view=trades 作為主視角值，而非獨立路由、trades 視角只查詢策略訊號與換股後表現）
  - 實測（2026-10-31）：`yarn tsc --noEmit` 無輸出（0 錯誤）；`yarn eslint` 五個改動檔 exit 0。本地 dev（localhost:3000）以 `uv run --with playwright python -I check_trades_tab.py` 逐頁檢查頂部切換列與內容：
    - `?view=trades`：五分頁順序/連結正確，僅「換股後表現」高亮；換股後表現面板存在；無共選面板；策略卡片 0；標題「資料日期：2026-10-30」。
    - `/investment/strategy`：僅「策略視角」高亮；共選面板存在；策略卡片 10；無換股後表現面板。
    - `?view=foo`：同策略視角（「策略視角」高亮、卡片 10、無面板）。
    - `?view=monitor`：僅「監控清單」高亮；無面板、無共選面板。
  - 驗證後補強（verify Warning 1）：標題日期推導抽成 `resolveStrategyTitleDate`（`strategyUtils.ts`），`strategyUtils.test.ts` 以 spec「No strategy signals in trades view」數值斷言（訊號 null、asOf 2026-10-30、trades → 2026-10-30；皆無 → —）。改完後 `yarn tsc --noEmit` 通過、改動檔 eslint 通過、`yarn test --testPathPatterns "strategyUtils|StrategyViewTabs|StrategyTradePerformancePanel"` 38/38 通過；同一 Playwright 腳本重跑，四個網址結果與上列完全一致。
