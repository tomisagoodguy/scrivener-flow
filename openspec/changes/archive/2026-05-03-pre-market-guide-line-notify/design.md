## Context

`FlowComputeStep` 每日將 `etf_flow_daily` 寫入 Supabase（包含 `inflow`、`outflow`、`by_etf`、`totals` JSONB 欄位）。`NotifyStep` 接在 `FlowComputeStep` 之後執行，已能透過 `notifier.broadcast_flex_message()` 發送 broadcast。

目前 `NotifyStep` 只發送 ETF 持股異動 Carousel，未使用 `etf_flow_daily` 的任何資料。Reference 專案（`reference/tw-active/tools/morning_post.py`）有完整的盤前指引文字產生邏輯可直接參照。

## Goals / Non-Goals

**Goals:**
- 在 `NotifyStep` 中，於 ETF Carousel 發送完後，額外 broadcast 一則盤前指引 Flex Message bubble
- 資料從 `etf_flow_daily` 讀取（透過 `DATABASE_URL` 的 SQLAlchemy 連線，與現有步驟相同）
- 共識買進門檻對齊 reference：`>= 4` 家；共識賣出 `>= 3` 家；集中加碼 `< 4 家且 total_nt >= 3億`
- basket buy 警告：最大 ETF 的 `net_flow / total_in_nt > 0.5` 時顯示橘色警示行
- 輔助功能（try/except 不 raise），失敗不中斷主流程

**Non-Goals:**
- 不修改前端 `PreMarketGuide.tsx` 的門檻值（UI 維持 3 家，LINE 用 4 家對齊 reference）
- 不另建新 Pipeline 步驟，直接在 `NotifyStep` 呼叫
- 不支援歷史補送或手動觸發

## Decisions

### 1. 新檔 `pre_market_notify.py` 而非直接在 `notify_step.py` 擴充

`notify_step.py` 已有 160 行，再擴充 Flex Message 建構邏輯會超過 300 行。
拆到 `ETF/notifiers/pre_market_notify.py`，只暴露一個函式 `build_pre_market_bubble(flow_row) -> dict`。
`NotifyStep.execute()` 讀 DB 後呼叫此函式，再透過現有 `notifier.broadcast_flex_message()` 發送。

### 2. 讀 DB 策略：直接 SQLAlchemy，不透過 Supabase REST

`FlowComputeStep` 已示範用 `ctx.db_conn`（SQLAlchemy engine）讀寫 `etf_flow_daily`。
`NotifyStep` 同樣從 `ctx.db_conn` 讀最新一筆，與現有模式一致，不引入新依賴。

查詢：
```sql
SELECT inflow, outflow, by_etf, totals, data_date, etfs_covered, etfs_lagging
FROM etf_flow_daily
ORDER BY data_date DESC
LIMIT 1
```

### 3. Flex Message 結構：單一 bubble，不加入現有 Carousel

現有 ETF Carousel 已有多個 bubble（overview + market signals + per-ETF diff）。
盤前指引內容性質不同（跨 ETF 資金流，而非個別持股異動），獨立 broadcast 一則 `bubble` 訊息更清晰。
使用者在 LINE 會依序收到：ETF Carousel → 盤前指引 bubble。

### 4. 門檻常數定義在 `pre_market_notify.py` 頂部

```python
CONSENSUS_BUY_MIN = 4   # 對齊 reference/morning_post.py
CONSENSUS_SELL_MIN = 3
SINGLE_BET_MIN_NT = 300_000_000   # 3億
BASKET_BUY_THRESHOLD = 0.5
MAX_SHOW_CONSENSUS = 5   # bubble 最多顯示幾檔
MAX_SHOW_SINGLE = 3
```

## Risks / Trade-offs

- [Risk] `etf_flow_daily` 當日資料尚未寫入（`FlowComputeStep` 失敗或 Pocket ETF 未揭露）→ Mitigation：查到 `data_date` 超過 2 日則跳過不發送，log warning
- [Risk] LINE 每日訊息上限（broadcast 免費方案有月限）→ Mitigation：此功能新增一則，與現有 carousel 合計兩則，仍屬低頻

## Migration Plan

1. 新增 `ETF/notifiers/pre_market_notify.py`
2. 修改 `ETF/pipeline/steps/notify_step.py`：在 `execute()` 末尾加 try/except 呼叫
3. `ETF/pipeline/orchestrator.py` 不需異動（步驟順序不變）
4. 本地測試：`FORCE_RUN=true uv run python ETF/main.py --days 1`，觀察 LOG 確認訊息發送
5. 推送後，次日 GitHub Actions 自動生效

## Open Questions

- 無。門檻值已有 reference 可依據，資料來源已存在。
