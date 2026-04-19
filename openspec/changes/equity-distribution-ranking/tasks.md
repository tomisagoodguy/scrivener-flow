## 1. 資料庫

- [x] 1.1 建立 `supabase/migrations/20260419100000_equity_distribution_stats.sql`（含 table、primary key、public read policy）
- [x] 1.2 在 Supabase 套用 migration

## 2. Python 同步腳本

- [x] 2.1 實測 FinLab 股東分散表 API 確認正確 data key 與欄位結構
- [x] 2.2 建立 `ETF/sync_equity_distribution.py`：從 DB 動態取成分股池（`DISTINCT stock_code FROM etf_holdings_snapshot`）
- [x] 2.3 實作 FinLab 資料取得：取最近兩期並計算 `shareholders_change_rate`、`big_holder_pct_change`
- [x] 2.4 實作 upsert 寫入 `equity_distribution_stats`（冪等）
- [x] 2.5 加入「本週無新公告則略過」保護邏輯
- [x] 2.6 手動執行一次補首次資料，驗證寫入正確

## 3. GitHub Actions

- [x] 3.1 建立 `.github/workflows/equity_weekly.yml`（每週一 01:00 UTC，使用 `uv run python ETF/sync_equity_distribution.py`）
- [x] 3.2 確認 GHA secrets 已含 `FINLAB_API_KEY`、`DATABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

## 4. 前端頁面

- [x] 4.1 建立 `src/app/investment/equity/page.tsx`（Server Component）：查詢最新一期資料，依兩種排序各取 Top 10
- [x] 4.2 實作主力買進排行榜：大戶持股比例增加 Top 10，含正值綠色標色與上箭頭
- [x] 4.3 實作散戶減少排行榜：總股東人數減少 Top 10，含負值紅色標色與下箭頭
- [x] 4.4 頁面頂部顯示 `snapshot_date`（資料日期）
- [x] 4.5 每列股票名稱連結至 `/investment/stock/[code]`
- [x] 4.6 無資料時顯示「尚無資料，每週一更新」提示

## 5. 導覽整合

- [x] 5.1 在投資模組導覽（`src/app/investment/layout.tsx` 或導覽元件）加入 `/investment/equity` 連結
