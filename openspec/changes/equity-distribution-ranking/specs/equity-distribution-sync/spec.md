## ADDED Requirements

### Requirement: 動態取得 ETF 成分股池
同步腳本 SHALL 從 `etf_holdings_snapshot` 查詢 `DISTINCT stock_code` 作為目標股票池，不得硬編碼 ETF 代碼或股票代碼，確保新增 ETF 後自動涵蓋其成分股。

#### Scenario: 新 ETF 加入後自動涵蓋
- **WHEN** 新 ETF 成分股已寫入 `etf_holdings_snapshot`
- **THEN** 下次週同步執行時，腳本自動包含該 ETF 的所有成分股，不需修改腳本

#### Scenario: 成分股池為空時
- **WHEN** `etf_holdings_snapshot` 無任何資料
- **THEN** 腳本記錄 warning 並提前結束，不寫入任何資料

---

### Requirement: 從 FinLab 取最近兩期股東分散表
腳本 SHALL 呼叫 FinLab API 取得目標股票池的股東分散表，取最近兩個公告日（current 和 prev）的資料。

#### Scenario: 成功取得兩期資料
- **WHEN** FinLab 回傳至少兩期股東分散表資料
- **THEN** 腳本計算 current 與 prev 之間的 `shareholders_change_rate` 和 `big_holder_pct_change`

#### Scenario: TDCC 本週無新公告（資料日期與上週相同）
- **WHEN** FinLab 最新資料日期與上次寫入 DB 的 `snapshot_date` 相同
- **THEN** 腳本跳過寫入，記錄 info log「本週無新公告，略過」，結束執行

#### Scenario: FinLab API 失敗
- **WHEN** FinLab API 呼叫拋出例外
- **THEN** 腳本記錄 error 並結束，不寫入任何資料（不靜默失敗）

---

### Requirement: 計算大戶持股比例
腳本 SHALL 將 TDCC 持股分散表中「400 張以上」各級距的持股比例加總，作為 `big_holder_pct`；大戶級距閾值 SHALL 以腳本頂部常數 `BIG_HOLDER_LOTS_THRESHOLD = 400` 定義，方便調整。

#### Scenario: 計算大戶持股比例
- **WHEN** 取得某支股票某日的分散表資料
- **THEN** `big_holder_pct` = 所有持股 ≥ BIG_HOLDER_LOTS_THRESHOLD 的級距持股比例加總

#### Scenario: 某股無該日資料
- **WHEN** 某股票在特定日期無股東分散表資料
- **THEN** 跳過該股，不寫入該筆，繼續處理其他股票

---

### Requirement: Upsert 寫入 equity_distribution_stats
腳本 SHALL 以 `(stock_code, snapshot_date)` 為唯一鍵執行 upsert，確保重複執行冪等。

#### Scenario: 首次寫入
- **WHEN** 該 (stock_code, snapshot_date) 組合尚不存在
- **THEN** INSERT 新記錄

#### Scenario: 重複執行
- **WHEN** 相同 (stock_code, snapshot_date) 已存在
- **THEN** UPDATE 所有欄位（冪等，結果不變）

---

### Requirement: GitHub Actions 每週排程
`.github/workflows/equity_weekly.yml` SHALL 在每週一 01:00 UTC 自動執行同步腳本，並在失敗時於 Actions log 顯示完整錯誤。

#### Scenario: 正常執行
- **WHEN** 週一 01:00 UTC 觸發
- **THEN** 腳本執行完畢，Actions job 顯示 success

#### Scenario: 腳本失敗
- **WHEN** 同步腳本以非零退出碼結束
- **THEN** Actions job 顯示 failure，可由 GitHub 通知機制告知維護者
