## Context

`/investment/sectors` 目前以列表/熱力格式呈現族群強弱，沒有全市場個股佈局的視覺化。大盤廣度（市場有多少股票參與上漲）在 App 中完全缺席。這兩項是 ETF 加碼決策最常查閱的前置指標。

參考實作：
- `reference/tw_stock_treemap.py`：Plotly treemap，利用 FinLab `etl:adj_close` + `etl:market_cap` + 族群分類
- `reference/advance_decline_line.py`：ADL/ADR 計算邏輯，利用 FinLab `etl:adj_close`

現有圖表庫：`recharts ^3.7.0`（已有 `Treemap` 元件），不需引入新依賴。

## Goals / Non-Goals

**Goals:**

- 在 `/investment/sectors` 新增「熱力圖」tab，以族群分組的全市場個股 Treemap 呈現當日漲跌格局
- 新增 `/investment/breadth` 頁面，展示 ADL 累積騰落線（MA5/MA60）與 ADR 騰落比折線圖
- ETF Pipeline 新增輔助步驟，每日預計算並寫入 Supabase（`market_treemap_daily`、`market_breadth_daily`）

**Non-Goals:**

- 不支援 Treemap 個股點擊跳轉至個股詳情（第一版保持唯讀）
- 不支援 Treemap 即時更新（每日盤後更新即可）
- 不修改現有 `sector_strength_stats` 資料表結構
- 不在 LINE 報告附加廣度摘要（獨立功能，不在此 change 範圍）

## Decisions

### 使用 recharts Treemap 而非引入新圖表庫

recharts `<Treemap>` 已在 `package.json` 中，支援 `customized` 渲染，可實作台股紅漲綠跌色彩慣例。D3 或 Plotly 有更高互動性，但增加 bundle size 且超出當前需求。

### 資料預計算寫入 Supabase（Pipeline → DB → Server Action）

FinLab API 每次 `data.get('etl:adj_close')` 約 50–200 MB，不適合每個 web 請求重算。Pipeline 每日執行一次，結果寫入 Supabase，前端透過 Server Action 查詢，避免重複消耗 FinLab 配額。

**替代方案**：在 Next.js Server Action 中呼叫 FinLab API → 因配額風險否決。

### 兩個步驟皆為輔助步驟（錯誤不中斷 Pipeline）

`SyncTreemapStep` 和 `SyncAdlStep` 失敗不影響核心 00981A diff log 流程。依照 `.claude/rules/etf-pipeline.md` 規範，`except` 區塊只 log，不 raise。

### ADL 計算視窗：全市場上市櫃股票，不設市值門檻

與 `reference/advance_decline_line.py` 一致，使用 `etl:adj_close` 全部股票計算騰落。Benchmark = 1（昨日收盤價為基準），與原始實作相同。

### Treemap 資料表只保留最近 90 天

每日快照資料量大（~1,700 筆/日），保留 90 天（約 63 個交易日）供前端切換日期使用；ADL 表保留全部歷史（每日僅 1 筆）。

## DB Schema

### `market_treemap_daily`

```sql
date           DATE       NOT NULL
stock_code     TEXT       NOT NULL
stock_name     TEXT
industry       TEXT
market_cap     BIGINT
close          NUMERIC
change_pct     NUMERIC
PRIMARY KEY (date, stock_code)
```

### `market_breadth_daily`

```sql
date      DATE    PRIMARY KEY
ups       INT
downs     INT
net       INT
adl       NUMERIC
adr       NUMERIC
adl_ma5   NUMERIC
adl_ma60  NUMERIC
adr_ma5   NUMERIC
adr_ma60  NUMERIC
```

## Risks / Trade-offs

- [Risk] recharts Treemap 的 tooltip 自訂有限 → 接受，第一版只顯示股名 + 漲跌幅
- [Risk] `market_treemap_daily` 每日 ~1,700 行，90 天約 10 萬行，Supabase free tier 500MB 需留意 → 監控儲存用量，超過 80% 縮短保留天數
- [Risk] 某些股票在 FinLab `etl:market_cap` 資料缺失 → 以 `close * shares` 估算，或填入 0 並在前端過濾

## Migration Plan

1. 新增 `supabase/migrations/<timestamp>_add_market_visualization_tables.sql`（含兩張新表 + Index）
2. 在 `ETF/pipeline/orchestrator.py` 的 `NotifyStep` 之前插入 `SyncTreemapStep` 和 `SyncAdlStep`
3. 前端 Server Actions 讀取新表，sectors page 新增 tab
4. Rollback：刪除兩張表 + 移除 pipeline steps，不影響現有功能
