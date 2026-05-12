## 1. 資料庫 Migration

- [x] 1.1 建立 `supabase/migrations/20260512000000_add_etf_buying_patterns.sql`：建立 `etf_buying_patterns` 表，包含 id, pattern_type, stock_code, etf_code, event_date, future_returns(jsonb), created_at；加入 unique constraint on (pattern_type, stock_code, etf_code, event_date)（對應 spec: etf_buying_patterns table stores one row per pattern-event）（對應 design: DB schema：etf_buying_patterns 使用 jsonb 存前瞻報酬）

## 2. Python Pipeline Step

- [x] 2.1 建立 `ETF/pipeline/steps/buying_pattern_step.py`，繼承 `BaseStep`：實作 `should_skip`（dry_run 時跳過）、`execute` 以 try/except 包覆（輔助步驟不 raise）、設定 `name = "Buying Pattern"`（對應 design: 模式分類在 Python 端（Pipeline Step）完成）
- [x] 2.2 在 `buying_pattern_step.py` 實作 `_classify_events(ctx)`：從 `etf_diff_logs` 查詢當日 BUY/IN 事件，對每筆事件套用 7 種模式判定邏輯（volume_spike、chase_high、single_lot、window_break、sustained_buy、new_position、dip_buy），每筆事件可對應多種模式（對應 spec: BuyingPatternStep classifies seven buying behavior patterns）
- [x] 2.3 在 `buying_pattern_step.py` 實作 volume_spike 判定：查詢該 stock-ETF 過去 20 個交易日的 `abs(diff_shares)` 計算 mean + std，只有超過 mean + 5.5 × std 才分類（對應 spec: BuyingPatternStep classifies seven buying behavior patterns）
- [x] 2.4 在 `buying_pattern_step.py` 實作 window_break 判定：查 `etf_diff_logs` 該 stock-ETF 在 event_date 前 60 日是否有 BUY/IN 記錄（對應 spec: Window break is classified after 60-day gap）
- [x] 2.5 在 `buying_pattern_step.py` 實作 sustained_buy 判定：計算過去 20 個交易日中 BUY/IN 出現次數是否達到 20（對應 spec: BuyingPatternStep classifies seven buying behavior patterns）
- [x] 2.6 在 `buying_pattern_step.py` 實作 chase_high 和 dip_buy 判定：從 `stock_prices_daily` 取 event_date 的 high/low/close/prev_close（前日收盤取前一筆），計算條件（對應 spec: BuyingPatternStep classifies seven buying behavior patterns）
- [x] 2.7 在 `buying_pattern_step.py` 實作 `_upsert_events(ctx, rows)`：以 SQLAlchemy INSERT ON CONFLICT DO NOTHING 寫入 `etf_buying_patterns`（對應 spec: Duplicate events are idempotent）
- [x] 2.8 在 `buying_pattern_step.py` 實作 `_fill_forward_returns(ctx)`：查詢 event_date >= today-30 且 future_returns 缺少天期的事件，批次 ≤ 500 筆；對每筆計算 1,2,3,5,7,10,15,20,25,30 日報酬（`(close_{T+d} - close_T) / close_T`），跳過缺價格的天期（對應 spec: BuyingPatternStep fills forward returns for events within the past 30 days）（對應 design: 前瞻報酬補齊策略：每日更新最近 30 天的未完成事件）
- [x] 2.9 在 `buying_pattern_step.py` 確保前瞻報酬增量更新：UPDATE 時用 `future_returns = future_returns || :new_data`（jsonb merge）而非覆蓋整個欄位（對應 spec: Returns are updated incrementally）
- [x] 2.10 在 `ETF/pipeline/orchestrator.py` 的 `SignalDetectStep` 之後插入 `BuyingPatternStep`（對應 design: 插入 Pipeline 的 SignalDetectStep 之後）

## 3. 前端 Server Action

- [x] 3.1 建立 `src/app/actions/getBuyingPatternStats.ts`：以 service client 查詢 `etf_buying_patterns` 所有 `future_returns != null` 的列，在 Server 端 reduce 計算各 (pattern_type, day_horizon) 的 avg_return、win_rate、n（對應 spec: Server Action aggregates buying pattern statistics）（對應 design: 前端聚合：Server Action 讀 etf_buying_patterns 後在 JS 計算統計）
- [x] 3.2 在 `getBuyingPatternStats.ts` 定義回傳型別 `PatternStats`：`{ patternType: string; n: number; avgReturns: Record<string, number>; winRates: Record<string, number> }[]`（對應 spec: Statistics are computed server-side）

## 4. 前端頁面元件

- [x] 4.1 建立 `src/app/investment/buying-patterns/page.tsx`（Server Component）：呼叫 `getBuyingPatternStats()`，傳入 props 渲染 `BuyingPatternCharts`（對應 spec: Page loads with pre-computed data）
- [x] 4.2 建立 `src/app/investment/buying-patterns/BuyingPatternCharts.tsx`（Client Component）：接收 `PatternStats[]`，渲染折線圖（1~30日平均報酬）、熱力圖（天期 × 模式）、勝率折線圖；圖例顯示 `n=<count>`；使用 Recharts（對應 spec: Buying patterns page displays three charts）
- [x] 4.3 在 `BuyingPatternCharts.tsx` 實作熱力圖色階：使用 blue（低報酬）到 red（高報酬）的 diverging scale，符合台股色彩慣例（紅漲）（對應 spec: Buying patterns page displays three charts）
- [x] 4.4 在 `BuyingPatternCharts.tsx` 實作樣本不足（< 10 筆）時的視覺提示：legend 顯示 n，折線改為虛線（對應 spec: Insufficient data for a pattern）
