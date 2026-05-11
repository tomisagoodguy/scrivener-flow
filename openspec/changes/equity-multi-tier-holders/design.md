## Context

`equity_distribution_stats` 表目前只有 `big_holder_pct` / `big_holder_pct_change`（400張+，tier >= 12）。資料由 `sync_equity_distribution.py` 每週從 FinLab `inventory` 抓取，計算最新兩期差值後 upsert。前端 `/investment/equity` 讀取此表做籌碼排行。

FinLab `inventory` 的 tier 結構（已驗證）：
- tier 11 = 200–400 張
- tier 12 = 400–600 張
- tier 13 = 600–800 張
- tier 14 = 800–1000 張
- tier 15 = 1000 張以上（無上限）
- tier 17 = 集計總列（忽略）

三個級距的計算方式完全相同，差別只在 `BIG_HOLDER_MIN_TIER` 的下限值：200張+ 用 tier >= 11，400張+ 用 tier >= 12，1000張+ 用 tier >= 15。

## Goals / Non-Goals

**Goals:**
- DB 新增 4 個欄位：`mid_holder_pct`、`mid_holder_pct_change`（200張+）、`whale_holder_pct`、`whale_holder_pct_change`（1000張+）
- Python 同步腳本一次計算三個級距並寫入
- 前端新增 tier 切換 UI，預設顯示 400張+
- 所有欄位標題可點擊排序，以 `?sort=<column>&dir=asc|desc` URL param 控制

**Non-Goals:**
- 不細分 tier 15（1000張以上無法進一步分級）
- 不修改 LINE 通知、AI 報告的大戶門檻
- 不回填歷史快照（新欄位只從下次 weekly run 起有資料）

## Decisions

### 新欄位命名採 mid / whale 前綴

`mid_holder_pct_change`（200張+）與 `whale_holder_pct_change`（1000張+），現有 `big_holder_pct_change`（400張+）維持不動。命名語意清晰，前端 TypeScript 型別對應容易，LINE/AI 現有引用不受影響。

備選方案：`holder_200_pct_change` 等數字命名 → 拒絕，數字前綴在 TypeScript 屬性存取需加引號，不直覺。

### 前端切換機制用 URL query param（`tier`）

延續 `/cases` 的 `sort` param 慣例，用 `?tier=200|400|1000` 控制顯示哪個級距。Server Component 直接從 searchParams 讀取，不需要 client-side state。

備選方案：tab UI 加 useState → 拒絕，Server Component 優先原則，URL param 可分享連結。

### Python 重構為 `_compute_tier_pct` 共用函式

原本 `_summarise()` 硬編碼 `BIG_HOLDER_MIN_TIER`。重構為接受 `min_tier` 參數的函式，三個級距重用同一計算邏輯，減少重複。

### DB migration 只加欄位，不重建表

`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 加 nullable 欄位，對現有資料無影響，deploy 不需 downtime。

### 欄位排序以 `?sort=<column>&dir=asc|desc` URL param 實作

可排序欄位：`total_shareholders`、`shareholders_change_rate`、`big_holder_pct_change`（或依 tier 切換的對應欄）、`it_buy_5d`、`amount`。

`equity_distribution_stats` 欄位（`total_shareholders`、`shareholders_change_rate`、`big_holder_pct_change`、`mid_holder_pct_change`、`whale_holder_pct_change`）可在 DB 層 `order()` 排序。`it_buy_5d` 與 `amount` 來自 `stock_prices_daily`（`priceIndicators` map），需在 Server 端合併後以 JS `Array.sort()` 排序。

預設排序：左表 `big_holder_pct_change DESC`（`?sort=big_holder_pct_change&dir=desc`），右表 `shareholders_change_rate ASC`（`?sort=shareholders_change_rate&dir=asc`）。

點擊已排序欄位標題時：切換 `dir=asc↔desc`。點擊其他欄位：新欄位預設 `desc`（大到小）。

備選方案：Client Component + useState → 拒絕，Server Component 優先，URL param 可分享連結且 SEO 友好。

## Risks / Trade-offs

- **歷史資料空欄**：新欄位在下次 weekly run 前為 NULL，前端需 `?? '—'` 處理 → 已在前端型別定義中標記為 `| null`
- **weekly 執行時間微增**：三個級距各需一次 groupby，但資料量小（每支股票僅 15 行），影響可忽略
- **`it_buy_5d` / `amount` 排序在 JS 層**：無法利用 DB index，但資料量最多數百列，效能可接受；NULL 值排到最後
