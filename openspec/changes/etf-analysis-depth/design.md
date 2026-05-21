## Context

**現有資料盤點：**

| 資料 | 來源 | 可用性 |
|------|------|-------|
| ETF 買進事件 | `etf_diff_logs`（change_type IN/BUY） | ✅ 每日 |
| 投信買賣超（10日） | FinLab `it_buy`（`bare_k_service.py` 已使用） | ✅ 可取 |
| 外資買賣超 | FinLab `foreign_buy`（`client.py` 已映射） | ✅ 可取 |
| ETF 持股歷史進出記錄 | `etf_diff_logs`（IN/OUT/BUY/SELL 全記錄） | ✅ 可計算 |
| 策略選股訊號 | `strategy_signals`（5 策略 × 每日選股） | ✅ 每日 |

**關鍵設計約束：**
- `ResonanceSignalStep`：每日執行，但只在有 BUY/IN 事件時才有意義；FinLab 配額消耗需謹慎（不重複拉已拉過的資料）
- `HoldingDurationStep`：需查 `etf_diff_logs` 全歷史，計算量較大 → 月末執行，且採增量計算（只更新有異動的持股）
- 策略擁擠度：純前端計算，`strategy_signals` 已有所需資料，不需新 pipeline 步驟

## Goals / Non-Goals

**Goals:**

- 當 ETF 當日加碼某股 + 投信近 10 日淨買超 > 0 → 記錄「投信共鳴」；加外資 → 「外資共鳴」；兩者同時 → 「雙向共鳴」
- 每支 ETF 持股的進場日（從 etf_diff_logs 的首個 IN 事件推算）與持倉天數
- 5 策略間的兩兩 Jaccard 相似度矩陣，前端熱力圖

**Non-Goals:**

- 不計算法人與 ETF 的「歷史共鳴勝率」（屬績效回測範圍）
- 不做個股層級的因子暴露量化（需 FinLab 因子資料，scope 太大）
- 不計算持股週期的「最佳持有期」統計

## Decisions

### 決策 1：共鳴分數計算方式

**選擇**：使用布林組合而非數值分數。

| 共鳴類型 | 條件 | resonance_type |
|---------|------|---------------|
| 無共鳴 | 僅 ETF 買進 | `none` |
| 投信共鳴 | ETF 買進 + 投信近 10 日淨買超 > 0 | `it` |
| 外資共鳴 | ETF 買進 + 外資近 10 日淨買超 > 0 | `foreign` |
| 雙向共鳴 | ETF 買進 + 投信 + 外資均淨買超 > 0 | `both` |

**理由**：布林型態直觀，不需調整權重；前端 badge 顯示更簡潔。數值分數屬未來優化。

### 決策 2：ResonanceSignalStep 的 FinLab 資料策略

`ScrapeStep` → `MultiEtfStep` 已收集當日 BUY/IN 的 `stock_code` 清單 → 存入 `ctx.new_buy_codes: set[str]`。`ResonanceSignalStep` 只針對這些代碼從 FinLab 拉近 10 交易日的法人買賣超，不拉全部持股（節省配額）。

**替代方案**：從 `etf_diff_logs` 查今日 BUY 記錄 → 需要 DB 查詢；改用 ctx 傳遞更高效。因此 `DiffComputeStep` 需在 `ctx` 加入 `new_buy_codes`。

### 決策 3：HoldingDurationStep 的進場日推算邏輯

```
entry_date = 最近一次連續 IN/BUY 序列的起始日
           = 對每個 (etf_code, stock_code)，
             找出最近一個 OUT/SELL 事件之後的第一個 IN/BUY 事件日期
           = 若無 OUT/SELL 歷史，則取全歷史最早的 IN 事件日期
```

`holding_days = (today - entry_date).days`（僅計算目前仍持有的股票）

**替代方案**：以每個 IN 事件為一個持倉週期 → 同一股票分批買進會產生多個週期，計算複雜且使用者難理解；「最近一次連續持有」更直觀。

### 決策 4：策略擁擠度的計算位置

**選擇**：純 Server Action 即時計算，不存 DB。

```ts
// getStrategyCrowding()
// 讀取今日 strategy_signals（is_selected = true）
// 計算 5×5 Jaccard matrix
// Jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

**理由**：`strategy_signals` 每日 5 個策略各約 5–10 支股票，計算量極小（不超過 10ms）；存 DB 反而是過度設計。

### 決策 5：DB Schema

**etf_resonance_signals**
```sql
CREATE TABLE etf_resonance_signals (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    etf_code        TEXT NOT NULL,
    stock_code      TEXT NOT NULL,
    stock_name      TEXT,
    resonance_type  TEXT NOT NULL,  -- 'none' | 'it' | 'foreign' | 'both'
    it_net_10d      NUMERIC,        -- 投信近 10 日累計買賣超（股）
    foreign_net_10d NUMERIC,        -- 外資近 10 日累計買賣超（股）
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (date, etf_code, stock_code)
);
```

**etf_holding_periods**
```sql
CREATE TABLE etf_holding_periods (
    id              BIGSERIAL PRIMARY KEY,
    etf_code        TEXT NOT NULL,
    stock_code      TEXT NOT NULL,
    stock_name      TEXT,
    entry_date      DATE NOT NULL,
    exit_date       DATE,           -- NULL = 目前仍持有
    holding_days    INTEGER,        -- 計算截至今日或 exit_date
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (etf_code, stock_code)   -- 僅追蹤最近一次持倉週期
);
```

## Risks / Trade-offs

- **[風險] ctx.new_buy_codes 需要 DiffComputeStep 配合輸出**：若 diff 計算時無 BUY 事件（非交易日或資料未更新），new_buy_codes 為空集合，ResonanceSignalStep 直接 skip → 可接受
- **[風險] FinLab 投信/外資資料有 T+1 延遲**：當日法人買賣超需次日才有 → 共鳴計算實際比 ETF 買進晚一天 → 頁面加說明「法人資料以 T+1 為基準」
- **[Trade-off] etf_holding_periods 只追蹤最近一次持倉**：同一股票多次進出的歷史持倉週期不保留 → 簡化複雜度，可接受
- **[風險] HoldingDurationStep 首次執行需掃描全 etf_diff_logs 歷史**：可能數萬筆 → 分批查詢（LIMIT + OFFSET），首次執行時間較長但之後為增量更新

## Migration Plan

1. 新增兩個 Supabase migration SQL
2. 修改 `DiffComputeStep` 輸出 `ctx.new_buy_codes`
3. 實作 `ResonanceSignalStep`（本地 `--dry-run` 驗證）
4. 實作 `HoldingDurationStep`（月末本地手動執行驗證）
5. 前端 Server Actions + UI 修改
6. 合併 main，觀察 CI log
