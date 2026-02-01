# Design: 00981A 成分股動能 K 線圖

## 系統架構

### 1. 資料庫設計 (Supabase)

新增 `stock_prices_daily` 表：

- `stock_code`: 股票代碼 (Primary Key Part 1)
- `data_date`: 日期 (Primary Key Part 2)
- `open`: 開盤價
- `high`: 最高價
- `low`: 最低價
- `close`: 收盤價
- `volume`: 成交量 (單位：張)
- `currency`: 幣別 (預設 TWD)

### 2. 資料同步流程 (Python)

修改 `ETF/main.py` 與 `ETF/services/finlab_service.py`：

- 在更新完持股快照後，找出所有現有代碼。
- 從 Finlab 抓取這些代碼的 `price:開盤價`, `price:最高價`, `price:最低價`, `price:收盤價`, `price:成交股數`。
- 只抓取最近 250 個交易日的數據。
- 使用 `Upsert` 方式存入 Supabase，確保數據不重複且最新。

### 3. API 設計 (Next.js)

建立 `src/app/api/investment/prices/route.ts`：

- 接收 `GET` 請求，參數 `code`。
- 從 Supabase 查詢對應 `stock_code` 的所有歷史價格，按日期升序排列。
- 回傳符合 `lightweight-charts` 格式的 JSON 陣列。

### 4. 前端介面 (React)

- **套件**：`npm install lightweight-charts`
- **組件 `PriceChartModal`**：
  - 接入 `Lucide` 圖表圖示。
  - 使用 `useEffect` 初始化 TradingView 圖表。
  - 雙圖層設計：上面是 Candlestick (K 線)，下面分欄是 Volume (成交量)。
- **交互**：
  - 修改 `HoldingsTable.tsx`，在代碼或列上加入點擊事件。
  - 點擊後開啟 Modal 並傳入 `stockCode` 與 `stockName`。

## 替代方案評估

- **方案 A: 前端直接呼叫 Finlab**
  - *缺點*：會造成 API Key 洩漏至瀏覽器，且 Finlab 不支援 CORS 私人調用。
- **方案 B: 每次點擊才由 Server 抓取**
  - *缺點*：速度太慢 (Python 啟動與 Finlab 獲取需數秒)，體驗差。
- **方案 C: 預先同步 (最終選擇)**
  - *優點*：點擊即顯示 (毫秒級)，且資料庫已存有數據，方便未來做更多量化計算。
