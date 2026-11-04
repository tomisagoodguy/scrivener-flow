## 1. 統計純函式

- [x] 1.1 匯出 FinLab 對帳 fixture `ETF/tests/fixtures/margin_regime_20080101_20261102.csv`（date, margin, close, low），並在 `ETF/analysis/margin_regime.py` 實作 `compute_margin_frame`（一年新高、近高點、跌一成、60 日報酬；不滿 250 日為 NaN）。驗證：`uv run pytest ETF/tests/test_margin_regime.py -k frame` 涵蓋一年新高與跌一成判定、不滿 250 日不判定。（需求：Daily margin regime record；決策：統計口徑沿用研究腳本）
- [x] 1.2 實作 `compute_margin_stats`：三組 n／跌一成比例／60 日平均報酬、兩組差距以 `bootstrap_excess`（月份區塊）算區間、影子比例；`bootstrap_excess` docstring 改為通用區塊鍵。驗證：fixture 對帳 588 天 13.8%、平常 20.1%、指數創高但融資沒創高 196 天 10.2%、影子 93.5% vs 40.0%（±0.5 pp）；`uv run pytest ETF/tests/test_margin_regime.py ETF/tests/test_buying_pattern_stats.py` 綠燈。（需求：Historical drawdown statistics by margin state；決策：區塊重抽共用 bootstrap_excess）[after: 1.1]

## 2. Pipeline 與資料表

- [x] 2.1 新增 migration `supabase/migrations/20261103120000_add_market_margin_regime_daily.sql`（PK date、RLS 公開讀取、policy 可重跑），經使用者同意後套用。驗證：production 查欄位與 policy。（需求：Daily margin regime record；決策：今日狀態與統計分開）
- [x] 2.2 新增 `MarginRegimeStep`（`build_margin_record` + upsert，失敗只 log），在 orchestrator 註冊於 `TaiexMa60RegimeStep` 之後。驗證：測試 mock FinLab 例外時不 raise 且不寫入、成功時寫一列；本機實跑寫入 production 一列，耗時寫入實測紀錄。（需求：Daily margin regime record；決策：今日狀態與統計分開）[after: 1.2, 2.1]
  - 實測紀錄（2026-11-03，migration 經使用者同意套用；production 6 欄、RLS 開、policy 1 條）：本機呼叫 `MarginRegimeStep.execute` 2.5 秒，寫入 2026-11-02 一列：融資 8,271.11 億、未創一年新高、指數未在近高點；stats 融資創高 588 天 13.78%、平常 4,561 天 20.08%、指數創高但融資沒創高 196 天 10.20%，`margin_high_vs_all` [-13.57, +1.53] pp，影子 93.5% vs 40.0%，樣本 2008-01-04～2026-08-03。

## 3. 前端

- [x] 3.1 新增 `src/lib/investment/marginRegime.ts`（型別、`describeDiff`）與 `getMarginRegime`（快取內 throw、外層回 null）。驗證：`yarn test --testPathPatterns marginRegime` 涵蓋 spec「Interval semantics」四種情況；`yarn tsc --noEmit` 0 錯。（需求：Historical drawdown statistics by margin state；決策：今日狀態與統計分開）[after: 2.1]
- [x] 3.2 新增 `MarginRegimeCard` 並掛在市場籌碼頁融資圖下方。驗證：元件測試涵蓋 spec「Margin high with indistinguishable risk」與「No data」，並斷言不含 rose／emerald class；eslint 0 錯；頁面實跑結果寫入實測紀錄。（需求：Margin regime card on market chips page；決策：卡片放在融資圖下方、只用中性配色）[after: 3.1, 2.2]
  - 實測紀錄（2026-11-03）：`yarn test --testPathPatterns "MarginRegimeCard|lib/investment/__tests__/marginRegime"` 10 passed；`describeDiff` 突變檢查（`lo > 0` 改永真）2 個測試失敗、還原後通過；`yarn tsc --noEmit` 0 錯；eslint 改動檔 0 錯。dev server `curl /investment/market-chips` 回 200，卡片顯示「未創一年新高」、融資 8,271 億、結論句「分不出高低」、樣本 2008-01-04～2026-08-03。

## 4. 文件

- [x] 4.1 `ETF/CLAUDE.md` 市場籌碼資料線補 `market_margin_regime_daily` 與口徑摘要。驗證：fresh agent read-back。（需求：Daily margin regime record）[after: 3.2]
  - 實測紀錄（2026-11-03）：fresh agent read-back A～D 全 PASS（口徑常數、表名與步驟位置、數字可追溯、卡片無紅綠與 margin_position）；依其指出的遺漏補上 ETF/CLAUDE.md 步驟流程、輔助步驟清單、資料表清單三處。
  - `margin_position` 不上頁面的依據（研究腳本以 fixture 同期資料重算，排除 2009 前 rate 無法計算的日子）：long=10 成立 15.1% vs 不成立 20.0% [-8.0, +0.5] pp；long=20 15.1% vs 20.3% [-8.0, +2.6]；long=30 13.8% vs 21.9% [-12.1, +0.4]；long=60 14.1% vs 22.0% [-12.9, +4.7]，四者皆跨零。

## 驗證後修正（2026-11-03，/spectra-verify 的 3 個 Warning 與 1 個建議）

- spec 補上未創高時顯示灰色「未創一年新高」與區間為 null 時的「樣本不足」句；卡片實作樣本不足句並加測試（修改前失敗、修改後通過），修正不符的測試名稱。
- 新增 `src/app/actions/__tests__/getMarginRegime.test.ts`：最新一列、空表回 null、查詢失敗回 null；突變（catch 改 throw）時失敗、還原後通過。
- 新增 `test_upsert_overwrites_same_date` 斷言 SQL 含 `ON CONFLICT (date) DO UPDATE`；突變（改 DO NOTHING）時失敗、還原後通過。
- 重跑：`yarn test --testPathPatterns "MarginRegimeCard|getMarginRegime|lib/investment/__tests__/marginRegime"` 14 passed；`uv run pytest ETF/tests/test_margin_regime.py` 12 passed；`yarn tsc --noEmit` 0 錯；eslint 0 錯；`spectra validate` valid。

## 審查後修正（2026-11-03，/spectra-review 的 1 個 Warning）

- 指數已有當天、融資尚未公布（或任一市場空白）時不寫入：`_fetch_series` 改回傳原始融資（`sum(min_count=2)`，不先 ffill），歷史統計才 ffill；`execute` 檢查寫入日原始融資為 NaN 時 warning 並跳過。新增 `test_step_skips_write_when_margin_not_published`（修改前失敗、修改後通過）；`uv run pytest ETF/tests/test_margin_regime.py` 13 passed。
- production 重跑：2.6 秒，2026-11-02 仍為 1 列（同日 upsert 覆寫），融資創高 588 天 13.78%、平常 20.08%，與修改前一致。
