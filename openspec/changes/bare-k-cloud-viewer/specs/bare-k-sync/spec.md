## ADDED Requirements

### Requirement: Pipeline 每日同步裸K快照

系統 SHALL 在每日 ETF pipeline（UTC 14:00）末端執行 `SyncBareKStep`，聚合所有使用者的 watch_list，計算並 upsert `bare_k_snapshots`。

#### Scenario: 正常同步流程
- **WHEN** ETF pipeline 觸發且 watch_list 中有至少 1 支股票
- **THEN** `SyncBareKStep` 從 `watch_list` 讀取所有使用者的 `stock_id`（union、去重）
- **THEN** 對每支股票呼叫 `BareKService.compute_snapshot(sid, days=240)` 計算 6 個面板的指標
- **THEN** 結果以 `UPSERT ON CONFLICT (stock_id, date) DO UPDATE` 寫入 `bare_k_snapshots`
- **THEN** Step 完成後記錄 log：同步股票數、成功數、失敗數

#### Scenario: watch_list 為空時跳過
- **WHEN** `watch_list` 表中沒有任何資料
- **THEN** `SyncBareKStep` 記錄 `"watch_list is empty, skipping BareK sync"` 並直接回傳 `ctx`，不拋出例外

#### Scenario: 單股計算失敗時繼續
- **WHEN** 某支股票的 FinLab 資料缺失導致計算異常
- **THEN** 該股票的快照跳過（記錄 warning log），不影響其他股票的同步

---

### Requirement: 快照資料計算邏輯等價性

`BareKService.compute_snapshot()` 計算的六個指標 SHALL 與 `裸K看盤.ipynb` 中 `StockAnalyzer._build_fig()` 的邏輯等價。

#### Scenario: OHLCV 資料取 240 日
- **WHEN** 計算某股票快照
- **THEN** OHLCV 取最近 240 個交易日（含 buffer 用於計算 260 日高）
- **THEN** `ohlcv` JSONB 欄位格式為 `[{date, o, h, l, c, v}, ...]`

#### Scenario: 均線與 260 日高
- **WHEN** 計算均線
- **THEN** MA5/20/60/120 以收盤價滾動計算
- **THEN** 260 日高以 `rolling(260, min_periods=130).max()` 計算，需額外 buffer 資料

#### Scenario: 五個訊號條件計算
- **WHEN** 計算訊號條件
- **THEN** `創260高`：收盤 >= 260 日高 × 0.995
- **THEN** `低波動`：蠟燭體積（candle_vol）< 10%（20 日平均 body/price 比）
- **THEN** `融資健康`：融資維持率 2% < rate < 40%
- **THEN** `營收9月高`：2個月移動平均 >= 9個月最大值 × 0.999
- **THEN** `投信買超`：投信 10 日累計買超張數 > 0

#### Scenario: 集保籌碼計算
- **WHEN** 計算集保籌碼面板
- **THEN** 大戶定義為持股分級 11–15，散戶定義為持股分級 1–4
- **THEN** 週頻持股比 `diff(1)` 後 `reindex` 至日頻（非更新日 ffill）
- **THEN** 籌碼 PR 以 `(h2/(h1+h2)).diff(6).rank(pct=True)` 計算並 `reindex` 至日頻

---

### Requirement: 快照存儲格式

`bare_k_snapshots` 表 SHALL 以 JSONB 欄位儲存各面板資料，並包含供總覽頁使用的 `summary` 欄位。

#### Scenario: summary 欄位內容
- **WHEN** 快照儲存完成
- **THEN** `summary` JSONB 欄位包含：`last_price`、`change_pct`（與前日收盤比）、`dist_260_pct`（距 260 高）、`signals`（物件，5 個條件的最後一日布林值）

#### Scenario: Upsert 行為
- **WHEN** 同一 `(stock_id, date)` 的快照已存在
- **THEN** 系統 UPDATE 所有 JSONB 欄位（以最新計算結果覆蓋舊資料）
- **THEN** 不重複 INSERT 造成 unique constraint 違反

---

### Requirement: 股票數量上限保護

`SyncBareKStep` SHALL 在 watch_list 聚合後，最多處理 50 支股票（按 created_at 升序取最早加入的 50 支）。

#### Scenario: 超過 50 支時截斷並記錄
- **WHEN** 聚合後 watch_list 股票總數 > 50
- **THEN** 取 `created_at` 最早的 50 支進行同步
- **THEN** 記錄 warning log：`"watch_list has N stocks, only syncing first 50"`
