## 1. 前置確認

- [x] 1.1 確認市場別資料來源（design D4：股票池限上市櫃普通股）：以 `uv run --with "finlab>=2.0.17" python` 執行 `data.search` 找出 FinLab 證券分類資料集的實際名稱與「上市／上櫃」欄位與值。完成條件：把資料集名稱、欄位名、樣本值（例如 2330 → 上市、6488 → 上櫃）記在本 task 下方；查不到時記錄「market 一律為 null」並據此實作。
  - 結果（2026-10-23）：資料集 `security_categories`（`data.get("security_categories")`，非時間序列，欄位 `symbol`、`name`、`category`、`market`、`stock_id`）。`market` 值對應：`sii` → 上市、`otc` → 上櫃，其他（`etf`、`other_securities` 等）→ null。樣本：2330 → sii、3105 → otc、6488 → otc、0050 → etf。快取沒有此欄位，策略直接以 `data.get` 讀取（單次、資料量小）。

## 2. Python：快取與中繼資料介面（TDD）

- [x] 2.1 [P] Adjusted close in shared cache（design D3：還原價只用於訊號計算；快取新增 `adj_close`）：先在 `ETF/tests/test_fan_breakout_strategy.py` 寫測試「同一個 `StrategyDataCache` 存取兩次 `adj_close`，`finlab.data.get("etl:adj_close")` 只被呼叫一次」並確認失敗，再在 `ETF/strategies/shared_cache.py` 加上 cached property。驗證：該測試由紅轉綠。
- [x] 2.2 StrategySignalStep writes optional strategy metadata（design D2：`BaseStrategy` 新增選用的 `get_signal_metadata(cache)`，由 StrategySignalStep 寫入 `conditions`）：先在 `ETF/tests/test_strategy_signal_step.py` 加入三個測試（未覆寫的策略 `conditions` 為 null、有中繼資料時寫入 JSON、hook 丟例外時照常寫列且 `ctx.validation_warnings` 含策略 id）並確認失敗；再於 `BaseStrategy` 加預設回傳 None 的方法，並在 StrategySignalStep 組列時填入 `conditions`。驗證：`uv run pytest ETF/tests/test_strategy_signal_step.py` 全綠，既有測試不需修改。

## 3. Python：fan_breakout 策略（TDD）

- [x] 3.1 寫 `FanBreakoutStrategy` 的失敗測試（不呼叫 FinLab，用合成的 FinlabDataFrame 餵 cache stub）：涵蓋 Fan breakout selection conditions（spec 範例表三列）、營收條件失敗、歷史不足不報錯、Universe limited to listed common stocks（`0050`、`00981A`、`910861` 被排除）、Daily positions output（最後一列等於最新交易日、無候選時全 False）、Score equals divergence spread（110/95 → 0.1579）。驗證：`uv run pytest ETF/tests/test_fan_breakout_strategy.py` 這些案例全部失敗（ImportError 或斷言失敗）。
- [x] 3.2 在 `ETF/strategies/fan_breakout.py` 實作 `get_positions`（design D1：入選條件＝「當日均線發散」且「兩個營收條件皆成立」，不限首次；design D5：score＝spread），月營收依公告日 ffill 到日頻、不 reindex 到營收日；回傳 score 為 spread 的數值部位。驗證：3.1 的測試全綠。
- [x] 3.3 Signal metadata per selected stock：先寫測試（首次、10 日內再次、連續 3 日的 spec 範例、`recent_signal_dates` 只含近 120 個交易日且遞增、`market` 取自 1.1 的資料來源）並確認失敗，再實作 `get_signal_metadata`，重用 `get_positions` 存在實例上的中間結果。驗證：`uv run pytest ETF/tests/test_fan_breakout_strategy.py` 全綠。
- [x] 3.4 把 `FanBreakoutStrategy` 註冊進 `ETF/strategies/__init__.py` 的 `ALL_STRATEGIES`，`strategy_id = "fan_breakout"`、`description = "均線發散突破"`。驗證：`uv run pytest ETF/` 全綠、`uv run ruff check ETF/` 無錯、`uv run python ETF/main.py --dry-run` 正常結束。
- [x] 3.5 真實資料煙霧測試：寫一次性腳本（放 scratchpad，不進 repo）用真的 FinLab 資料跑 `get_positions` 與 `get_signal_metadata`，不寫 DB。完成條件：在本 task 下方記錄最新交易日的候選檔數、一檔的中繼資料 JSON，並確認候選檔數落在每日 0–30 檔的合理範圍；超出時回頭檢查條件實作。
  - 結果（2026-10-23）：最新交易日 2026-10-22 候選 5 檔（1815、3234、2603、1416、3010）；近 60 交易日每日 0–23 檔、平均 10.4 檔，落在合理範圍。metadata 檔數 = 候選檔數；範例 1815：`{"signal_type": "repeat", "consec_days": 11, "spread": 0.4349, "market": "上櫃", "recent_signal_dates": ["2026-10-07", …, "2026-10-22"]}`（11 個日期）。分布：repeat 4／first 1；上市 3／上櫃 2。

## 4. 前端：資料層（TDD）

- [x] 4.1 [P] 在 `src/lib/investment/fanBreakout.ts` 定義 `FanBreakoutRow`、`FanBreakoutResult` 型別與純函式：Performance since signal 計算（`computePerformance(prices, signalDate)`）、Client-side filters and pagination（`filterRows`、`paginate`，每頁 20、改篩選回第 1 頁由呼叫端處理）。先在 `src/lib/investment/__tests__/fanBreakout.test.ts` 寫 spec 範例（高低點表格 → 108/95/−0.03、訊號日缺價 → 全 null、45 筆 → 20/20/5、首次＋上櫃、連續 ≥ 3）並確認失敗，再實作。驗證：`yarn test --testPathPatterns fanBreakout` 綠燈。
- [x] 4.2 實作 server action `getFanBreakoutSignals()`（design D6：前端資料由單一 server action 提供，訊號後績效在 server 端計算）：讀近 30 天 `strategy_id = 'fan_breakout'` 的列與 `conditions`、`stock_basic_info` 名稱，批次查 `stock_prices_daily` 後以 4.1 的函式計算績效，依日期新到舊、score 大到小排序；`unstable_cache` key 為 `fan-breakout-signals-v1`。先寫 `src/app/actions/__tests__/getFanBreakoutSignals.test.ts`（正常回傳、無資料回空陣列無 error、查詢失敗回空陣列且 error 非空、`conditions` 為 null 的列欄位補 null）並確認失敗。驗證：`yarn test --testPathPatterns getFanBreakoutSignals` 綠燈。

## 5. 前端：圖表與頁面

- [x] 5.1 [P] StockChart optional moving averages and markers（design D7：`StockChart` 以選用 props 擴充）：新增 `maPeriods`、`markers` props，標記用 `createSeriesMarkers` 畫 `arrowUp`／`belowBar`，找不到對應 K 棒的標記略過。先寫測試（只傳 `data` 時畫 3 條均線且無標記、傳 5 個週期時畫 5 條、無對應 K 棒的標記不丟例外）並確認失敗。驗證：`yarn test --testPathPatterns StockChart` 綠燈。
- [x] 5.2 Screener page and data window 與 Stock navigation and chart（design D8：路由 `/investment/strategy/fan-breakout`）：新增 Server Component 頁面呼叫 `getFanBreakoutSignals()`，以及 client 元件 `FanBreakoutScreener`（篩選列、表格、分頁、上一檔／下一檔、左右方向鍵在非輸入框時切換、選取列下方顯示 `StockChart`，`maPeriods = [5, 10, 20, 60, 120]`、markers 來自 `recentSignalDates`）。報酬漲用 `text-rose-600`、跌用 `text-emerald-600`；績效欄位標註「以收盤價計，未還原」；頁面標示「候選清單，非投資建議」；外框用 `.glass-card`。先寫 `src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx`（空狀態、錯誤狀態、下一檔跨頁、篩選後回第 1 頁、紅漲綠跌 class）並確認失敗。驗證：`yarn test --testPathPatterns FanBreakoutScreener` 綠燈。
- [x] 5.3 前端 registry 與入口：在 `src/app/actions/strategyRegistry.ts` 加入 `fan_breakout` 的描述、`src/lib/investment/strategyUtils.ts` 的 `StrategyId` 加入 `fan_breakout`、`StrategyMonitorCard` 的 `STRATEGY_SHORT` 加縮寫「發散」，並在 `/investment/strategy` 頁加上前往候選頁的連結；不得加入 `QUANT_STRATEGY_IDS`。驗證：`yarn tsc --noEmit` 無錯，策略頁實跑可看到連結。

## 6. 整體驗證

- [x] 6.1 全面檢查：`yarn tsc --noEmit`、`yarn lint`、`yarn test --testPathPatterns "fanBreakout|getFanBreakoutSignals|FanBreakoutScreener|StockChart|getStrategySignals|StrategySignalCard"`、`uv run ruff check ETF/`、`uv run pytest ETF/` 全部通過，輸出貼在本 task 下方。
  - 結果（2026-10-23）：`yarn tsc --noEmit` 無錯；jest 7 suites／85 tests 全綠；`uv run ruff check`（改動檔）All checks passed；`uv run pytest ETF/` 385 passed、3 failed——3 個失敗（test_sync_equity_distribution ×2、test_sync_stock_financials ×1）已用 git stash 在改動前狀態重跑確認為既有失敗，與本 change 無關。`yarn lint` 全專案 2520 errors 為既有問題；只對本 change 的 19 個 src 檔跑 eslint：0 errors、1 個既有 warning（indicators.ts 的 calculateFieldSMA `any`）。
- [x] 6.2 實跑驗收（派 fresh agent 用 playwright-skill）：候選頁可篩選、分頁、切換個股，K 線有五條均線與 ▲ 標記，深色模式文字可讀；`/investment/stock/2330` 個股頁的 K 線仍只有 MA5/20/60、無標記。完成條件：附截圖路徑與逐項結果；DB 尚無 `fan_breakout` 資料時，至少確認空狀態畫面正確並註明待 pipeline 跑過後補驗。
  - 結果（2026-10-23，fresh agent 實跑 + 主對話看截圖）：策略頁「均線發散候選」連結可導到候選頁（5.3 通過）；候選頁無 console error、顯示免責說明與空狀態「近 30 天無均線發散候選」、無錯誤訊息；深色與淺色模式文字皆可讀；`/investment/stock/2330` K 線仍只有 MA5/20/60、無標記。DB 尚無 `fan_breakout` 資料，**有資料時的篩選列、表格、K 線 ▲ 標記待每日 pipeline 寫入後補驗**。非本 change 問題：390px 寬度的水平溢出來自共用 investment 導覽列（其他投資頁同樣 568px）。
