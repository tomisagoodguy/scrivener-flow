## 1. Server Actions（資料取得層）

- [x] 1.1 實作 `Server Action data fetch` for frontrunning：建立 `src/app/actions/getEtfFrontrunningEvents.ts`，用 Supabase server client 查 `etf_frontrunning_stats` ORDER BY `event_date DESC` LIMIT 500，回傳 `{etf_code, stock_code, event_date, delta_shares, delta_pct, is_new_position, r_t0, r_t1, r_t2}[]`
- [x] 1.2 實作 `Server Action data fetch` for active share：建立 `src/app/actions/getEtfActiveShare.ts`，查 `etf_active_share` 取最新 `computed_date`（子查詢 MAX），回傳 `{rows: {etf_a, etf_b, active_share_pct, as_vs_mean_a, as_vs_mean_b}[], latestDate: string}`
- [x] 1.3 實作 `Server Action data fetch` for manager drag：建立 `src/app/actions/getEtfManagerDrag.ts`，查 `etf_cumulative_drag` 取最新 `computed_date`，回傳 `{etf_code, n_events, days_span, events_per_year, annual_excess_volume_kshares_per_yi, annual_manager_drag_kshares_per_yi}[]`
- [x] 1.4 實作 `Server Action data fetch` for matched pairs：建立 `src/app/actions/getEtfMatchedPairs.ts`，同時查 `etf_matched_pairs`（detail）與 `etf_matched_pairs_summary` 最新 `computed_date`，回傳 `{detail: [...], summary: {...}}`

## 2. Frontrunning 頁面（etf-frontrunning-dashboard spec）

- [x] 2.1 建立 `src/app/investment/frontrunning/page.tsx`（Server Component）：呼叫 `getEtfFrontrunningEvents()`，傳資料至 Client Component；無資料時顯示 "尚無資料，等待 Pipeline 執行後自動更新"
- [x] 2.2 實作 `Display add events from etf_frontrunning_stats`：事件表格 Client Component，欄位 etf_code、stock_code、event_date、delta_shares（÷1000 顯示為張）、delta_pct（%）、is_new_position（新倉/加碼）、r_t0 / r_t1 / r_t2；r_t0 ≥ 2.0 時 `text-rose-600`，null 顯示 `—`
- [x] 2.3 實作 `ETF and stock filter`：ETF 下拉篩選（`etf_code` 選項從資料抽取）與股票代碼文字篩選（client-side，不重新 fetch）

## 3. Active Share 頁面（etf-active-share-matrix spec）

- [x] 3.1 建立 `src/app/investment/active-share/page.tsx`（Server Component）：呼叫 `getEtfActiveShare()`，無資料時顯示 "每週一更新，尚無資料"
- [x] 3.2 實作 `Display Active Share heatmap matrix`：N×N 表格，(A, B) 與 (B, A) 都顯示同一 `active_share_pct`；對角線留空；背景色按五段 rose scale（0–20% bg-rose-50、21–40% bg-rose-100、41–60% bg-rose-200、61–80% bg-rose-300、81–100% bg-rose-500）
- [x] 3.3 實作 `Show AS vs mean sidebar`：依 `as_vs_mean_a` 降序列出各 ETF 排名，顯示 etf_code 與數值

## 4. Manager Drag 頁面（etf-manager-drag-chart spec）

- [x] 4.1 建立 `src/app/investment/manager-drag/page.tsx`（Server Component）：呼叫 `getEtfManagerDrag()`，無資料時顯示 "尚無資料，等待 Pipeline 執行後自動更新"
- [x] 4.2 實作 `Summary stats panel`：三個 stat card 顯示 總事件數（`Σ n_events`）、平均年化頻率（`avg events_per_year`）、資料跨度（`max days_span` 天）
- [x] 4.3 實作 `Display manager drag bar chart`：水平長條圖（Tailwind CSS width%），依 `annual_manager_drag_kshares_per_yi` 降序排列；null 時灰色佔位條 + "AUM 資料不足"；疊加淺色 `annual_excess_volume_kshares_per_yi` 次要條

## 5. Matched Pairs 頁面（etf-matched-pairs-table spec）

- [x] 5.1 建立 `src/app/investment/matched-pairs/page.tsx`（Server Component）：呼叫 `getEtfMatchedPairs()`，無資料時顯示 "本期無重疊配對股票"
- [x] 5.2 實作 `Summary banner`：4 個 stat chip 顯示 n_pairs、n_active_higher、n_passive_higher、median_of_diffs
- [x] 5.3 實作 `Display matched pairs detail table`：欄位 stock_code、stock_name、n_active_events、n_passive_events、active_median_r、passive_median_r、diff_median；依 `|diff_median|` 降序；diff_median > 0.05 時 `text-rose-600`、< -0.05 時 `text-emerald-600`

## 6. 導覽整合

- [x] 6.1 在 `src/components/layout/SideNav.tsx` 投資儀表板分區新增四個連結：揭露日分析（/investment/frontrunning）、持股重疊度（/investment/active-share）、隱成本分析（/investment/manager-drag）、主被動配對（/investment/matched-pairs）
