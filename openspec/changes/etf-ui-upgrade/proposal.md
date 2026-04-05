## Why

RankingTrendChart 目前從 `etf_holdings_snapshot` 即時聚合排名，效率低且無篩選控制。同時 DiffLedger/DiffLogCard 尚未處理 `CLOSE` 異動類型，且未顯示 `prev_weight → curr_weight` 欄位。新的 `etf_weight_history` 表與 `etf_diff_logs` 新欄位已就位，UI 需跟上。

## What Changes

- **RankingTrendChart**：資料來源從 `etf_holdings_snapshot` 改為 `etf_weight_history`（效率提升），並新增 Top5 / Top10 / Top15 / 全部 篩選 tab；若 `etf_weight_history` 為空則 fallback 回舊表
- **DiffLog 型別**：`change_type` 新增 `'CLOSE'`；新增 `prev_weight?`、`curr_weight?`、`prev_shares?`、`curr_shares?`、`is_significant?` 欄位
- **DiffLogCard**：補上 `CLOSE` 視覺配置（amber 色調）；右側數字區在 BUY/SELL/CLOSE 時顯示 `prev → curr` weight
- **DiffLedger**：`getDiffLogs()` 查詢補選 `prev_weight`、`curr_weight` 欄位；`getBehaviorTags()` 補 CLOSE 標籤邏輯

## Capabilities

### New Capabilities

- `ranking-trend-chart-v2`：RankingTrendChart 升級，支援 `etf_weight_history` 資料來源與 Top N 篩選 tab
- `diff-log-close-support`：DiffLedger/DiffLogCard 支援 CLOSE 異動類型與 prev/curr weight 顯示

### Modified Capabilities

<!-- 無既有 spec 需修改 -->

## Impact

- `src/types/investment.ts`：DiffLog 型別擴充
- `src/app/investment/page.tsx`：`getRankingHistory()` 改讀 `etf_weight_history`（含 fallback）；`getDiffLogs()` 補選新欄位
- `src/components/features/investment/RankingTrendChart.tsx`：新增篩選 tab + 利用預計算 rank
- `src/components/features/investment/DiffLogCard.tsx`：新增 CLOSE case + prev/curr weight 顯示
- `src/components/features/investment/DiffLedger.tsx`：CLOSE 行為標籤邏輯
