## ADDED Requirements

### Requirement: etf_stock_overlap 資料表
Supabase 中 SHALL 存在 `etf_stock_overlap` 表，schema 如下：
```sql
CREATE TABLE etf_stock_overlap (
    stock_code   TEXT NOT NULL,
    data_date    DATE NOT NULL,
    etf_count    INTEGER NOT NULL,        -- 持有此股的 ETF 數量
    total_weight NUMERIC(8,4) NOT NULL,   -- 各 ETF 權重合計
    etf_list     JSONB NOT NULL,          -- [{"etf_code":"00981A","weight":3.5}, ...]
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (stock_code, data_date)
);
CREATE INDEX ON etf_stock_overlap (data_date, etf_count DESC);
```

#### Scenario: 建立索引加速前端查詢
- **WHEN** 前端查詢特定日期的共識排行（`ORDER BY etf_count DESC`）
- **THEN** 查詢使用 `(data_date, etf_count DESC)` 複合索引，不做全表掃描

### Requirement: OverlapComputeStep 每日更新共識表
新增 `ETF/pipeline/steps/overlap_compute_step.py`，在 Pipeline 末尾（CleanupStep 之前）執行，聚合當日所有 ETF 快照並 upsert `etf_stock_overlap`。

#### Scenario: 正常計算共識
- **WHEN** 當日至少有 2 檔 ETF 的快照存在於 `etf_holdings_snapshot`
- **THEN** 聚合結果寫入 `etf_stock_overlap`，每個 `stock_code` 一筆，`etf_count` 為持有該股的 ETF 數，`etf_list` 為 JSONB 陣列含各 ETF 代碼與權重

#### Scenario: 某日快照不完整仍可執行
- **WHEN** 某 ETF 當日爬取失敗，快照缺失
- **THEN** 以實際有資料的 ETF 計算共識，`etf_count` 反映實際持有數量，不因缺資料而中斷

#### Scenario: 重複執行冪等
- **WHEN** 同一天 `OverlapComputeStep` 執行兩次（如手動補跑）
- **THEN** 使用 `ON CONFLICT (stock_code, data_date) DO UPDATE`，最終結果以最後一次為準
