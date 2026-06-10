## Context

ETF 持股監控頁（`/investment/[etf]`）目前透過 `etf_diff_logs` 資料表呈現「當日新增/移除持股」，但使用者無法從現有介面判斷近期持股比重是否有系統性位移。`etf_holdings_snapshot` 已存有每個交易日的持股快照（`weight` 為 `number` 型別，單位 %），是近期趨勢計算的現成資料來源，不需要任何 pipeline 修改。

## Goals / Non-Goals

**Goals:**

- 在 ETF 持股頁新增「近5日趨勢」分析區塊，兩個視角：
  - 日對日變動（任一區間 |Δweight| ≥ 1%）
  - 今日累積偏移（今日 vs 各歷史日 |Δweight| ≥ 3%）
- 計算邏輯在 Server Action 完成，不新增 DB 欄位
- 使用現有 `etf_holdings_snapshot` 資料，查詢最近5筆不同 `data_date`

**Non-Goals:**

- 不修改 pipeline 或 DB schema
- 不支援超過5日的回溯
- 不修改 `etf_diff_logs` 的顯示邏輯

## Decisions

### Server Action 查詢策略

取指定 `etfKey` 最近5個不同 `data_date`，每個日期取全量持股（`stock_code, stock_name, weight, rank`）。
用 `DISTINCT data_date ORDER BY data_date DESC LIMIT 5` 取日期清單，再 `IN` 查詢取持股。
**選 Server Action 而非 API Route**：純資料讀取無需 HTTP 語意，與現有 actions 模式一致。

### 計算在 Server 端完成

兩層計算（日對日 diff、今日累積偏移）在 Server Action 內完成後回傳結構化結果，前端只負責渲染。
**理由**：避免把大量原始 snapshot 傳到 client，同時讓計算邏輯可集中測試。

### 閾值

| 分析層 | 閾值 | 說明 |
|--------|------|------|
| 日對日變動 | ≥ ±1% | 捕捉單日顯著移動 |
| 今日累積偏移 | ≥ ±3% | 捕捉近期結構性位移 |

閾值硬編碼在 Server Action 中，不開放前端設定（MVP 範圍）。

### 元件放置位置

`Holdings5DayTrend` 作為獨立 Client Component，插入 `/investment/[etf]/page.tsx` 現有 diff 區塊下方。資料由 page 的 Server Component 取得後以 props 傳入。

## Risks / Trade-offs

- **資料不足**：若某支 ETF 歷史不足5天，分析區塊顯示「資料不足」提示，不報錯。
- **00981A weight 精確度差異**：ezmoney 來源的 weight 欄位精確到小數一位（`10.0`），復華/其他 ETF 精確到三位（`14.739%`）。±1% 閾值在精確度低的資料下可能漏報微小變動，這是可接受的取捨。
- **效能**：查5天 × 全量持股（最多 ~80 筆/天），約 400 筆，不需分頁，查詢成本低。
