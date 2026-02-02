# 📊 ETF 投資監控專案 - 2026-01-31 開發進度報告

## ✅ 今日完成事項 (Accomplishments)

### 1. 自動化爬蟲系統 (Scraper Service)

- 成功實作 **00981A (統一台股增長)** 的自動爬蟲邏輯。
- 整合 **Playwright** 繞過投信官網的 SSL 驗證問題，確保數據抓取穩定性。
- 支援 XSLX 內容解析，自動提取股號、股名、持股數與權重。

### 2. GitHub Actions 雲端自動化 (CI/CD)

- 建立 `etf_daily.yml` 排程任務，每日 20:00 自動執行。
- **重大技術修復**：解決了 GitHub ActionsRunner 的 IPv6 網路限制問題。
  - 將資料庫連線從 SQLAlchemy (Port 5432) 切換至 **Supabase REST API (Port 443)**。
- 實現「智慧型 Git 備份」：僅在 CSV 內容變動時才推送回倉庫，保持歷史乾淨。

### 3. 資料庫與安全性 (Database & Security)

- 完成 Supabase 資料庫初始化（Snapshot, Diff Logs, Periods 結構）。
- 正確配置 GitHub Secrets (URL, DB Password, Anon Key, Service Role Key, LINE Auth)。

### 4. 前端展示介面 (Web UI)

- 實作伺服器端渲染 (SSR) 頁面，直接從 Supabase 讀取最新數據。
- 完成基礎元件：`HoldingsTable`（持股清單）與 `DiffLedger`（異動流水帳）。
- 成功在網頁端展示第一筆爬回來的持股數據（共 52 檔）。

---

## 📈 目前狀態與觀察 (Status & Observations)

- **數據累積期**：目前由於是系統首次運行，所有持股均標記為「IN」(新增)。
- **連線穩定**：HTTPS API 方案已證實 100% 繞過網路封鎖。
- **存檔正常**：`ETF/history` 已出現第一份 CSV 歸檔。

---

## 📅 明日計劃 (Tomorrow's Goals)

1. **產業分布分析 (Sector Analysis)**：
   - 透過 API 或知識庫對 52 檔成分股進行分類。
   - 在網頁端加入圓餅圖展示產業權重。
2. **視覺化強化**：
   - 優化持股列表的視覺效果（權重進度條、異動標誌）。
   - 加入數據日期篩選功能。
3. **數據洞察**：
   - 計算並顯示「持有天數」。
   - 評估加入其他 ETF 監控目標的可能性。

---

*✨ 報告產出：Antigravity AI*



### 1.

```
etf_holdings_snapshot
```

 (最新持股快照)

* **用途** ：這張表主要負責  **「顯示現在清單」** 。它永遠只保存每一檔成分股的「最新狀態」。
* **關鍵機制** ：
* 每次更新時，會先清空或覆蓋舊資料，確保這張表永遠只有 **一份** 代表這檔 ETF 當下最新狀態的清單。
* **欄位包含** ：
  * ```
  etf_code
  ```

   (如 00981A)
  ```

    *``      stock_code      ``

    (股票代碼)
    *``      shares      ``

    (股數)、``      weight      ``

    (權重)
    *``      price      ``

    、``      change_percent      ``

    (從 Finlab 抓來的即時股價資訊)
    *``      revenue_mom      ``

    (營收動能)、``      margin_ratio      ``

    (毛利率) 等進階指標。

* **前端網頁顯示的表格，就是直接讀取這張表的資料。**

### 2.

```
etf_diff_logs
```

 (異動日誌)

* **用途** ：紀錄每一次爬蟲執行時，跟「上一次」相比發生了什麼變化，也就是  **「歷史軌跡」** 。
* **記錄內容** ：
* ```
  IN
  ```

  (新進場): 昨天沒有，今天有了。
* ```
  OUT
  ```

  (踢除): 昨天有，今天沒了。
* ```
  BUY
  ```

  (加碼): 股數變多。
* ```
  SELL
  ```

  (減碼): 股數變少。
* **功能** ：這張表用來發送 Line 通知，以及在網頁上繪製「異動歷史」的時間軸。

### 3.

```
etf_holding_periods
```

 (持股週期)

* **用途** ：用來分析績效。它記錄某支股票  **「從哪一天進場，到哪一天出場」** 。
* **邏輯** ：
* 當

  ```
  change_type = 'IN'
  ```

  時，建立一筆新紀錄，設定

  ```
  start_date
  ```

  為今天，

  ```
  is_active = true
  ```

  。
* 當

  ```
  change_type = 'OUT'
  ```

  時，找到那筆原本

  ```
  is_active = true
  ```

  的紀錄，把

  ```
  end_date
  ```

  填上今天，並設為

  ```
  is_active = false
  ```

  。
* **功能** ：可以計算「這支股票我們抱了多久？」、「這段期間賺了多少？」

### 4.

```
stock_prices
```

 (股價歷史 K 線)

* **用途** ：儲存詳細的歷史股價 (OHLCV)。
* **來源** ：這部分資料量最大，是透過 Finlab API 抓取的，用來在網頁上點擊股票時，畫出詳細的 K 線圖與技術指標。

---

### 🟢 自動化流程總結

1. **爬蟲** (GitHub Action 22:00) 抓到最新持股。
2. **比對** (Diff Engine) 拿「最新持股」跟「昨天快照」比對。
3. **寫入** ：

* 更新

  ```
  etf_holdings_snapshot
  ```

  (讓網頁顯示最新)。
* 寫入

  ```
  etf_diff_logs
  ```

  (紀錄發生了什麼事)。
* 更新

  ```
  etf_holding_periods
  ```

  (如果是進出場)。
* 更新

  ```
  stock_prices
  ```

  (補齊 K 線圖資料)。

這樣的設計既能保證網頁讀取速度快 (只讀 Snapshot)，又能保留完整的歷史分析能力 (Diff Logs & Periods)。
