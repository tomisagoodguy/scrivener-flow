## 1. 前瞻報酬補值修正

- [x] 1.1 新增 `ETF/analysis/buying_pattern_stats.py`，提供 `HORIZONS`（10 個日曆天天期）、`forward_return`（目標日無價往後最多找 2 天）、`compute_missing_returns`（不覆蓋既有 key）、`due_missing_horizons`（`event_date + h <= today` 且缺值）。行為與現行 `BuyingPatternStep._compute_missing_returns` 口徑一致。驗證：`uv run pytest ETF/tests/test_buying_pattern_stats.py -k forward` 涵蓋週五事件以週一收盤補 `"1"`、往後 3 天都無價則不產生 key、既有 key 不被覆蓋。（需求：Ordinary-day baseline forward returns；決策：前瞻報酬計算收斂到單一純函式模組）
- [x] 1.2 `BuyingPatternStep._fill_forward_returns` 改為讀 35 天窗口、以 `due_missing_horizons` 篩出所有需補事件且不截斷，並以每批 ≤1000 筆、一次來回的 `UPDATE ... FROM (VALUES %s)` 做 jsonb `||` 合併；刪除步驟內舊的 `_compute_missing_returns` 與 `FILL_BATCH_SIZE` 截斷。驗證：新增測試以 1,500 筆假事件（300 筆最舊事件缺 `"20"`、價格齊）斷言 300 筆全部被選入並產生 `"20"`，且已齊全的事件不被選入；`uv run pytest ETF/tests/test_buying_pattern_stats.py -k fill` 綠燈。（需求：BuyingPatternStep auto-backfills incomplete future_returns；決策：補值選取先篩後補、不截斷）[after: 1.1]
- [x] 1.3 `backfill_future_returns.py` 改以 `id` 鍵集分頁（每頁 ≤1000）走完全表、10 個天期、改用共用 `compute_missing_returns` 與批次寫入；移除腳本自帶的 `STANDARD_HORIZONS` 與計算邏輯，並更新 `ETF/tests/test_backfill_future_returns.py` 的匯入與斷言。驗證：測試以 2,500 筆缺值事件（3 頁）斷言單次執行全部更新、重跑更新數為 0 並印出 `No records need backfill`；`uv run pytest ETF/tests/test_backfill_future_returns.py` 綠燈。（需求：Standalone backfill script exists；決策：回補腳本以 id 鍵集分頁走完全表）[after: 1.1]
- [x] 1.4 取得使用者同意後執行 `uv run python ETF/pipeline/steps/backfill_future_returns.py` 回補 production。驗證：SQL 實測 `event_date + 22 <= 執行日` 且事件日有收盤價的事件中，有 `"20"` key 比例 ≥ 95%；把指令輸出的更新筆數與 SQL 比例寫入本任務下方的實測紀錄。（需求：Standalone backfill script exists）[after: 1.3]
  - 實測紀錄（2026-11-01，使用者同意後執行）：`uv run python ETF/pipeline/steps/backfill_future_returns.py` 9.1 秒，輸出 `Updated future_returns for 3096 records`（7 頁）。
  - 原驗收比例：3,227 筆合格事件中 2,922 筆有 `"20"` = **90.55%，未達 95%**。查因：缺值的 305 筆在目標日～+2 天的 `stock_prices_daily` 列存在但 `close` 為 NULL（例：2330 於 2026-05-29～07-15 有 21 個交易日 NULL）。2026-05-01 起全表 48,424 / 242,876 列 `close` 為 NULL、分布於 123 個交易日，屬上游股價同步缺陷，不在本 change 範圍。
  - 修正後驗收（分母改為目標日～+2 天有非 NULL 收盤價的事件）：2,922 / 2,922 = **100%**，回補邏輯無遺漏。上游 NULL close 另開 change 處理。

## 2. 平常日基準與重抽統計

- [x] 2.1 在 `ETF/analysis/buying_pattern_stats.py` 新增 `build_baseline_samples`：輸入股票清單、期間與價格查表，對每個有收盤價的交易日以 `forward_return` 算 10 個天期，回傳每天期的（ISO 週, 報酬）樣本；不排除事件日。驗證：`uv run pytest ETF/tests/test_buying_pattern_stats.py -k baseline` 斷言 2330 在 2026-07-03 的 1 日基準報酬為 0.04、缺價起始日不產生樣本。（需求：Ordinary-day baseline forward returns；決策：平常日基準採「同一批股票、同期全部交易日」）[after: 1.1]
- [x] 2.2 新增 `bootstrap_excess`：依 ISO 週彙整模式與基準的筆數、勝數、報酬和，以同一組抽樣週配對重抽 5,000 次、固定種子 `20261101`、模式為 0 筆的重抽以 NaN 略過，回傳超額勝率與超額平均報酬的 2.5／97.5 百分位；事件 < 30 筆或 < 8 週時四個值回 `None`。驗證：`uv run pytest ETF/tests/test_buying_pattern_stats.py -k bootstrap` 涵蓋兩次結果相同、200 筆 +0.05 對基準 0 時下界 > 0、11 筆時回 `None`。（需求：Week-block bootstrap excess intervals；決策：信賴區間用週區塊配對重抽；決策：樣本不足不給區間）[after: 2.1]
- [x] 2.3 新增 migration `supabase/migrations/20261101120000_add_etf_buying_pattern_stats.sql`，建立 `etf_buying_pattern_stats`（PK `(pattern_type, horizon)`，欄位依 design 的資料形狀，RLS 開啟加公開讀取 policy）。須先向使用者確認後才套用到 production。驗證：套用後 `SELECT column_name FROM information_schema.columns WHERE table_name='etf_buying_pattern_stats'` 回 16 欄，anon client select 不被 RLS 擋。（需求：Daily stats table refresh；決策：統計結果預算存表、頁面只讀）
- [x] 2.4 `BuyingPatternStep` 補值後呼叫新的 `_refresh_stats`：讀事件與基準價格、組出每（模式, 天期）一列，單一交易內 `DELETE` 全表後 `INSERT`；任何例外只 `logger.error` 不 raise、不開交易；log 輸出 `baseline_n` 與耗時秒數。驗證：測試 mock 價格查詢丟例外時斷言不 raise 且未執行 DELETE；成功路徑斷言 6 模式 × 10 天期產生 60 列；`uv run pytest ETF/tests/test_buying_pattern_stats.py -k refresh` 綠燈；本地 `FORCE_RUN=true` 實跑一次並把 log 的 `baseline_n` 與耗時寫入本任務實測紀錄（耗時 > 60 秒則依 design 風險改為每週重算）。（需求：Daily stats table refresh；決策：統計結果預算存表、頁面只讀）[after: 1.2, 2.2, 2.3]
  - 實測紀錄（2026-11-01，對 production 直接呼叫 `BuyingPatternStep._refresh_stats`）：寫入 60 列，耗時 7.0 秒（< 60 秒，維持每日重算）；`baseline_n`（h=20）= 25,667（design 估計約 8 萬，差距來自 `stock_prices_daily` 約 20% 的 NULL close 與 20 日天期需到期）；期間 2026-05-04～2026-10-30。
  - 20 日結果：`window_break` 超額報酬區間 [-0.0289, -0.0111] → 顯著較差；其餘 5 個模式區間跨零。

## 3. 讀取與頁面

- [x] 3.1 `getBuyingPatternStats` 改讀 `etf_buying_pattern_stats`，回傳 `PatternStats`（保留 `patternType`、`n`、`avgReturns`、`winRates`，新增 `byHorizon`），匯出純函式 `classifyExcess` 與資料列轉換函式；查詢錯誤在 `unstable_cache` 內 throw、外層 catch 回 `[]`，cache key 改 `buying-pattern-stats-v2`。驗證：`yarn test --testPathPatterns getBuyingPatternStats` 涵蓋四種判定（(0.01,0.05)→better、(-0.04,-0.002)→worse、(-0.01,0.03)→indistinguishable、null→insufficient）與列轉換；`yarn tsc --noEmit` 無錯。（需求：Stats read with verdict；決策：判定以超額平均報酬區間為準）[after: 2.3]
- [x] 3.2 新增 `src/app/investment/buying-patterns/PatternBaselineTable.tsx`（≤150 行）並掛到 `page.tsx` 既有圖表下方：每模式列出 5／10／20 日的樣本數、勝率 vs 平常日、超額勝率區間、平均報酬 vs 平常日、超額報酬區間、判定徽章（較好＝`text-rose-600`、較差＝`text-emerald-600`、分不出高低與樣本不足＝灰），表下附方法說明（基準定義、週區塊重抽、`period_start`～`period_end`、跨零即分不出高低）；無統計資料時顯示「統計尚未計算」且圖表照常顯示。驗證：`yarn eslint` 兩檔無錯；`yarn dev` 後以 Playwright 開 `/investment/buying-patterns` 截圖確認表格與徽章顏色，結果寫入本任務實測紀錄。（需求：Baseline comparison table on buying-patterns page）[after: 3.1, 2.4]
  - 實測紀錄（2026-11-03，`yarn dev` port 3000 + headless Playwright 開 `/investment/buying-patterns`）：比較表 18 列（6 模式 × 5/10/20 日），判定與 `etf_buying_pattern_stats` 一致——較差：`window_break` 5/20 日、`dip_buy` 5 日、`volume_spike` 5 日；其餘 14 列分不出高低。截圖確認較差為 emerald、其他為灰；方法說明顯示期間 2026-05-04～2026-10-30。修正 `-0.0 pp` 顯示並加測試。`yarn test --testPathPatterns "PatternBaselineTable|getBuyingPatternStats"` 11 passed；eslint 0 錯。

## 4. 文件

- [x] 4.1 改寫 `ETF/CLAUDE.md`「買進模式回測統計」段：移除過時的 2026-02～04 數字表，改述統計來源為 `etf_buying_pattern_stats`（每日重算）、基準與週區塊重抽定義、判定規則，並在 Pipeline 步驟清單補上 `BuyingPatternStep` 會重算統計表。驗證：派 fresh agent read-back 確認段落與 design 的資料形狀、判定規則一致且無殘留舊數字。（需求：Daily stats table refresh）[after: 2.4]
  - 實測紀錄（2026-11-03）：fresh Explore agent read-back，A～F 六項全 PASS（口徑、基準與重抽常數、判定、表結構與重算方式皆與程式一致；舊 2026-02～04 數字已清除；無「前 30 天」「Server 端 reduce」殘留）。另同步更新 `.claude/rules/etf-pipeline.md`（步驟說明、前端讀取禁令）與 `.claude/rules/indexes.md` 路由說明。

## 驗證後修正（2026-11-03，/spectra-verify 的 3 個 Warning 與 1 個 Suggestion）

- 重抽改為只從有基準樣本的週抽，符合 design「信賴區間用週區塊配對重抽」；新增 `test_bootstrap_ignores_event_weeks_without_baseline`（修改前失敗、修改後通過）。
- 補 `_replace_stats` 交易行為測試：成功時依序 DELETE → INSERT → COMMIT，INSERT 失敗時 ROLLBACK 且不 COMMIT；突變檢查（移除 rollback 與 DELETE）兩個測試都失敗，還原後通過。
- 補 `main()` 有更新時印出 `Updated future_returns for 2500 records` 的測試。
- migration 的 `CREATE POLICY` 改為 `DO` 區塊先檢查 `pg_policies`，可重跑；已在 production 重跑，policy 仍只有 1 條、資料 60 列。
- 本次重跑紀錄：`uv run pytest ETF/tests/test_buying_pattern_stats.py ETF/tests/test_backfill_future_returns.py` 26 passed；`yarn test --testPathPatterns "PatternBaselineTable|getBuyingPatternStats"` 11 passed；`yarn tsc --noEmit` 0 錯；`yarn eslint` 改動檔 0 錯；production 統計重算 60 列、12.7 秒、`baseline_n`（h=20）= 25,424。

## 審查後修正（2026-11-03，/spectra-review 的 1 個 Warning 與 1 個 Suggestion）

- `/investment/buying-patterns` 由頁面層 `revalidate = 3600` 改為 `dynamic = 'force-dynamic'`，快取只交給 `unstable_cache`，查詢失敗的空頁面不再被整頁快取。驗證：`yarn tsc --noEmit` 0 錯、`yarn eslint src/app/investment/buying-patterns/` 0 錯、dev server 上 `curl /investment/buying-patterns` 回 200 且含比較表列 `baseline-row-window_break-20`。
- `backfill_future_returns.py` 被匯入時不再改動 `sys.path` 與 root logging（`sys.path.insert` 只在 `__main__` 執行、`basicConfig` 移入 `main()`）。新增 `test_import_does_not_touch_global_logging_or_sys_path`，對兩個保護分別做突變檢查都失敗、還原後通過；以腳本路徑直接執行仍可匯入 `ETF.analysis`。`uv run pytest ETF/tests/test_buying_pattern_stats.py ETF/tests/test_backfill_future_returns.py` 27 passed。
