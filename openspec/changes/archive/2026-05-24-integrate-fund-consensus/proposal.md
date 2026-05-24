## Why

投信追蹤（`/investment/fund-tracker`）和共識掃描（`/investment/consensus-signal`）目前是孤立的獨立頁面，使用者需要在多頁之間切換才能把「ETF 買進 ＋ 投信動能 ＋ 量化策略」三個維度對應到同一支股票。把這些訊號融入選股池、策略選股、族群強弱三個決策頁面，讓共識資訊在使用者原本的分析動線中自然呈現。

## What Changes

- **選股池**（`/investment`）：每支股票行加入「投信連買天數」欄與「共識等級」badge；頁面 header 新增「三重共識」快篩 toggle
- **策略選股**（`/investment/strategy`）：策略命中股票卡片標註投信動能狀態（累積循環偵測）和共識等級；三重確認股票視覺上最突出
- **族群強弱**（`/investment/sectors`）：族群列新增「投信淨買超集中度」指標；展開成分股時每支標註投信連買天數
- 移除（或 park）`/investment/fund-tracker` 和 `/investment/consensus-signal` 兩個獨立路由（資訊已融入上方三頁，獨立頁面失去必要性）

## Capabilities

### New Capabilities
- `fund-consensus-integration`: 將投信動能與共識等級作為跨頁共用的一級指標，融入選股池、策略選股、族群強弱三個頁面

### Modified Capabilities
- `fund-momentum-signal`: 從僅限 fund-tracker 頁面使用，擴展為可被三個目標頁面共用的 server action（介面不變，新增呼叫端）
- `fund-tracker-page`: 獨立頁面功能移入其他頁面後 park 或移除
- `stock-picker-hub-decomposition`: 選股池新增共識快篩維度
- `sector-strength-web`: 族群強弱頁面新增投信集中度欄位
- `strategy-signal-compute`: 策略選股視圖新增投信 + 共識 overlay

## Impact

- **資料層**：`getFundMomentumSignals()`、`getConsensusSignals()` 兩支 server action 需確認可被多頁並行呼叫，確認無 user-scope 限制
- **前端**：三頁各需調整 UI 元件加入新欄位；選股池 StockPickerHub 元件行寬需重新規劃
- **路由**：`/investment/fund-tracker` 和 `/investment/consensus-signal` 視確認後決定保留（降優先）或移除
- **效能**：三頁都多一次 server action 呼叫，需確認是否可 cache 或合併
