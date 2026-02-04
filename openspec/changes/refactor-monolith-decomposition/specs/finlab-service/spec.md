# Spec: FinlabService Decomposition

## ADDED Requirements

### Req: FinlabClient Centralized API Connection

新增 FinlabClient 類別負責 Finlab API 的連線與快取管理。

- #### Scenario: Client Login Success

  - **Given** 環境變數 FINLAB_API_KEY 已設定。
  - **When** FinlabClient.login() 被調用。
  - **Then** 應成功連線 Finlab API 並回傳 True。

- #### Scenario: Client Cache Hit

  - **Given** 已透過 Client 獲取 price:收盤價 資料。
  - **When** 再次請求相同資料。
  - **Then** 應從 raw_cache 回傳而不重複請求 API。

### Req: PriceDataService Price Attachment

新增 PriceDataService 類別從 FinlabService.attach_prices() 抽離。

- #### Scenario: Attach Prices to DataFrame

  - **Given** 持股 DataFrame 包含 code 欄位。
  - **When** PriceDataService.attach(df, date_str) 被調用。
  - **Then** 應在 df 新增 price、change_percent、amount、margin_ratio、volatility 等欄位。

- #### Scenario: Date Fallback Logic

  - **Given** 目標日期不在 Finlab 資料中。
  - **When** PriceDataService.attach() 被調用。
  - **Then** 應自動使用最近可用日期的資料。

### Req: OHLCVService K-Line Data

新增 OHLCVService 類別從 FinlabService.get_ohlcv() 抽離。

- #### Scenario: Get OHLCV Data

  - **Given** 股票清單包含 2330 和 2454。
  - **When** OHLCVService.get(stock_list, days=250) 被調用。
  - **Then** 應回傳 long-format DataFrame 包含 stock_id、date、open、high、low、close、volume。

### Req: CompanyInfoService Company Data

新增 CompanyInfoService 類別從 FinlabService.get_company_info() 抽離。

- #### Scenario: Get Company Info

  - **Given** 股票清單包含 2330 和 2454。
  - **When** CompanyInfoService.get(stock_list) 被調用。
  - **Then** 應回傳 DataFrame 包含 stock_code、name_short、name_full、industry。

## MODIFIED Requirements

### Req: FinlabService Facade Pattern

FinlabService 應保持原有 API 簽章並內部委派至各專責 Service。

- #### Scenario: Backward Compatibility

  - **Given** 現有程式碼使用 FinlabService().attach_prices(df, date_str)。
  - **When** 重構完成後執行。
  - **Then** 應產生相同結果而呼叫者無需修改。

- #### Scenario: Facade Delegation

  - **Given** FinlabService.attach_prices() 被調用。
  - **When** 內部執行。
  - **Then** 應委派至 PriceDataService.attach()。

## REMOVED Requirements

### Req: Remove Single Class Multiple Responsibilities

FinlabService 不應再同時負責 API 連線、價格附加、OHLCV 獲取、公司資訊等多種職責。

- #### Scenario: Responsibilities Separated

  - **Given** 重構完成的 services/finlab/ 目錄。
  - **When** 檢視結構。
  - **Then** 應包含獨立的 client.py、price_service.py、ohlcv_service.py、company_service.py。
