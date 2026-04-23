## ADDED Requirements

### Requirement: FlowComputeStep 每日跨 ETF 資金流計算

Pipeline SHALL 包含 `FlowComputeStep`，於 `OverlapComputeStep` 之後執行，計算當日跨所有主動 ETF 的個股資金流向並寫入 `etf_flow_daily`。

**計算規則：**
- 資金流 NT$ = Δshares × 當日收盤價（`stock_prices_daily.close`）
- 過濾門檻：`|Δshares / prev_shares| ≥ 3%` 且該股最大持倉比重 ≥ 0.3pp（排除微調）
- 揭露狀態：以 `etf_diff_logs` 中當日有資料的 ETF 為 `covered`，其餘已知 ETF 為 `lagging`
- 異動類型（kind）：`new`（新建倉 IN）、`add`（加碼 BUY）、`reduce`（減碼 SELL）、`exit`（出清 OUT）

#### Scenario: 正常計算寫入
- **WHEN** `FlowComputeStep.run()` 執行且當日有 `etf_diff_logs` 資料
- **THEN** 計算所有通過門檻的個股資金流，以 `(data_date)` 為鍵 upsert 到 `etf_flow_daily`

#### Scenario: 為輔助步驟
- **WHEN** `FlowComputeStep` 拋出例外
- **THEN** 記錄 ERROR log，不 raise，不中斷 pipeline

#### Scenario: 部分 ETF 未揭露
- **WHEN** 當日只有部分 ETF 有資料（如 14/21）
- **THEN** 正常計算已揭露 ETF，`etfs_lagging` 欄位記錄未揭露清單，前端顯示「X/21 家已揭露」

---

### Requirement: etf_flow_daily 資料表

系統 SHALL 建立 `etf_flow_daily` 資料表，每列代表某個交易日的跨 ETF 資金流快照：

欄位：
```
data_date        DATE        PK
etfs_covered     TEXT[]      已揭露 ETF 清單
etfs_lagging     TEXT[]      延遲揭露 ETF 清單
inflow           JSONB       流入個股列表（排序 by ntd DESC）
outflow          JSONB       流出個股列表（排序 by ntd ASC）
by_etf           JSONB       各 ETF 小計
totals           JSONB       { ntd_in, ntd_out, net, n_stocks_touched }
```

`inflow` / `outflow` JSONB 結構（每筆個股）：
```json
{
  "code": "2454",
  "name": "聯發科",
  "ntd": 1831410000,
  "delta_shares": 798000,
  "etfs_buy": 6,
  "etfs_sell": 0,
  "etfs": [
    { "etf": "00981A", "ntd": 1193400000, "delta_shares": 520000, "kind": "add" }
  ]
}
```

#### Scenario: Migration 建立
- **WHEN** 執行對應 migration
- **THEN** 資料表建立，PK 為 `data_date`，RLS 公開讀取

#### Scenario: Backfill 歷史資料
- **WHEN** 執行 backfill 腳本，從 `etf_diff_logs` + `stock_prices_daily` 重算歷史
- **THEN** 可從 `reference/tw-active/site/preview/flow.json` 驗證最新一日數字

---

### Requirement: 資金流向儀表板前端頁面

`/investment` 選股池 SHALL 新增「資金流向」Tab（與現有選股池、分析、異動等 Tab 並列），展示當日跨 ETF 資金流向。

#### Scenario: 頁面頂部摘要列
- **WHEN** 使用者切換到「資金流向」Tab
- **THEN** 頂部顯示 4 個數字：總流入（NT$億）、總流出（NT$億）、淨流向（NT$億）、涉及股數；旁邊顯示「X/21 家已揭露」標示，未揭露 ETF 列表可 hover 展開

#### Scenario: 揭露延遲警示
- **WHEN** `etfs_lagging` 不為空
- **THEN** 頂部顯示黃色提示條：「部分 ETF 揭露延遲，未納入本日聚合：00983A 00986A…」

#### Scenario: 00981A 籃子買入注意
- **WHEN** 資料日期當日 00981A 出現大規模整體加碼（basket buy 特徵）
- **THEN** 在 00981A 相關資料旁顯示 ⚠️ 提示：「00981A 當日若有大額申購，basket buy 為被動操作，非主觀選股決策」

#### Scenario: 資金流入列表
- **WHEN** 「資金流向」Tab 載入完成
- **THEN** 左側（或上方區塊）顯示流入排行：個股代號、名稱、合計 NT$（億）、Δ 張數、買入 ETF 數；點擊展開各 ETF 明細（ETF 代號徽章 + 各自 NT$ + kind 標籤 new/add）

#### Scenario: 資金流出列表
- **WHEN** 「資金流向」Tab 載入完成
- **THEN** 右側（或下方區塊）顯示流出排行：個股代號、名稱、合計 NT$（億）、Δ 張數；點擊展開各 ETF 明細（kind 標籤 reduce/exit）

#### Scenario: 分 ETF 小計
- **WHEN** 使用者點擊「分 ETF 小計」切換
- **THEN** 改為以 ETF 為維度展示：每支 ETF 當日淨流向 NT$、買入幾檔、賣出幾檔

#### Scenario: 點擊個股開啟 StockDetailPanel
- **WHEN** 使用者點擊流入/流出列表中的個股
- **THEN** 右側滑出 `StockDetailPanel` 顯示該股完整資訊

#### Scenario: 歷史日期切換
- **WHEN** 使用者點擊日期選擇器選擇前一交易日
- **THEN** 載入該日的 `etf_flow_daily` 資料，頁面更新為歷史日期視圖

---

### Requirement: 資金流向與選股訊號整合

`FlowComputeStep` 計算完成後，SHALL 將「多 ETF 同日買入同一檔股票」的事件寫入 `etf_signals`（signal_type = `cross_etf_same_day_buy`），補充現有訊號系統。

#### Scenario: 多 ETF 同日買入訊號
- **WHEN** 某股當日被 ≥ 3 支 ETF 同時出現 add/new 異動且通過流量門檻
- **THEN** 寫入 `etf_signals`（signal_type = `cross_etf_same_day_buy`，strength 依買入 ETF 數：3=1, 4=2, 5+=3）

#### Scenario: 訊號與 StockDetailPanel 整合
- **WHEN** 使用者開啟某股的 `StockDetailPanel`
- **THEN** 訊號區塊顯示該股是否有 `cross_etf_same_day_buy` 訊號，並說明「X 家 ETF 經理人同日加碼」
