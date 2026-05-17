## 1. DB Migration

- [x] 1.1 新增 `supabase/migrations/20260516160000_add_sector_quality_metrics.sql`，對 `sector_strength` 資料表加入 `breadth NUMERIC(5,4)`, `avg_amount_5d NUMERIC(20,0)`, `strength_score NUMERIC(8,4)` 三欄（使用 `ADD COLUMN IF NOT EXISTS`）

## 2. Pipeline — 計算族群品質指標並寫入 DB

### 涵蓋設計決策：廣度（breadth）計算方式 / avg_amount_5d 資料來源 / strength_score 定義

- [x] 2.1 在 `ETF/pipeline/steps/sector_strength_step.py` 的 `_run()` 中，於既有 `ret_5d` / `ret_20d` 計算之後，從 FinLab 取 `price:成交金額` 最近 6 筆（`amount_hist.iloc[-6:-1].mean()`），計算各股票 5 日均量 `avg_5d_by_stock`（實作 avg_amount_5d 資料來源）
- [x] 2.2 計算廣度（breadth）計算方式：對 `valid_df` groupby category，計算 `(ret_1d > 0).sum() / len(g)`，結果為 0–1 的 Series `breadth_by_cat`
- [x] 2.3 計算 `avg_amount_5d`：對各成分股的 `avg_5d` 欄位按 category groupby sum，NaN 成分股自動跳過（全 NaN 時存 NULL）
- [x] 2.4 計算 strength_score 定義：`sector_df["strength_score"] = sector_df["ret_1d"] * sector_df["breadth"]`（正數=強勢，負數=弱勢）
- [x] 2.5 更新 `_upsert_sectors()` 的 INSERT SQL，加入 `breadth`, `avg_amount_5d`, `strength_score` 三欄至 INSERT 欄位清單與 ON CONFLICT DO UPDATE 子句（完成「計算族群品質指標並寫入 DB」需求）
- [x] 2.6 在 `sector_df` 組建時 map 三個新欄位並傳遞給 `_upsert_sectors()`

## 3. Server Action

- [x] 3.1 更新 `src/app/actions/getSectorStrength.ts` 的 `SectorRow` interface，新增 `breadth: number | null`, `avg_amount_5d: number | null`, `strength_score: number | null`
- [x] 3.2 更新 `getSectorStrength()` 的 select 字串，加入 `breadth, avg_amount_5d, strength_score`

## 4. LINE 通知 — LINE 每日報告附上族群摘要（品質篩選）

- [x] 4.1 更新 `ETF/daily_ai_report.py` 的 `build_sector_summary()` SELECT 子句，加入 `breadth, strength_score` 欄位
- [x] 4.2 更新 WHERE 條件加入 `AND ret_1d > 0 AND ret_5d > 0 AND breadth >= 0.40`，ORDER BY 改為 `strength_score DESC NULLS LAST`（LINE 每日報告附上族群摘要，反映品質篩選邏輯）
- [x] 4.3 更新 `top_5d` 計算：從品質篩選後的 rows 中依 `ret_5d` 降序排列取前 5，不再從原始 rows 重排

## 5. 前端 — 強勢族群篩選模式（前端篩選門檻（強勢模式））

- [x] 5.1 在 `src/app/investment/sectors/SectorDashboard.tsx` 新增 `SortKey` 值 `'strength'`，並在 tabs 陣列加入「強勢」tab（強勢族群篩選模式）
- [x] 5.2 新增篩選邏輯（前端篩選門檻（強勢模式））：sortKey 為 `'strength'` 時，同時滿足 `ret_1d > 0`, `ret_5d > 0`, `breadth >= 0.4`, `total_amount >= avg_amount_5d * 0.8`（後者 null 時跳過量能條件）
- [x] 5.3 強勢模式下列表依 `strength_score` 降序排列
- [x] 5.4 頂部 badge 在強勢模式顯示「強勢 N/total」計數
- [x] 5.5 強勢模式無結果時，空狀態訊息改為「今日無強勢族群」
