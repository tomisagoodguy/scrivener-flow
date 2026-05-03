## Why

盤前指引（共識買進/賣出/淨流向）已實作於投資儀表板 UI，但每日 ETF pipeline 的 LINE 通知完全沒有包含此資訊。使用者需要在開盤前透過 LINE 接收當日主動 ETF 經理人資金流向摘要，而不必主動開啟 App 查看。

## What Changes

- 在 ETF pipeline 的 `NotifyStep` 執行後，額外發送一則「盤前指引」Flex Message bubble 至 LINE
- 資料來源：已有的 `etf_flow_daily` 表（`FlowComputeStep` 每日寫入）
- 內容格式對齊 `reference/tw-active/tools/morning_post.py` 的文字結構，轉為 Flex Message 視覺卡片
- 以 broadcast 方式發送（與現有 ETF carousel 相同頻道）
- 共識買進門檻對齊 reference：`>= 4` 家（目前 UI 是 3，此次 LINE 通知用 4）

## Capabilities

### New Capabilities

- `pre-market-line-notify`: 每日 pipeline 結束後，讀取 `etf_flow_daily` 最新一筆，產生並 broadcast 盤前指引 Flex Message bubble，包含共識買進（>= 4 家）、集中加碼（< 4 家且 >= 3 億）、共識賣出（>= 3 家）、淨流向摘要、basket buy 警告（單一 ETF > 50%）

### Modified Capabilities

(none)

## Impact

- Affected specs: `pre-market-line-notify` (new)
- Affected code:
  - New: `ETF/notifiers/pre_market_notify.py`
  - Modified: `ETF/pipeline/steps/notify_step.py`
  - Modified: `ETF/pipeline/orchestrator.py`
