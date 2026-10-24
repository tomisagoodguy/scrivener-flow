## 1. 純函式（TDD：先寫失敗測試）

- [x] 1.1 [P] 在 src/__tests__/lib/momentumChartSlides.test.ts 先寫失敗測試，涵蓋 Accumulating ETF tags on momentum chart（320400→「00981A +320張」、1250000→「+1,250張」、499→「+0張」、維持 etfDetails 順序）、Momentum chart header summary（1.254→「3 家同步・權重 +1.25pp」、-0.5→「-0.50pp」、0→「+0.00pp」），以及 Accumulation date markers on momentum chart 的 computeAccumulationDates（只保留合計 > 0 的日期並升冪排序）。驗證：yarn test --testPathPatterns momentumChartSlides 顯示這些案例為紅燈。
- [x] 1.2 依「加碼 ETF 標籤與同步摘要的格式化放在純函式」，在 src/lib/investment/windowMomentumUtils.ts 實作 formatMomentumEtfTags、formatMomentumHeader、computeAccumulationDates。行為：輸出格式與 spec 的 Example 表完全一致。驗證：yarn test --testPathPatterns momentumChartSlides 全綠。

## 2. Server Action 資料形狀

- [x] 2.1 依「getWindowMomentum 回傳 accumulationDates 作為加碼日標記」，讓 WindowMomentumStock 新增 accumulationDates: string[]，由 computeAccumulationDates(agg.sharesByDate) 產生，並把 unstable_cache 鍵從 window-momentum-v1 升為 window-momentum-v2。行為：每支回傳股票都帶有升冪的加碼日陣列。驗證：在 src/__tests__/actions/getWindowMomentum.test.ts 補一個案例，斷言 aggregateWindowMomentum 的 sharesByDate 經 computeAccumulationDates 後只剩淨買超日；yarn test --testPathPatterns getWindowMomentum 全綠，且 yarn tsc --noEmit 無錯誤。

## 3. 前端圖表視角

- [x] 3.1 [P] 依「以 view 查詢參數切換卡片與圖表視角」，新增 Server Component src/app/investment/momentum/components/MomentumViewToggle.tsx（props：currentView、windowDays、minEtfCount）。行為：滿足 Momentum page view toggle：「圖表」連結帶 view=chart，「卡片」連結不帶 view，兩者都保留 window 與 min_count，目前視角高亮。驗證：yarn eslint 該檔無錯誤，並在 5.1 實跑時點擊切換。
- [x] 3.2 [P] 依「沿用 ScrollChartViewer 與 BareKSlideContent 組成 MomentumChartViewer」，新增 Client Component src/app/investment/momentum/components/MomentumChartViewer.tsx（props：stocks、snapshots、backHref；≤ 150 行）。行為：滿足 Momentum continuous scroll chart viewer：slide 的 strategies 放 formatMomentumEtfTags 的結果，markerDates 放 accumulationDates，renderHeaderExtra 顯示 formatMomentumHeader，缺快照時依「K 線資料缺口只補 pipeline 不做前端備援」只用既有 noSnapshotMessage 文案，不做前端備援圖。驗證：yarn tsc --noEmit 與 yarn eslint 該檔無錯誤。
- [x] 3.3 修改 src/app/investment/momentum/page.tsx：解析 view 參數（非 chart 一律視為卡片），在 header 加上 MomentumViewToggle；view=chart 時才呼叫 getStrategySnapshots(股票代號) 並渲染 MomentumChartViewer，backHref 依 Back navigation from momentum chart view 規則組成 /investment/momentum?window=X&min_count=Y；空清單在兩種視角都顯示相同的空狀態。行為：卡片視角不查快照，版面不變。驗證：yarn tsc --noEmit、yarn eslint src/app/investment/momentum 無新錯誤。

## 4. Pipeline 裸K同步名單（TDD）

- [x] 4.1 [P] 在 ETF/tests/test_sync_bare_k_step.py 先寫失敗測試：_momentum_window_start 的三列 Example（滿 4 筆、不足 4 筆、無資料）；SyncBareKStep includes strategy stocks 的合併順序（watch_list → 策略股 → 同步加碼股，去重後為 ['2330','2454','3017']）；超過 200 支時截斷並保留前段優先序；_fetch_momentum_stocks 在 engine 拋例外時回傳 [] 且不 raise。合併與截斷以 patch 三個 _fetch_* 方法與 BareKService 測試。驗證：uv run pytest ETF/tests/test_sync_bare_k_step.py 顯示紅燈。
- [x] 4.2 依「SyncBareKStep 納入同步加碼股並調高 MAX_STOCKS」與「窗口交易日以 ctx.date_str 加上 market_breadth_daily 前 N-1 日推算」，在 ETF/pipeline/steps/sync_bare_k_step.py 實作 SyncBareKStep includes window-momentum stocks：新增常數 MOMENTUM_WINDOW_DAYS = 5、MOMENTUM_MIN_ETF_COUNT = 2（註解指向 momentum/page.tsx 的 DEFAULT_WINDOW/DEFAULT_MIN_COUNT，page.tsx 也回加註解指向此檔），MAX_STOCKS 改為 200，新增 _momentum_window_start 與 _fetch_momentum_stocks（SQL：窗口內依 (stock_code, etf_code) SUM(diff_shares) > 0 計家數，≥ 2 入選，依家數、淨股數遞減排序；例外時 log error 回傳 []），並在 execute 中排在策略股之後合併。驗證：uv run pytest ETF/tests/test_sync_bare_k_step.py 全綠，uv run ruff check 這兩個檔無錯誤。
- [x] 4.3 量測加大名單後的執行成本：以本地腳本載入 BareKService.ensure_global_data 後，對 10 支股票呼叫 compute_snapshot 計時，推算 132 支與 200 支的總耗時，並與 .github/workflows 中 ETF 每日工作的 timeout-minutes 比較。驗證：在本 change 的 design.md「Risks / Trade-offs」補上實測數字；若推算總耗時超過剩餘 timeout 餘裕的一半，停下來問使用者，暫不上線。
- [x] 4.4 以 Supabase SQL 驗證 _fetch_momentum_stocks 名單與前端一致：把同一套查詢以 today = market_breadth_daily 最新日執行，對照 getWindowMomentum(5, 2) 的 stockCode 清單（可用相同 SQL 模擬前端聚合）。驗證：兩份清單集合相同，差異為 0；結果記在 tasks 完成備註。

## 5. 整體驗證

- [x] 5.1 實跑本地 dev server（yarn dev），以 headless Playwright 腳本開啟 /investment/momentum 與 /investment/momentum?view=chart&window=5&min_count=2 驗證：切換保留篩選、切換 MomentumFilter 後仍在圖表視角、六面板可捲動、標籤為「<ETF> +N張」、標題列摘要正確、K 線上有加碼日標記、返回連結回到同篩選的卡片視角、view=foo 顯示卡片；深淺色模式都截圖確認紅漲綠跌。驗證：截圖存在 .playwright-mcp/ 並逐項對照，驗完刪除截圖。
- [x] 5.2 執行 yarn tsc --noEmit、yarn test --testPathPatterns "momentumChartSlides|getWindowMomentum"、yarn eslint 改動檔、uv run pytest ETF/tests/test_sync_bare_k_step.py、uv run ruff check 改動的 Python 檔，並派 fresh agent 以 code-reviewer 審查 diff。驗證：所有指令通過，審查無 CRITICAL/HIGH 未解項目。
