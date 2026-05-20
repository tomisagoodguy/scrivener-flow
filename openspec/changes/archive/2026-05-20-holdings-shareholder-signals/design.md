## Context

`equity_distribution_stats` 已有大戶（tier ≥ 12，400 張+）、中戶（tier ≥ 11）、鯨魚（tier ≥ 15）三層比例欄位，但缺少散戶層（tier ≤ 3，< 10 張）。前端 `quantFilters.ts` 每次頁面載入時對成分股批次查詢多張 DB 表，計算 `QuantFilter` 指標後合併進 `Holding` 型別傳給 `HoldingRow`。

TDCC tier 定義（FinLab `inventory` 資料集）：
- Tier 1：1–999 股（< 1 張）
- Tier 2：1,000–5,000 股（1–4 張）
- Tier 3：5,001–10,000 股（5–9 張）
- Tier 4+：10 張以上

散戶 = tier 1 + 2 + 3 的 `custody_ratio` 加總。

## Goals / Non-Goals

**Goals:**

- 在 `equity_distribution_stats` 新增 `small_holder_pct` / `small_holder_pct_change` 欄位
- `sync_equity_distribution.py` 週排程同步時一併計算散戶比例與週差值
- 支援 `--force-backfill` 回填所有歷史快照的新欄位
- `quantFilters.ts` 帶入大戶增減與散戶增減，前端以 badge 顯示

**Non-Goals:**

- 不增加新的 FinLab API 呼叫——`inventory` 資料集已在現有週排程內下載，只需額外計算 tier ≤ 3 的加總
- 不修改集保資料的下載頻率（仍維持週排程，TDCC 每週才更新）
- 不加入外資買賣超（`foreign_buy`）——留待後續 change 處理

## Decisions

### 使用 tier ≤ 3 計算散戶佔比，與現有 _compute_tier_pct 分開

現有 `_compute_tier_pct(period_df, min_tier)` 計算 tier ≥ N 的持股比例；散戶是 tier ≤ 3，需新建 `_compute_small_tier_pct(period_df, max_tier=3)` 函式（排除 tier 17 彙總列），邏輯對稱但方向相反。

替代方案：改用 FinLab `etl:inventory:小於十張佔比` 直接抓預算好的值。被捨棄原因：此 ETL 欄位週週更新，但不保留歷史；且 `inventory` 原始 tier 資料已在現有 pipeline 下載，不需額外 API 配額。

### quantFilters.ts 以 LEFT JOIN 方式查詢 equity_distribution_stats

`equity_distribution_stats` 是週資料，部分成分股可能尚未有資料（新入庫股票）。查詢時對每支 `stock_code` 取最新一筆（`ORDER BY snapshot_date DESC LIMIT 1`）。實作上批次用 `IN (stock_codes)` 一次查回，再在記憶體組 map，避免 N+1 查詢。

### badge 整合進現有「量化篩選」欄，不新增欄位

HoldingsTable 已有 12 欄，再加欄位會讓小螢幕破版。將大戶增減 💎 與散戶減少 👤 badge 附在現有 M·T·R badge 列下方，tooltip 顯示具體 pp 數值。

## Risks / Trade-offs

- **週資料時效**：`equity_distribution_stats` 每週一次，若本週快照尚未執行，badge 顯示上週資料——這是預期行為，不是 bug；前端無需顯示日期提示
- **backfill 時間**：`--force-backfill` 需重算所有歷史期數，視 FinLab 資料量約 3–5 分鐘；建議在非交易時段執行
- **FinLab 配額**：backfill 下載 `inventory` 一次約 200–400 MB，需確認配額足夠再執行

## Migration Plan

1. 部署 DB migration SQL（加欄位，無 NOT NULL 無預設值，不影響現有資料）
2. 部署更新後的 `sync_equity_distribution.py`
3. 執行一次性 backfill：`uv run python ETF/sync_equity_distribution.py --force-backfill`
4. 部署前端變更（`quantFilters.ts` + `HoldingRow.tsx`）
