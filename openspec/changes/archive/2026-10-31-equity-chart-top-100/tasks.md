## 1. 前端：圖表清單上限與按需載入

- [x] 1.1 `big`／`retail` 圖表清單改取排行前 100 列、`double` 仍最多 10 列，清單切換連結的數字隨之最多顯示 100：`src/lib/investment/equityChartUtils.ts` 的 `EQUITY_CHART_LIST_LIMIT` 改為 100（註解仍互指 Python `EQUITY_LIST_LIMIT`），`src/lib/investment/__tests__/equityChartUtils.test.ts` 的常數斷言改 100，並把「big 取 1–30」案例改為以 218 列資料斷言取 1–100、retail 272 列斷言取 1–100、12 列斷言全取。驗證：`yarn test --testPathPatterns equityChartUtils` 通過。（需求：Chart list selection；決策 1：圖表清單上限 100，雙訊號維持 10）
- [x] 1.2 圖表段落改為停留 300ms 才逐檔載入快照、Server 端不再查快照，且圖表列數 >30 時隱藏跳轉點、≤30 時顯示：`EquityChartViewer` 移除 `snapshots` prop，`renderSlide` 改渲染 `LazyBareKSlide`（code、name、`etfMap` 標籤），`ScrollChartViewer` 傳 `showJumpDots={rows.length <= 30}`；`src/app/investment/equity/page.tsx` 移除 `getStrategySnapshots` 呼叫與 `snapshots` 傳遞。更新 `src/components/features/investment/equity/__tests__/EquityChartViewer.test.tsx`：初始顯示 `lazy-bare-k-loading` 骨架、停留後以 mock 的 `getStrategySnapshots` 回傳渲染圖表與 ETF 標籤、無快照顯示佔位文字、跳轉點在 30 列顯示／31 列隱藏。驗證：`yarn test --testPathPatterns EquityChartViewer` 通過、`yarn tsc --noEmit` 無新錯、`yarn eslint` 改動檔無新錯。（需求：Scrollable bare-K charts for equity ranking stocks；決策 2：圖表快照改用 LazyBareKSlide 按需載入；決策 3：清單超過 30 檔時隱藏跳轉點）[after: 1.1]

## 2. Pipeline：籌碼排行同步名單

- [x] 2.1 `SyncBareKStep` 的籌碼排行名單改為一次查詢重現 1–4 週、不分級距、預設排序的三份清單（每週雙訊號前 10、主力買進前 100、散戶減少前 100），依週數→清單→名次串接去重，仍排在同步加碼股之後、選股池股之前：`ETF/pipeline/steps/sync_bare_k_step.py` 的 `EQUITY_LIST_LIMIT` 改 100、新增 `EQUITY_MAX_WEEKS = 4`（註解互指前端 `VALID_WEEKS`），改寫 `_fetch_equity_ranking_stocks` 的 SQL（只用 `CAST`、不用 `::`；失敗 `logger.error` 回空列表不 raise）。更新 `ETF/tests/test_sync_bare_k_step.py`：常數斷言（10／100／4）、單一 `conn.execute` 的查詢形狀與參數、spec 的串接順序 Example（回傳 `['2454', '6669', '2330', '3661', '3008']`）、失敗與無資料案例。驗證：`uv run pytest ETF/tests/test_sync_bare_k_step.py` 通過、`uv run ruff check ETF/pipeline/steps/sync_bare_k_step.py ETF/tests/test_sync_bare_k_step.py` 無錯。（需求：SyncBareKStep includes equity ranking stocks；決策 4：Pipeline 重現 1–4 週視角並各取前 100；決策 5：籌碼排行股維持在選股池股之前）
- [x] 2.2 新 SQL 在真實資料上的結果與前端排行一致：以 Supabase 唯讀 SQL 執行 `_fetch_equity_ranking_stocks` 的查詢，去重後檔數與 design 實測表「1–4 週合併」同量級（2026-10-31 實測 241），並抽查 `weeks=4` 主力買進第 1、50、100 名與 `/investment/equity?weeks=4` 表格同名次股票相同；把指令與數字寫進本任務下方備註。驗證：備註內有查詢結果檔數與抽查比對。[after: 2.1]
  - 實測備註（2026-10-31）：以 Supabase `execute_sql` 執行 `_fetch_equity_ranking_stocks` 的 SQL（參數代入 max_weeks=4、double_limit=10、list_limit=100）。使用的 5 個 snapshot_date 為 2026-10-22、10-16、10-08、10-02、09-24；入選列共 840 列，**去重後 241 檔**，與 design 實測表的「1–4 週合併」241 相同。抽查 weeks=4：SQL 主力買進第 1／50／100 名＝6278／1409／2610，散戶減少第 1／50／100 名＝6278／1102／5516；前端 `/investment/equity?view=chart&list=big|retail&weeks=4` 第 1／50／100 段標題相同（6278 台表科、1409 新纖、2610 華航；6278、1102 亞泥、5516），**全部一致**。
  - 測試範圍說明：spec 情境「Ranking matches the frontend N-week computation」與「Insufficient history skips missing weeks」是 SQL 在資料庫內的計算行為；pipeline 單元測試以 mock 連線為主、不接資料庫（SQLite 的 `CAST AS numeric` 整數除法語意與 Postgres 不同，無法忠實重現），因此改由本任務的 Supabase 真實資料比對佐證：使用 5 期日期、第 1／50／100 名與前端一致即證明 N 週算法相同；週數不足時 `dates` 少於 N+1 列，JOIN 自然無該週結果。

## 3. 整體驗收

- [x] 3.1 實跑 `/investment/equity?view=chart&list=big&weeks=4` 與 `list=retail&weeks=4`：清單連結數字顯示 100、首屏只有視窗內段落發出快照請求、已同步股票正常顯示圖表、跳轉點隱藏；`list=double` 跳轉點仍顯示。驗證：Playwright 腳本輸出（請求數、連結數字、跳轉點存在與否）寫進本任務下方備註。（需求：Chart list selection；需求：Scrollable bare-K charts for equity ranking stocks）[after: 1.2]
  - 實測備註（2026-10-31，對 localhost:3000 的 dev server 執行 `uv run --with playwright python -I equity_check.py`，Chrome，1440×900）：
    - `list=big&weeks=4`：清單連結「雙訊號（10）／主力買進（100）／散戶減少（100）」；段落 100 個；跳轉點 0 個；首屏 Server Action 請求 1 次，跳到第 50、100 檔後累計 3 次（只有停留的目的地請求，沿路沒有）。
    - `list=retail&weeks=4`：連結數字同上；段落 100 個；跳轉點 0 個；首屏 1 次，跳轉後累計 5 次。
    - `list=double&weeks=4`：段落 10 個；**跳轉點 1 個（有顯示）**；請求 1 次。
    - 已同步股票正常畫出圖表（每頁結束時都有 canvas：big 105、retail 70、double 35）。
