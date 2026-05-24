## ADDED Requirements

### Requirement: 三重共識掃描資料查詢
系統 SHALL 提供 `getConsensusSignals` Server Action，從三個維度合併全市場股票的共識信號。

查詢邏輯：
1. 取 `etf_diff_logs` 最新 `data_date`，找出所有 `change_type IN ('BUY','IN')` 的股票 → ETF 加碼集合
2. 取 `strategy_signals` (`fund_momentum`) 最新日期，`score >= 70` 的股票 → 投信買超集合
3. 取 `strategy_signals` 量化策略（super8888 / capital_layer / low_vol_cap / broker_ranked / low_vol_alpha）最新日期，`is_selected = true` → 量化選出集合
4. 以「任一集合有命中」為回傳條件，附帶三個布林欄位與命中策略清單

回傳型別 `ConsensusSignal`：
```ts
{
  stock_id: string
  stock_name: string | null
  date: string
  etf_buying: boolean        // ETF 加碼
  etf_etfs: string[]         // 哪些 ETF 加碼（如 ['00981A','00980A']）
  fund_score: number | null  // fund_momentum score
  fund_buying: boolean       // score >= 70
  strategy_hits: string[]    // 命中的量化策略 id 清單
  consensus_count: number    // 三個維度命中總數（0–3）
}
```

#### Scenario: 三重命中
- **WHEN** 某股票在 etf_diff_logs 有 BUY、fund_momentum score ≥ 70、super8888 is_selected = true
- **THEN** 回傳 `consensus_count = 3`，`etf_buying = true`，`fund_buying = true`，`strategy_hits = ['super8888']`

#### Scenario: 只有 ETF 加碼
- **WHEN** 某股票只在 etf_diff_logs 有 BUY，無投信訊號、無量化訊號
- **THEN** 回傳 `consensus_count = 1`，`etf_buying = true`，`fund_buying = false`，`strategy_hits = []`

#### Scenario: 無任何訊號
- **WHEN** 某股票三個維度均無命中
- **THEN** 該股票不出現在回傳結果中

---

### Requirement: 共識掃描頁面
系統 SHALL 在 `/investment/consensus-signal` 提供全市場三重共識掃描頁面，不限觀察清單。

#### Scenario: 頁面載入
- **WHEN** 使用者訪問 `/investment/consensus-signal`
- **THEN** 顯示最新資料日期、三重 / 雙重 / 單一共識的股票數量摘要卡片、可排序的詳細表格

#### Scenario: 三重共識標籤
- **WHEN** 某股票 `consensus_count = 3`
- **THEN** 在表格該列顯示「三重共識」醒目標籤，優先排在最上方

#### Scenario: 篩選器
- **WHEN** 使用者點擊「只看三重」篩選器
- **THEN** 表格只顯示 `consensus_count = 3` 的股票

#### Scenario: 未登入
- **WHEN** 未登入使用者訪問頁面
- **THEN** 顯示「請先登入」提示

---

### Requirement: SideNav 導覽
系統 SHALL 在投資群組的 SideNav 加入「共識掃描」連結，路徑為 `/investment/consensus-signal`。

#### Scenario: 連結顯示
- **WHEN** 使用者檢視 SideNav 投資群組
- **THEN** 能看到「共識掃描」連結，點擊後導向 `/investment/consensus-signal`

---

### Requirement: ETF 來源標示
系統 SHALL 在表格顯示是哪些 ETF 對該股進行加碼，不只顯示 true/false。

#### Scenario: 多 ETF 同時加碼
- **WHEN** 00981A 和 00980A 同日都對某股 BUY
- **THEN** `etf_etfs` = `['00981A', '00980A']`，前端顯示 ETF 代號 tag
