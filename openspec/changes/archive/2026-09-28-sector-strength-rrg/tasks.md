## 1. 資料庫 Migration

- [x] 1.1 實作需求「DB Schema - sector_strength RRG 欄位」（design.md「DB Schema」決策）：新增 `supabase/migrations/20260928000000_add_sector_rrg_columns.sql`，對 `sector_strength` 表 `ADD COLUMN IF NOT EXISTS rs_ratio NUMERIC(8,4)`、`rs_momentum NUMERIC(8,4)`、`rrg_quadrant TEXT`；驗證：本機用 `psql` 或 Supabase SQL editor 對測試庫重複執行兩次皆不報錯（冪等）

## 2. RRG 計算純函式（TDD：先寫測試）

- [x] 2.1 在 `ETF/tests/test_sector_rrg_step.py` 寫測試，針對「RS-Ratio/RS-Momentum 計算」給固定的 `close` 序列（族群平均價）與 `taiex` 序列（含 >=14 筆與 <14 筆兩種長度），斷言 EMA(14)/EMA(10) 計算結果與 `min_periods` 未滿足時回傳 NaN；此時測試應為 RED（`sector_rrg_step.py` 尚未存在）
- [x] 2.2 [P] 實作需求「四象限分類邏輯」：在同測試檔新增「四象限分類」測試案例，涵蓋 design.md 的邊界值表（`rs_ratio=1.05,momentum=0.002→leading`、`1.02,-0.001→weakening`、`0.97,0.003→improving`、`0.95,-0.002→lagging`、`1.00,0.000→leading`）與 NaN 輸入 → quadrant=None
- [x] 2.3 [P] 實作需求「strength_score 依象限加權覆蓋」：在同測試檔新增「strength_score 加權」測試案例，斷言 `leading` 乘 1.15、`improving` 乘 1.05、`weakening` 乘 0.95、`lagging` 乘 0.85、`None` 象限時原值不變
- [x] 2.4 實作 `ETF/pipeline/steps/sector_rrg_step.py` 的純函式部分（`_compute_rs_ratio_momentum(cat_close, taiex_close)`、`_classify_quadrant(rs_ratio, rs_momentum)`、`_apply_quadrant_weight(strength_score, quadrant)`），對應 design.md「資料來源與族群時間序列建構」與「strength_score 加權覆蓋（獨立 UPDATE，不改 SectorStrengthStep）」兩項決策，使 2.1-2.3 測試轉為 GREEN；驗證：`uv run pytest ETF/tests/test_sector_rrg_step.py -v` 全數通過

## 3. SectorRrgStep 與 Pipeline 整合

- [x] 3.1 實作需求「計算族群相對大盤 RRG 訊號並寫入 DB」：在 `sector_rrg_step.py` 實作 `SectorRrgStep(BaseStep)`，對應 design.md「資料來源與族群時間序列建構」決策——重建 `exploded`（stock_id→category，門檻 `stock_count >= 5`，沿用 `SectorStrengthStep` 相同邏輯）、取 `fd.get("price:收盤價")` 與 `fd.get("taiex_total_index:收盤指數")`、對每個 valid category 呼叫 2.4 的純函式、UPDATE `sector_strength` 對應列的 `rs_ratio`/`rs_momentum`/`rrg_quadrant`/`strength_score`；驗證：手動執行 `uv run python -c "from ETF.pipeline.steps.sector_rrg_step import SectorRrgStep"` import 不報錯
- [x] 3.2 對應 design.md「Step 執行順序與失敗處理」決策：`execute()` 包 try/except，失敗只 `self.logger.error()` 不 `raise`；UPDATE 找不到對應列（0 影響列）時記錄 warning log 不拋錯；驗證：程式碼審查確認符合 `etf-pipeline.md` 輔助步驟規則（無 `raise` 在 `except` 區塊）
- [x] 3.3 對應 design.md「Step 執行順序與失敗處理」決策：在 `ETF/pipeline/orchestrator.py` import 並在 `SectorStrengthStep` 之後、下一步驟之前註冊 `SectorRrgStep`；驗證：`uv run python -c "from ETF.pipeline.orchestrator import PipelineOrchestrator"` import 成功，且 `grep -n SectorRrgStep ETF/pipeline/orchestrator.py` 顯示緊接在 `SectorStrengthStep` 之後

## 4. 前端資料層

- [x] 4.1 修改 `src/app/actions/getSectorStrength.ts` 的 `SectorRow` interface 新增 `rs_ratio: number | null`、`rs_momentum: number | null`、`rrg_quadrant: 'leading' | 'weakening' | 'improving' | 'lagging' | null` 三個欄位，並在 `_getSectorStrength` 的 `.select()` 查詢字串加入這三個欄位名稱；驗證：`yarn tsc --noEmit` 無型別錯誤

## 5. 前端顯示（TDD：若既有測試檔存在則先寫測試）

- [x] 5.1 檢查 `src/app/investment/sectors/` 是否已有 `SectorDashboard` 相關測試檔（`__tests__/` 或同目錄 `*.test.tsx`）；若存在，新增「`rrg_quadrant='leading'` 時顯示『領先』徽章」與「`rrg_quadrant=null` 時不顯示徽章」兩個測試案例（RED，元件尚未支援）；若不存在既有測試檔，跳過本任務並在任務 5.2 完成後於 verification 章節改用手動實跑驗證
- [x] 5.2 實作需求「族群列顯示 RRG 四象限徽章」：在 `SectorDashboard.tsx` 族群列新增象限徽章：依 `rrg_quadrant` 顯示「領先/改善/轉弱/落後」文字，`leading`/`improving` 用 `text-rose-600 dark:text-rose-400`，`weakening`/`lagging` 用 `text-emerald-600 dark:text-emerald-400`（遵循台股色彩慣例），`rrg_quadrant` 為 null 時不渲染任何徽章或佔位文字；驗證：若 5.1 有寫測試則 `yarn test --testPathPatterns SectorDashboard` 轉為 GREEN；若無測試檔則用 `yarn dev` 啟動後手動瀏覽 `/investment/sectors` 確認徽章正確顯示與隱藏

## 6. 端到端驗證

- [x] 6.1 ~~本機執行 `FORCE_RUN=true uv run python ETF/main.py --dry-run` 觀察 log~~ ——**實作時發現此驗證方式不成立**：`PipelineOrchestrator.create_dry_run()`（`ETF/pipeline/orchestrator.py`）只執行 `ScrapeStep`，`--dry-run` 不會跑到 `SectorRrgStep`；要真正端到端驗證需跑無 `--dry-run` 的完整 pipeline，但那會寫入 production DB、耗用 FinLab 配額、可能觸發真實 LINE 通知。已與使用者確認跳過本項，改以任務 2-6（16 個 pytest 案例涵蓋純函式、`SectorRrgStep` import/實例化成功、orchestrator 步驟順序 grep 確認）作為本次驗證依據；正式驗證留待下次排程 pipeline 實際執行後於 `/investment/sectors` 查看真實 `rrg_quadrant` 資料
- [x] 6.2 `uv run ruff check ETF/pipeline/steps/sector_rrg_step.py ETF/tests/test_sector_rrg_step.py --fix && uv run ruff format ETF/pipeline/steps/sector_rrg_step.py ETF/tests/test_sector_rrg_step.py`
- [x] 6.3 `yarn lint` 確認前端改動無 ESLint 錯誤
- [x] 6.4 全量跑 `uv run pytest ETF/` 確認新測試與既有測試皆通過，無回歸
