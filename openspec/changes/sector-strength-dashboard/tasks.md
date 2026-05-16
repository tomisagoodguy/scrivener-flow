## 1. DB Migration

- [x] 1.1 新增 `supabase/migrations/<timestamp>_add_sector_strength.sql`，建立 `sector_strength` table（date, category, ret_1d, ret_5d, ret_20d, stock_count，UNIQUE date+category）
- [x] 1.2 同一 migration 建立 `sector_strength_stocks` table（date, category, stock_id, stock_name, ret_1d, ret_5d, ret_20d）
- [x] 1.3 在 Supabase 執行 migration

## 2. Pipeline Step

- [x] 2.1 建立 `ETF/pipeline/steps/sector_strength_step.py`，實作 `SectorStrengthStep`
- [x] 2.2 計算邏輯：取 `security_industry_themes` + `price:收盤價`，explode category，計算族群平均漲幅（家數 >= 5）
- [x] 2.3 upsert 族群資料至 `sector_strength`（ON CONFLICT DO UPDATE）
- [x] 2.4 upsert 成分股資料至 `sector_strength_stocks`
- [x] 2.5 `except` 只 log，不 raise（輔助步驟）
- [x] 2.6 在 `ETF/pipeline/orchestrator.py` 加入 `SectorStrengthStep`（位置：SaveSnapshotStep 之後、NotifyStep 之前）
- [x] 2.7 本地 `--dry-run` 測試確認不報錯

## 3. LINE 通知

- [x] 3.1 在 `ETF/daily_ai_report.py` 加入 `build_sector_summary()` 函式，從 DB 查當日 sector_strength
- [x] 3.2 取 ret_1d TOP 5 + ret_5d TOP 5，組成純文字格式
- [x] 3.3 當日無資料時回傳空字串（降級處理）
- [x] 3.4 將族群摘要附加在現有 LINE 訊息末尾

## 4. Web 頁面

- [x] 4.1 建立 `src/app/investment/sectors/page.tsx`（Server Component，從 DB 讀最新 sector_strength）
- [x] 4.2 實作日/週/月三個 tab 切換（client-side sort，不重新 fetch）
- [x] 4.3 建立族群列元件，點擊展開成分股（從 `sector_strength_stocks` 查詢）
- [x] 4.4 漲跌色彩遵循台股慣例（紅漲 `text-rose-600`，綠跌 `text-emerald-600`）
- [x] 4.5 在 SideNav 或投資儀表板入口加入「族群強弱」連結

## 5. 驗證

- [x] 5.1 手動跑 Pipeline 確認資料寫入 DB
- [x] 5.2 確認 LINE 通知格式正確
- [x] 5.3 確認 Web 頁面展開成分股正常
- [x] 5.4 清理暫時測試檔 `ETF/sector_strength.py`
