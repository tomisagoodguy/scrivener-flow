## 1. DB Migration

- [x] [P] 1.1 建立 `supabase/migrations/20260520100000_add_small_holder_to_equity_dist.sql`，加入 `small_holder_pct NUMERIC(7,3)` 與 `small_holder_pct_change NUMERIC(7,3)` 欄位（equity_distribution_stats stores small holder columns）；兩欄皆 nullable，無預設值，確保 migration is additive 不影響現有資料

## 2. Python Backend — 計算散戶佔比

- [x] 2.1 在 `ETF/sync_equity_distribution.py` 頂部加入常數 `SMALL_HOLDER_MAX_TIER = 3`，並新增 `_compute_small_tier_pct(period_df, max_tier)` 函式（使用 tier ≤ 3 計算散戶佔比，與現有 _compute_tier_pct 分開）：過濾 `tier.astype(int) <= max_tier`、排除 `tier == AGGREGATE_TIER`、回傳 `groupby("stock_id")["custody_ratio"].sum()`（small holder percentage computed from TDCC tiers）
- [x] 2.2 更新 `_summarise()` 函式：在 `pd.concat` 中加入 `_compute_small_tier_pct(period_df, SMALL_HOLDER_MAX_TIER).rename("small_holder_pct")`，使 summary DataFrame 含 `small_holder_pct` 欄
- [x] 2.3 更新 `_compute_stats()` 函式：在 `merged` 計算區塊加入 `small_holder_pct_change = (merged["small_holder_pct"].fillna(0.0) − merged["small_holder_pct_prev"].fillna(0.0)).round(3)`；在 records dict 中加入 `"small_holder_pct"` 與 `"small_holder_pct_change"` 欄位（week-over-week change computed）
- [x] 2.4 更新 `_upsert()` 函式的 SQL：在 INSERT columns 加 `small_holder_pct, small_holder_pct_change`；在 VALUES 加 `:small_holder_pct, :small_holder_pct_change`；在 ON CONFLICT DO UPDATE SET 加對應欄位
- [x] 2.5 更新 `backfill_history()` 函式：在每期的 record dict 加入 `"small_holder_pct": round(...) if pd.notna(...) else None, "small_holder_pct_change": None`（backfill populates new columns，change 值設 NULL）

## 3. 前端 TypeScript — 讀取新欄位

- [x] [P] 3.1 在 `src/lib/investment/quantFilters.ts` 的 `QuantFilter` interface 新增 `big_holder_pct_change: number | null` 與 `small_holder_pct_change: number | null` 欄位（QuantFilter includes shareholder signal fields）
- [x] [P] 3.2 在 `fetchQuantFilters()` 函式中，以 LEFT JOIN 方式查詢 equity_distribution_stats（quantFilters.ts 以 LEFT JOIN 方式查詢 equity_distribution_stats）：用 Supabase JS 的 `.from("equity_distribution_stats").select("stock_code, big_holder_pct_change, small_holder_pct_change").in("stock_code", stockCodes).order("snapshot_date", { ascending: false })` 一次取回，在記憶體組 map 取每支股票最新一筆，避免 N+1；在 result map 中填入對應值（recent snapshot fetched、missing snapshot handled gracefully 當無資料時設 null）
- [x] 3.3 確認 `src/types/investment.ts` 的 `Holding` type 已透過 spread 合併 `QuantFilter`，若未包含新欄位則補上 `big_holder_pct_change?: number | null` 與 `small_holder_pct_change?: number | null`

## 4. 前端 UI — 顯示 Badge

- [x] [P] 4.1 在 `src/components/features/investment/HoldingRow.tsx` 的量化篩選欄（`<td>` 含 M·T·R badges），badge 整合進現有「量化篩選」欄，不新增欄位：在 badge 列下方加入兩個 badge：`item.big_holder_pct_change > 0` 時渲染 💎 badge（`title="大戶增持 +{N}pp"`，紅色系），`item.small_holder_pct_change < 0` 時渲染 👤 badge（`title="散戶減持 {N}pp"`，橙色系）；兩個數值均以 `toFixed(2)` 格式化（HoldingRow displays shareholder signal badges；big holder increasing shows diamond badge、small holder decreasing shows person badge、neutral or missing data shows no badge）
- [x] 4.2 確認 `src/components/features/investment/HoldingsTable.tsx` 的 `filter_score` 計算未受影響（新 badge 僅視覺顯示，不影響 filter_score 分數）

## 5. 資料回填

- [x] 5.1 在部署後執行一次性 backfill 指令：`uv run python ETF/sync_equity_distribution.py --force-backfill`，確認 log 輸出 `small_holder_pct` 有值且無錯誤（backfill populates new columns）
