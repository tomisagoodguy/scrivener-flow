## Context

投資模組已有 00981A ETF 的每日持倉快照（`etf_holdings_snapshot`）與異動記錄（`etf_diff_logs`），以及 ETF Pipeline（`ETF/pipeline/`）的 Step 框架。FinLab 策略目前只能手動執行 Python 腳本，無法在網頁瀏覽，也無法自動與 ETF 持倉交叉比對。

## Goals / Non-Goals

**Goals:**
- Python 策略框架可插件化，新增策略只需新建一個 class，不動框架
- 每日 pipeline 自動執行所有策略並將結果存入 Supabase
- 前端頁面可查看今日各策略持倉，及每支股票的 00981A 動向標記
- 策略框架不綁定特定交易所或 ETF

**Non-Goals:**
- 不實作券商下單介接
- 不在此 change 做策略績效比較或圖表
- 不修改現有 ETF scraper 或快照邏輯

## Decisions

### 策略介面設計：BaseStrategy 抽象類別

每個策略繼承 `BaseStrategy`，只需實作 `get_positions() -> FinlabDataFrame`，回傳 Boolean/numeric DataFrame（index=date, columns=stock_id）。框架統一呼叫並截取最新一行轉為信號列表。

**替代方案**：用 function 而非 class → 拒絕，class 可攜帶 `name`、`description` 等 metadata，未來要在前端顯示策略說明時不需額外設定檔。

### 資料表設計：strategy_signals

```sql
CREATE TABLE strategy_signals (
  id          BIGSERIAL PRIMARY KEY,
  strategy_id TEXT NOT NULL,        -- 'super8888'
  date        DATE NOT NULL,
  stock_id    TEXT NOT NULL,
  score       FLOAT,                -- 原始分數（正規化後）
  is_selected BOOLEAN NOT NULL,     -- 是否在最終持倉
  conditions  JSONB,                -- {"c1":true,"c2":false,...}
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (strategy_id, date, stock_id)
);
```

**替代方案**：每個策略獨立一張表 → 拒絕，單表可跨策略聚合查詢，前端不需多次 API 呼叫。

### Pipeline 整合：StrategySignalStep 為輔助步驟

`StrategySignalStep` 歸類為輔助步驟（失敗不中斷 pipeline），與 `NotifyStep` 同級。FinLab 資料拉取失敗或 Supabase 寫入失敗只 log error，不影響每日 ETF 快照。

**原因**：策略計算需要 FinLab API（外部依賴），若 FinLab 服務異常不應影響核心 ETF 資料更新。

### 前端查詢：Server Action + Supabase JOIN

`getStrategySignals(date)` Server Action 查詢 `strategy_signals`，JOIN `etf_holdings_snapshot`（持倉狀態）與 `etf_diff_logs`（近 7 日動向）產生交叉資料後回傳前端。前端不直接查詢 DB，全部在 Server Action 聚合。

### 00981A 動向標記四類

| 標記 | 條件 |
|------|------|
| `adding` | 近 7 日 `etf_diff_logs` 有 BUY/IN，`diff_weight > 0` |
| `reducing` | 近 7 日有 SELL/OUT，`diff_weight < 0` |
| `holding` | `etf_holdings_snapshot` 持有中，無近期異動 |
| `none` | 不在 00981A 持倉內 |

## Risks / Trade-offs

- [FinLab quota] 策略計算每日消耗 FinLab API 配額（5GB VIP），多策略疊加可能超限 → 緩解：`StrategySignalStep` 在所有 ETF 步驟完成後執行，避免尖峰競爭；監控用量
- [月頻資料滯後] `rev`（月營收）每月初才更新，月中的策略信號反映的是上個月的營收條件 → 已知限制，在前端加說明文字標註「營收條件以最新公告日為準」
- [策略執行時間] 多策略疊加可能讓 Pipeline 執行時間超過 GitHub Actions 6 小時上限 → 每個策略設定 30 分鐘 timeout，超時視為失敗並 log
