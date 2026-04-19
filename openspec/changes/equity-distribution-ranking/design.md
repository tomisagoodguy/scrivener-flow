## Context

現有 ETF pipeline 每日同步持股快照至 `etf_holdings_snapshot`，涵蓋 11 支 E 經理人主動 ETF 的全部成分股。股東分散表（TDCC 集保）每週公告，記錄各股各持股級距的人數與比例——是判斷「主力正在吸籌 / 散戶正在出逃」的核心籌碼指標。

目前系統完全沒有這層資料，用戶需要離開系統去 poorstock.com 等外部網站查詢。

## Goals / Non-Goals

**Goals:**
- 讓用戶在系統內看到 E 經理人 ETF 成分股的籌碼排行
- 股票池動態：新增 ETF 進 registry 後，下次週同步自動涵蓋其成分股，不需改腳本
- 呈現兩個 Top 10：大戶持股比例增加、總股東人數減少

**Non-Goals:**
- 不追蹤全市場（避免 FinLab 配額消耗）
- 不計算個股完整歷史趨勢圖（只顯示最新一期與前期差值）
- 不整合進主 ETF pipeline（保持獨立，避免干擾主流程）

## Decisions

### 決策 1：股票池來源——讀 DB，不讀 etf_registry.py

**選擇**：`SELECT DISTINCT stock_code FROM etf_holdings_snapshot`

**理由**：
- 直接讀 registry → 只有 ETF 代碼，還要再爬一次成分股，多一個失敗點
- 讀 `etf_holdings_snapshot` → 成分股已經爬好在 DB，直接取即可
- 新 ETF 加入後，下次 pipeline 執行完成分股就已入庫，週同步自動收錄，**無需改同步腳本**

**代替方案排除**：hardcode 股票代碼 → 每次新增 ETF 都要改腳本，違反開閉原則。

---

### 決策 2：FinLab 資料欄位

**大戶定義**：持股 400 張（40 萬股）以上的股東持股比例（TDCC 級距 `level_15` + `level_16` + ... 合計）

FinLab `持股分散表` 提供每週快照，欄位含：
- `total_shareholders`：總股東人數
- 各級距持股人數與比例

取**最近 2 期**計算 delta（current - previous）：
- `shareholders_change_rate` = (current - prev) / prev × 100
- `big_holder_pct_change` = current_big_pct - prev_big_pct

---

### 決策 3：同步頻率——獨立 weekly GitHub Actions

**選擇**：獨立 `.github/workflows/equity_weekly.yml`，每週一 01:00 UTC（台灣 09:00）執行

**理由**：
- TDCC 每週五公告，週一最新資料已可用
- 與每日 ETF pipeline 完全解耦，不影響主流程穩定性
- 失敗不影響其他功能

---

### 決策 4：DB Schema

```sql
CREATE TABLE equity_distribution_stats (
    stock_code              TEXT        NOT NULL,
    snapshot_date           DATE        NOT NULL,  -- TDCC 公告日（通常週五）
    total_shareholders      INTEGER,
    big_holder_pct          NUMERIC(6,2),          -- 400 張以上持股比例 %
    shareholders_change_rate NUMERIC(8,4),          -- vs 前期 %
    big_holder_pct_change   NUMERIC(6,2),           -- vs 前期 percentage point
    stock_name              TEXT,                   -- 快取，避免每次 JOIN
    PRIMARY KEY (stock_code, snapshot_date)
);
```

公開讀取（investment_public_read policy 已存在，仿照 `bare_k_snapshots`）。

---

### 決策 5：前端——Server Component，無 API Route

直接在 `page.tsx` 用 Supabase Server Client 查詢，無需建 API Route。排序在 DB 層（`ORDER BY big_holder_pct_change DESC LIMIT 10`），不在前端做。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| FinLab `持股分散表` API 格式變動 | 同步腳本加 schema 驗證，失敗時 log + 不寫 DB，不中斷 |
| 成分股暫時 0 筆（ETF pipeline 尚未跑完） | 週同步在 ETF pipeline 之後執行（週一），成分股通常已更新 |
| 某週 TDCC 沒有公告（假日） | 腳本偵測若 FinLab 資料日期與上週相同，跳過寫入並 log info |
| FinLab 配額（~500 股 × 2 期） | 預估 < 50 MB，遠低於 5 GB/天上限 |

## Migration Plan

1. 建立 migration SQL → `supabase/migrations/20260419100000_equity_distribution_stats.sql`
2. 套用至 Supabase（手動或 CI）
3. 手動執行一次 `uv run python ETF/sync_equity_distribution.py` 補首次資料
4. 啟用 GHA workflow

Rollback：刪除 GHA workflow 檔案即可停止更新；DB 表保留不影響其他功能。

## Open Questions

- FinLab `持股分散表` 的確切 data key 需實測確認（可能是 `stock_info.get('持股分散表')` 或其他）
- 大戶級距定義：400 張 vs 1000 張，可在腳本內設常數調整
