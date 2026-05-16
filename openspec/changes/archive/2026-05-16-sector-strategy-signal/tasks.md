## 1. DB Migration

- [x] 1.1 新增 migration `20260516140000_add_strategy_hit_to_sector_stocks.sql`，ALTER TABLE sector_strength_stocks 加 `is_strategy_hit BOOLEAN DEFAULT FALSE` 與 `momentum_score NUMERIC(8,4)`
- [x] 1.2 在 Supabase 執行 migration

## 2. Pipeline - 策略計算

- [x] 2.1 在 `SectorStrengthStep._run()` 取 `price:收盤價` 後，同步取 `monthly_revenue:當月營收`
- [x] 2.2 計算 `momentum_score = (close / close.shift() - 1).rolling(5).mean().iloc[-1]`
- [x] 2.3 計算四條件 mask：月線/季線/半年線以上 + 月營收短期>長期
- [x] 2.4 合併 `is_strategy_hit` 與 `momentum_score` 到 stocks DataFrame
- [x] 2.5 修改 `_upsert_stocks()` SQL，加入 `is_strategy_hit`、`momentum_score` 欄位寫入

## 3. LINE 通知

- [x] 3.1 修改 `build_sector_summary()`：查詢當日強勢族群（ret_1d 前 15）內的命中股，按 momentum_score 降序取前 10
- [x] 3.2 格式化並附加到回傳字串末尾（無命中則跳過）

## 4. Web 標記

- [x] 4.1 修改 `getSectorStocks` Server Action，回傳 `is_strategy_hit` 欄位
- [x] 4.2 修改 `SectorDashboard.tsx` 的成分股列表，命中者名稱後顯示 ⚡

## 5. 驗證

- [x] 5.1 手動執行 SectorStrengthStep，確認 `sector_strength_stocks` 有 `is_strategy_hit` 資料
- [x] 5.2 確認 `build_sector_summary()` 回傳包含 ⚡ 區塊
- [x] 5.3 確認 Web 頁面展開成分股時 ⚡ 正確顯示
