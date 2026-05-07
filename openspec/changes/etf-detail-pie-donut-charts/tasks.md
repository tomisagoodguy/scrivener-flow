## 1. 建立前十大持股圓餅圖元件

- [x] 1.1 新增 `src/components/features/investment/EtfHoldingsPieChart.tsx`，接收 `holdings: { code: string; name: string; weight_pct: number }[]` prop，以 recharts `PieChart` 實作 Top-10 holdings pie chart；前 10 名各自一個 slice，其餘合併為「其他」slice
- [x] 1.2 實作 top-10 aggregation 邏輯：依 `weight_pct` 降序排序，取前 10，其餘累加為「其他」；當持股 ≤ 10 時不產生「其他」slice（對應 Requirement: Top-10 holdings pie chart）
- [x] 1.3 實作 hover tooltip：顯示 `股票代號 · 名稱 · 權重 X.XX%`（對應 Scenario: Tooltip on hover）
- [x] 1.4 定義固定色盤（10 色，避免紅綠色以免與台股漲跌色衝突）（對應 Scenario: Color coding follows Taiwan convention）

## 2. 建立今日買進資金佔比 Donut 元件

- [x] 2.1 新增 `src/components/features/investment/EtfBuyDonutChart.tsx`，接收 `diffLogs: DiffLog[]` 與 `holdings: Holding[]` prop，以 recharts `PieChart`（`innerRadius` 設定）實作 Today's buy capital donut chart
- [x] 2.2 實作資料過濾：從 `diffLogs` 篩選 `action === 'BUY' || action === 'IN'`，並從 `holdings` 取對應 `price`，計算 `capital = Math.abs(diff_shares) * price`（對應 Requirement: Today's buy capital donut chart，Scenario: Capital computation）
- [x] 2.3 實作 top-5 aggregation：依 `capital` 降序排序，顯示前 5 支，其餘合併為「其他」arc（對應 Requirement: Stocks beyond top 5 aggregated in donut chart）
- [x] 2.4 實作空狀態：當過濾後無買進紀錄時顯示 `今日無買進紀錄` 文字（對應 Scenario: No buy events today）
- [x] 2.5 實作 hover tooltip：顯示 `股票代號 · 名稱 · X.XX億 · XX.X%`（對應 Scenario: Tooltip on hover）

## 3. 整合至 ETF 詳頁

- [x] 3.1 在 `src/app/investment/[etf]/page.tsx` 的「目前持股」區塊（holdings table 上方）引入並渲染 `EtfHoldingsPieChart`，傳入現有 `holdings` 資料（對應 Requirement: Pie chart placement in ETF detail page）
- [x] 3.2 在 ETF 詳頁的「當日加減碼」Tab 中，diff table 上方引入並渲染 `EtfBuyDonutChart`，傳入 `diffLogs` 與 `holdings`（對應 Scenario: Placement in ETF detail page）
- [x] 3.3 確認兩個圖表在深色模式下 label / tooltip 文字顏色符合 `dark-theme.css` 規範，不被 `!important` 覆蓋
