## Context

ETF 投資監控頁（`/investment`）有兩個需升級的區塊：

1. **RankingTrendChart**：目前 `getRankingHistory()` 從 `etf_holdings_snapshot` 撈全量數據（所有日期 × 所有股票），在 client 端即時聚合排名。新的 `etf_weight_history` 表已建好，欄位包含預計算的 `rank`，但目前為空（pipeline 尚未產生資料）。

2. **DiffLedger/DiffLogCard**：`etf_diff_logs` 已新增 `prev_weight`、`curr_weight`、`prev_shares`、`curr_shares`、`is_significant` 欄位，且預留了 `CLOSE` 異動類型，但 UI 和型別定義均未更新。

## Goals / Non-Goals

**Goals:**
- `getRankingHistory()` 優先從 `etf_weight_history` 讀取，並在表空時 fallback 回 `etf_holdings_snapshot`
- RankingTrendChart 新增 Top5/10/15/全部 篩選 tab（client-side state）
- `DiffLog` 型別補上 `CLOSE` 與新欄位
- DiffLogCard 補 CLOSE 視覺配置，顯示 `prev → curr` weight
- DiffLedger getBehaviorTags 補 CLOSE 語意

**Non-Goals:**
- 不修改 Python pipeline（`weight_history_step.py` 已存在，不在此範圍）
- 不修改 `etf_diff_logs` DB schema（migration 已完成）
- 不加後端分頁（仍沿用現有 limit 500）

## Decisions

### D1：RankingTrendChart fallback 策略

**決策**：在 `page.tsx` server side 做 fallback，不在 component 內。

- `getRankingHistory()` 先 `COUNT(*)` from `etf_weight_history`
- 若有資料 → 撈 `etf_weight_history`（只選 `data_date, stock_code, stock_name, weight, rank`）
- 若空 → fallback 回 `etf_holdings_snapshot`（現有邏輯），並補算 `rank` 欄位
- Component props 新增 `hasRankField: boolean` 告知 client 是否有預計算 rank

**替代方案**：在 component 內判斷。拒絕：server component 做 fallback 更乾淨，不需要傳額外 flag 給 client。

### D2：Top N 篩選 tab 實作位置

**決策**：純 client-side state（`useState`），不走 URL 參數。

篩選只影響圖表呈現，不需要持久化或共享連結。`useMemo` 依賴 `[data, topN]` 重算即可。

### D3：CLOSE 語意與配色

**決策**：CLOSE = amber（警示色，介於 BUY/SELL 之間）。

CLOSE 語意為「大幅縮減至極低比重」，不是完全清倉（OUT），性質偏「收縮」但非消失。
- bg: `bg-amber-50 dark:bg-amber-950/40`
- icon: `MinusCircleIcon`（lucide）
- badge: `bg-amber-500/10 text-amber-600`

### D4：prev/curr weight 顯示邏輯

**決策**：所有有 `prev_weight` 或 `curr_weight` 的記錄都顯示 `before → after`，取代原本只顯示 `diff_weight` 的設計。

顯示格式：`{prev_weight ?? '—'}% → {curr_weight ?? '—'}%`（次要文字），`diff_weight` 保留為主要數字。
若兩個欄位都是 null（舊資料），維持原有 diff_weight only 顯示。

## Risks / Trade-offs

- **空表 fallback 效能**：fallback 時仍讀全量 snapshot，效能無改善。這是暫時狀態，pipeline 跑後自動切換。
- **型別擴充向下相容**：`prev_weight?` 等欄位為 optional，舊資料（null）不影響現有顯示。
- **CLOSE 無資料測試**：目前 DB 無 CLOSE 記錄，DiffLogCard CLOSE case 只能 code review 驗證，無法 UI 測試。

## Open Questions

- ~~pipeline 何時會填入 `etf_weight_history`？~~ → 不在此任務範圍，UI 做好後 pipeline 跑完自動生效
