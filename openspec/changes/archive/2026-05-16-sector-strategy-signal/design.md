## Context

`SectorStrengthStep` 已每日計算族群漲幅並存 `sector_strength_stocks`。現在要在同一步驟內，對每支成分股套用策略條件，標記「技術面 + 基本面俱強」的個股。

策略定義（來自使用者）：
```python
pct_change = (close / close.shift() - 1).rolling(5).mean()   # 動能分數
條件 = (close > close.average(60)) &   # 季線以上
       (close > close.average(20)) &   # 月線以上
       (close > close.average(120)) &  # 半年線以上
       (rev.average(3) > rev.average(12))  # 月營收短期 > 長期
```

## Goals / Non-Goals

**Goals:**
- 在現有 SectorStrengthStep 計算成本下，額外輸出策略命中標記
- LINE 通知直接列出今日強勢族群中的命中個股（全市場前 10）
- Web 頁面成分股旁顯示 ⚡ 標記

**Non-Goals:**
- 不做回測或績效追蹤
- 不新增獨立的回測 Pipeline step
- 不限制在特定 ETF 持股內（全市場掃描）

## Decisions

### 1. 策略計算位置：SectorStrengthStep 內部

直接在 `_run()` 內，取到 `close` 後順便計算均線與月營收條件。不新增獨立 step——這樣一次 FinLab API 呼叫同時拿到族群漲幅 + 策略條件，節省配額。

**月營收資料**：`monthly_revenue:當月營收` 是月頻資料，FinLab 會自動 forward-fill 到每個交易日，可直接用 `.average(3)` / `.average(12)` 比較。

### 2. DB 欄位：ALTER TABLE 新增兩欄

```sql
ALTER TABLE sector_strength_stocks
  ADD COLUMN IF NOT EXISTS is_strategy_hit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS momentum_score  NUMERIC(8,4);
```

`momentum_score` = 該股當日 5 日滾動均漲幅（`pct_change`），用於全市場排行。

### 3. LINE 輸出格式

族群摘要之後，加一段：
```
⚡ 族群策略命中（均線多頭 + 月營收成長）
1. 群創光電 3481  [半導體] +2.1%
2. 京元電子 2449  [半導體] +1.8%
...（全市場前 10）
```

### 4. NaN 處理

月營收資料有缺失（小型股、季報未揭露）→ `rev.average(3)` 可能為 NaN。NaN 比較結果為 False，自然排除，不需特別處理。

均線需要足夠歷史資料（120 日），新上市股票 `close.average(120)` 可能為 NaN → 同樣排除。

### 5. 配額影響

新增 `monthly_revenue:當月營收`（每次約 50–100 MB），現有日配額 2682 MB，尚有空間。

## Risks / Trade-offs

- **計算時間增加**：月營收資料較大，SectorStrengthStep 目前跑約 6 分鐘，預計增加 1–2 分鐘
- **NaN 排除**：小型股、新上市股會自然排除，屬預期行為
- **月營收延遲**：月營收於次月 10 日前公告，月初前 10 天的資料是上上月，`average(3)` 可能包含舊月份

## Migration Plan

1. 執行 ALTER TABLE migration
2. 修改 `SectorStrengthStep._upsert_stocks()` 寫入新欄位
3. 修改 `build_sector_summary()` 查詢並附加命中清單
4. 修改 `SectorDashboard.tsx` 顯示 ⚡
5. 手動跑一次補今日資料
