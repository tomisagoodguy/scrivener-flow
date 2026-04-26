## Why

個股頁目前只有技術面、籌碼面分析，看不出持有這支股票的 ETF 經理人目前是賺是賠、用了多少成本買進。ETF 頁也缺乏「單股進出場」視角，無法快速判斷每個成分股對組合的貢獻。補上這層損益資訊，可讓使用者直接判斷「經理人在這個部位上是贏家還是輸家」。

## What Changes

- 個股頁（`/investment/stock/[code]`）新增「**經理人損益**」區塊：列出所有持有此股票的 ETF，各別顯示損益卡片（損益額、報酬率、目前市值、累計成本）+ P&L 曲線圖
- ETF 頁（`/investment/[etf]`）新增「**單股進出場**」tab（對齊 reference preview 頁設計）：  
  - 左側選股清單（依報酬率排序）  
  - 右側選定個股的損益卡片 + 股數/股價雙軸圖 + 加減碼事件時間軸（ENTRY / ADD / REDUCE / EXIT）
- 新增 Server Action `getStockManagerPnl(stockCode)`：對單一個股跨所有持倉 ETF 計算損益
- 新增 Server Action `getEtfStockPnl(etfCode, stockCode)`：計算特定 ETF 對特定個股的完整損益序列
- 計算邏輯：`CF_t = -Δshares_t × close_t`；`P&L = MV_now + ΣCF`；`cost_basis = Σmax(0,-CF_t)`；`return_pct = P&L / cost_basis × 100`

## Capabilities

### New Capabilities

- `manager-pnl-card`: 單一 ETF 對單一個股的損益摘要卡片（損益額、報酬率、市值、成本、P&L 曲線）
- `etf-stock-trade-view`: ETF 頁「單股進出場」tab，含選股列表 + 加減碼事件時間軸
- `stock-manager-pnl-section`: 個股頁「經理人損益」區塊，跨所有持倉 ETF 並列損益卡片

### Modified Capabilities

（無現有 spec 需更動）

## Impact

- **資料來源**：`etf_weight_history`（含 `shares` 欄位）+ `stock_prices_daily`（收盤價）+ `etf_diff_logs`（加減碼事件）
- **新增 Server Actions**：`src/app/actions/investmentPnl.ts`
- **修改頁面**：`src/app/investment/stock/[code]/page.tsx`（加區塊）、`src/app/investment/[etf]/page.tsx`（加 tab）
- **新增元件**：`src/components/features/investment/ManagerPnlCard.tsx`、`src/components/features/investment/EtfStockTradeView.tsx`
- **資料限制**：損益歷史深度取決於 `etf_weight_history` pipeline 開始日（約 2025-05 起），早於此日的進場成本無法回溯計算，卡片需顯示資料起算日作為免責提示
