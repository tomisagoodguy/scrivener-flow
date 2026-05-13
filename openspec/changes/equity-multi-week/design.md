## Context

`equity_distribution_stats` 以 `(stock_code, snapshot_date)` 為 PK，每週新增一筆快照（約每週一更新）。目前前端 `fetchRankingData()` 只取最新一期，並顯示預計算欄位 `big_holder_pct_change`（= 本期 - 前期）。

DB 實際保存 `big_holder_pct`、`mid_holder_pct`、`whale_holder_pct` 絕對值，具備跨期比較所需的原始資料。

## Goals / Non-Goals

**Goals:**
- 讓用戶切換 1/2/3/4 週觀察窗口，看到大戶持股比例在 N 週前後的變化
- 顯示日期區間標記（e.g. `04/24 → 05/08`）提升資訊透明度
- 維持現有 tier（200/400/1000）+ sort 邏輯不變

**Non-Goals:**
- 不修改 Python 同步腳本或 DB schema
- 不預計算多週變化欄位（避免 schema 膨脹）
- 不支援超過 4 週（資料可能不足）

## Decisions

### 1. 動態計算 vs 預計算欄位

**選擇：動態計算**

理由：DB 已有絕對值 `big_holder_pct`；預計算需新增 `big_holder_pct_change_2w/3w/4w` 等欄位，schema 膨脹且需修改 Python 腳本。動態查詢兩期資料計算差值，邏輯簡單且無額外維護負擔。

### 2. 如何找「N 期前」的快照

`equity_distribution_stats` 以週為單位，但不保證每 7 天一筆（可能因 TDCC 公告日調整）。

**選擇：按快照排序取第 N 筆**（不是按日曆日計算 N×7 天前）

做法：先查所有不重複的 `snapshot_date`（降序），取第 `weeks` 個（index = weeks - 1 是 current，index = weeks 是 N 期前）。這樣能適應不規律的更新週期。

### 3. UI 結構

新增 `WeekNav` 元件，以 URL param `weeks=1|2|3|4` 控制，與現有 `TierNav`（`tier=200|400|1000`）並排顯示。兩者可同時組合（e.g. `?tier=400&weeks=2`）。

`WeekNav` 從 server 端接收 `{ weeks: number, availableDates: string[] }` 作為 props，用於顯示日期區間。

### 4. 多週計算的排序 key

多週模式下，動態計算的 `pct_change_nw` 不是 DB 欄位，無法用 Supabase `.order()` 直接排序。

**選擇：應用層排序**（與現有 `it_buy_5d`、`amount` 的做法一致）

先用 `big_holder_pct_change > 0` 過濾取出候選股，再在 JS 端依動態計算的多週變化重新排序。

## Risks / Trade-offs

- [查詢量增加] 多週模式需查兩期快照 → Mitigation：已有 `idx_equity_dist_date` index，查詢量小（< 2000 rows/期）影響可忽略
- [快照期數不足] 若 DB 只有 1 期快照（初期），`weeks=2/3/4` 的「前期」不存在 → Mitigation：前端顯示「資料不足」提示，fallback 顯示 1 週變化

## Migration Plan

純前端邏輯變更，無需 DB migration，無 rollback 顧慮。部署後立即生效。
