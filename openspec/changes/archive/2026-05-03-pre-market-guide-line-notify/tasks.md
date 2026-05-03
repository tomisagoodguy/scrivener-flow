## 1. 新增盤前指引 Flex Message 建構模組

- [x] 1.1 新增 `ETF/notifiers/pre_market_notify.py`，在頂部定義常數：`CONSENSUS_BUY_MIN=4`、`CONSENSUS_SELL_MIN=3`、`SINGLE_BET_MIN_NT=300_000_000`、`BASKET_BUY_THRESHOLD=0.5`、`MAX_SHOW_CONSENSUS=5`、`MAX_SHOW_SINGLE=3`
- [x] 1.2 實作 `fetch_latest_flow_row(engine) -> dict | None`：用 SQLAlchemy `text()` 查詢 `etf_flow_daily ORDER BY data_date DESC LIMIT 1`，回傳整列（含 `inflow`、`outflow`、`by_etf`、`totals`、`data_date`、`etfs_covered`、`etfs_lagging`）；查無資料或 `data_date` 超過 2 天則回傳 `None`
- [x] 1.3 實作 `build_pre_market_bubble(row: dict) -> dict`：產生 LINE Flex Message bubble JSON
  - header：`"盤前指引 · M/D · N/21 家已揭露"` (N = `len(etfs_covered)`)
  - 共識買進區：過濾 `inflow` 中 `etf_count >= CONSENSUS_BUY_MIN`，依 `total_nt` 降序取前 `MAX_SHOW_CONSENSUS` 檔，每行格式：`{stock_name} {stock_code}  +X.X億  (etf1、etf2)`
  - 集中加碼區：過濾 `inflow` 中 `etf_count < CONSENSUS_BUY_MIN AND total_nt >= SINGLE_BET_MIN_NT`，取前 `MAX_SHOW_SINGLE` 檔
  - 共識賣出區：過濾 `outflow` 中 `etf_count >= CONSENSUS_SELL_MIN`，取前 `MAX_SHOW_CONSENSUS` 檔；無則顯示「無」
  - footer：淨流向 `totals['net_nt']`（rose 色正數 / emerald 色負數）、`total_in_nt`、`total_out_nt`
  - basket buy 警告行：計算 `by_etf` 中 `net_flow` 最大者，若 `max_net / total_in_nt > BASKET_BUY_THRESHOLD` 則在 footer 加 amber 色警告行
- [x] 1.4 實作金額格式化輔助函式 `nt_to_yi(nt: int) -> str`：`abs(nt)/1e8`，正數前綴 `+`，負數前綴 `-`，取 1 位小數（例：`+2.3億`、`-0.8億`）

## 2. 整合至 NotifyStep

- [x] 2.1 在 `ETF/pipeline/steps/notify_step.py` 的 `execute()` 末尾，在 `return ctx` 之前新增 try/except 區塊：
  1. 從 `pre_market_notify` import `fetch_latest_flow_row`、`build_pre_market_bubble`
  2. 呼叫 `fetch_latest_flow_row(ctx.sql_storage.engine)`
  3. 若 row 不為 None，呼叫 `build_pre_market_bubble(row)` 得到 bubble dict
  4. 呼叫 `notifier.broadcast_flex_message("盤前指引 · {row['data_date']}", bubble)`
  5. log info `"Pre-market guide LINE bubble sent for {data_date}"`
  6. except 區塊：`self.logger.error(f"Pre-market LINE notify failed: {e}")`，不 raise
- [x] 2.2 確認 `NotifyStep` 的 `should_skip` 已涵蓋 dry_run（現有邏輯已有，確認即可）

## 3. 驗證

- [x] 3.1 本地執行（pre_market_notify 模組正常載入，log 出現 WARNING 訊息） `FORCE_RUN=true uv run python ETF/main.py --days 1`，觀察 log 確認出現 `"Pre-market guide LINE bubble sent"` 或 `"Pre-market LINE notify failed"` 之一
- [x] 3.2 確認手機 LINE 收到盤前指引 bubble，共識買進/賣出/淨流向資料與 `etf_flow_daily` 資料庫最新一筆一致
- [x] 3.3 確認 `uv run ruff check ETF/notifiers/pre_market_notify.py` 無錯誤
