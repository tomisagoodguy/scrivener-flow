# Spec: Frontend Component Decomposition

## ADDED Requirements

### Req: Custom Hooks for Data Fetching

新增專責 Hooks 處理 API 資料獲取與 UI 元件分離。

- #### Scenario: usePriceData Hook Returns Correct Structure

  - **Given** stockCode 為 2330。
  - **When** usePriceData(stockCode) 被調用。
  - **Then** 應回傳包含 data、loading、error 屬性的物件。

- #### Scenario: Loading State Correct

  - **Given** API 請求進行中。
  - **When** UI 渲染。
  - **Then** loading 應為 true 且 data 應為空陣列。

- #### Scenario: Error State Correct

  - **Given** API 請求失敗。
  - **When** UI 渲染。
  - **Then** error 應包含 Error 物件且 loading 應為 false。

### Req: HoldingsFilterBar Component

新增獨立的篩選條件 UI 元件。

- #### Scenario: Filter Buttons Display

  - **Given** HoldingsFilterBar 渲染。
  - **When** 使用者查看。
  - **Then** 應顯示所有可用的篩選條件按鈕如三個月新高和營收優等。

- #### Scenario: Filter Toggle Callback

  - **Given** 使用者點擊三個月新低篩選按鈕。
  - **When** 按鈕被點擊。
  - **Then** 應調用 onFilterChange callback 並更新 UI 狀態。

### Req: useHoldingsFilter Hook

新增篩選與排序邏輯的 Custom Hook。

- #### Scenario: Filter Logic Execution

  - **Given** holdings 資料與 activeFilters 包含 three_month_high。
  - **When** useHoldingsFilter 被調用。
  - **Then** 應回傳符合條件的篩選結果。

- #### Scenario: Sort Logic Execution

  - **Given** sortConfig 設定為 field weight 和 order desc。
  - **When** Hook 執行。
  - **Then** 回傳的資料應依權重降序排列。

### Req: ChartNavigator Component

新增圖表導航控制元件用於切換檢視不同股票。

- #### Scenario: Next Navigation

  - **Given** 當前顯示 holdings 索引 5 的圖表。
  - **When** 使用者點擊下一筆按鈕。
  - **Then** 應切換至索引 6 並觸發 onIndexChange callback。

## MODIFIED Requirements

### Req: Simplify PriceChartModal

PriceChartModal 應從 390 行精簡為小於 150 行並僅負責 UI 組合。

- #### Scenario: Use Hooks Replace Inline Fetch

  - **Given** 重構完成的 PriceChartModal。
  - **When** 檢視程式碼。
  - **Then** 不應包含任何 fetch 函數定義而改用 usePriceData 等 Hooks。

- #### Scenario: Correct Component Composition

  - **Given** 重構完成的 PriceChartModal。
  - **When** 渲染。
  - **Then** 應組合 ChartNavigator、StockChart、RevenueChart、ChipsChart 等子元件。

### Req: Simplify HoldingsTable

HoldingsTable 應從 302 行精簡為小於 150 行並分離篩選邏輯。

- #### Scenario: Use HoldingsFilterBar Component

  - **Given** 重構完成的 HoldingsTable。
  - **When** 渲染。
  - **Then** 篩選 UI 應由 HoldingsFilterBar 元件提供。

- #### Scenario: Use useHoldingsFilter Hook

  - **Given** 重構完成的 HoldingsTable。
  - **When** 檢視程式碼。
  - **Then** 篩選與排序邏輯應由 useHoldingsFilter Hook 提供。

## REMOVED Requirements

### Req: Remove Inline Data Fetching from UI Components

UI 元件不應再包含直接的 fetch 函數定義。

- #### Scenario: Fetch Functions Moved to Hooks

  - **Given** 現有 PriceChartModal 包含 fetchPriceData 和 fetchRevenueData 等函數。
  - **When** 重構完成。
  - **Then** 這些函數應移至對應的 Custom Hooks 如 usePriceData、useRevenueData。
