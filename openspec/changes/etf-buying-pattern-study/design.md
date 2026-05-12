## Context

目前 ETF Pipeline 每日透過 `etf_diff_logs` 記錄基金經理人的買賣行為，並有 `stock_prices_daily` 存放每日收盤價。`SignalDetectStep` 雖已偵測三種跨 ETF 訊號，但沒有量化任何一種行為的前瞻報酬統計。

本次新增 `BuyingPatternStep`，插入 Pipeline 的 `SignalDetectStep` 之後，將每日新產生的 BUY/IN 事件分類成 7 種模式並存入 `etf_buying_patterns`，同時更新過去 30 天舊事件的前瞻收益（隨股價資料補齊）。

## Goals / Non-Goals

**Goals:**
- 每日自動分類 7 種買進模式，存入 `etf_buying_patterns`
- 每日補齊過去 30 天事件的 1~30 日前瞻報酬
- 前端頁面用 Recharts 呈現折線圖、熱力圖、勝率圖（Server Action 聚合）

**Non-Goals:**
- 不做賣出行為（SELL/OUT）分析
- 不做個股維度的事件過濾（所有 ETF 持股一視同仁）
- 不做即時（< 1 日）前瞻報酬
- 不連接 FinLab 進行新的 backtest；只用 DB 現有的 `stock_prices_daily`

## Decisions

### DB Schema：etf_buying_patterns 使用 jsonb 存前瞻報酬

每筆事件用一列記錄所有天期的報酬（`future_returns jsonb`，例如 `{1: 0.02, 5: 0.07, 30: 0.15}`），而不是每天期一列。

理由：30 天期 × 每日數百筆事件 = 每日新增可能達 9,000 列（正規化方式），查詢需 GROUP BY；jsonb 一列包含全部天期，前端 Server Action 聚合只需一次 SELECT + Python/JS 計算，查詢延遲低且不需建複合索引。

替代方案：每天期一列（`event_date, pattern_type, stock_code, days_ahead, return_pct`）—正規化但列數爆炸，棄用。

### 模式分類在 Python 端（Pipeline Step）完成

7 種模式的判定邏輯完全在 `BuyingPatternStep` 內執行，前端只負責讀取和呈現聚合結果。

理由：模式定義涉及歷史視窗計算（過去 60 日是否有 BUY、連續 20 日計數等），需要讀取大量 `etf_diff_logs` 歷史；在 DB 端用 SQL VIEW 計算會形成複雜遞迴 CTE；在 Pipeline Python 端用 pandas 計算更易維護，且執行頻率僅每日一次。

### 前瞻報酬補齊策略：每日更新最近 30 天的未完成事件

每次 Pipeline 執行時，查詢 `event_date >= today - 30 days AND future_returns` 中缺少某天期的事件，以當日最新 `stock_prices_daily` 補齊。

理由：避免每次全表掃描（可能數萬筆），只更新近 30 天窗口內仍有缺少天期的事件，兼顧效率與資料完整性。

### 前端聚合：Server Action 讀 etf_buying_patterns 後在 JS 計算統計

Server Action `getBuyingPatternStats()` 從 DB 取所有事件的 `future_returns` + `pattern_type`，在 Server 端做 reduce 計算各模式各天期的平均報酬和勝率，回傳結構化陣列供前端直接渲染。

理由：計算本身是 O(n × 30) 純數學運算，無需額外 SQL 聚合函數；Server Component 直接呼叫，不暴露原始事件資料給瀏覽器。

## Risks / Trade-offs

- [Risk] stock_prices_daily 缺少部分股票當日價格 → 前瞻報酬為 null，跳過該天期不補，不影響其他天期
- [Risk] 模式判定歷史視窗在 Pipeline 首次執行時沒有足夠歷史（< 60 天）→ 少數模式樣本偏少，屬預期行為，前端顯示樣本數 n
- [Risk] BuyingPatternStep 執行時間過長（掃描 30 天補齊）→ 設輔助步驟（失敗不中斷 Pipeline），並限制補齊批次大小（每次最多 500 筆）
