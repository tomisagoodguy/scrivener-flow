## 1. 型別定義

- [x] 1.1 `src/types/investment.ts`：`DiffLog.change_type` 加入 `'CLOSE'`
- [x] 1.2 `src/types/investment.ts`：新增 `prev_weight?`, `curr_weight?`, `prev_shares?`, `curr_shares?`, `is_significant?` 可選欄位

## 2. Server Side 資料查詢

- [x] 2.1 `page.tsx` `getRankingHistory()`：先 COUNT `etf_weight_history`，有資料則撈新表（含 `rank`），否則 fallback 回 `etf_holdings_snapshot` 並補算 `rank`
- [x] 2.2 `page.tsx` `getDiffLogs()`：select 字串補上 `prev_weight, curr_weight, prev_shares, curr_shares, is_significant`

## 3. RankingTrendChart 升級

- [x] 3.1 新增 `topN` state（預設 10），加入 Top5 / Top10 / Top15 / 全部 篩選 tab UI
- [x] 3.2 `useMemo` 依 `[data, topN]` 篩選股票：當資料有 `rank` 欄位時直接用，否則依 weight 降序計算
- [x] 3.3 ranking list 側欄同步依 `topN` 篩選顯示

## 4. DiffLogCard 升級

- [x] 4.1 `getStatusConfig()` 新增 `CLOSE` case：amber 配色、`MinusCircleIcon`、label「大幅縮減」
- [x] 4.2 右側數字區：當 `prev_weight !== null || curr_weight !== null` 時，在 diff_weight 下方顯示 `{prev}% → {curr}%`

## 5. DiffLedger 升級

- [x] 5.1 `getBehaviorTags()` 補 CLOSE 標籤：`change_type === 'CLOSE'` 時推入 `{ label: '大幅縮減', color: 'amber' }`（若尚未由 getStatusConfig label 涵蓋）
- [x] 5.2 確認 CLOSE 不計入 buyStreak / sellStreak 連買連賣邏輯
