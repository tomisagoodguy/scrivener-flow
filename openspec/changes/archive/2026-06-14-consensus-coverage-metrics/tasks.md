## Tasks

### 1. 取得當日 active ETF 分母（支援 Requirement: Coverage percentage column）

- [x] 在 `src/app/investment/consensus/page.tsx` 的 `fetchConsensus()` 內，於查得 `queryDate` 後，新增一筆查詢從 `etf_holdings_snapshot` 取 `data_date = queryDate` 的 distinct `etf_code` 數量作為 `activeEtfCount`，連同 `data` 與 `date` 一起回傳。
- [x] 分母為 0 或查詢失敗時，`activeEtfCount` 回傳 0，由顯示層處理 `—` fallback（不得除以零）。

### 2. 衍生欄位顯示

- [x] [P] 實作 Requirement: Coverage percentage column — 在 `thead`「持有 ETF 數」與「合計權重」之間新增「覆蓋率 %」標題；`tbody` 每列顯示 `activeEtfCount > 0 ? (row.etf_count / activeEtfCount * 100).toFixed(1) + '%' : '—'`。
- [x] [P] 實作 Requirement: Average weight column — 在「合計權重」欄左側新增「平均 weight」標題與儲存格 `row.etf_count > 0 ? (row.total_weight / row.etf_count).toFixed(2) + '%' : '—'`，沿用既有 `font-mono` 數字樣式。

### 3. 揭露與說明

- [x] 實作 Requirement: Derived columns explainer panel — 在共識頁 header `.glass-card` 之下、表格之上新增一個 `.glass-card` 說明框，分三點說明覆蓋率 %（= 持有 ETF 數 ÷ 當日有資料 ETF 數）、平均 weight（= 合計權重 ÷ 持有 ETF 數，忽略各 ETF AUM 差異）、合計權重（基數不同不可直接加，僅供排序、無實際比例意義）。
- [x] 實作 Requirement: Total weight caveat disclosure — 在「合計權重」欄標題加上可見警語（title 提示或括號附註），指出僅供排序、無實際比例意義。

### 4. 驗證

- [x] 執行 `yarn build` 確認型別與靜態 build 通過（注意 `useSearchParams` 不得新引入未包 Suspense 的元件）。
- [x] 本地 `yarn dev` 開啟 `/investment/consensus`，確認覆蓋率 %、平均 weight 數值正確（以 2330 為例：13/22 → 59.1%），說明框與警語顯示正常，分歧 tab 行為未受影響。
