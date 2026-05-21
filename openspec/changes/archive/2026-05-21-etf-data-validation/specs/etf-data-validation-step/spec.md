# Spec: ETF Data Validation Step

## Purpose

在 ETF Pipeline 的 `DiffComputeStep` 執行前，對爬取到的持股資料進行正確性驗證，防止髒資料靜默寫入 DB。

---

## ADDED Requirements

### Requirement: Pipeline 在持股資料進入 diff 引擎前執行驗證

`DataValidationStep` SHALL 被插入 `PriceAttachStep` 之後、`DiffComputeStep` 之前，對 `ctx.etf_data`（所有 ETF 的持股清單）進行驗證。

#### Scenario: 所有驗證通過

- **WHEN** 所有 ETF 的持股比重總和在 50%–150% 之間，且每支 ETF 持股筆數 > 0，且無個股 price ≤ 0
- **THEN** `DataValidationStep` 記錄 "Validation passed" 並正常結束，Pipeline 繼續執行

---

### Requirement: 持股比重總和驗證（關鍵）

`DataValidationStep` SHALL 計算每支 ETF 所有持股的 `weight` 欄位加總，若任一 ETF 的比重總和低於 50% 或高於 150%，則中斷 Pipeline。

#### Scenario: 比重總和正常

- **WHEN** 某 ETF 的持股 weight 加總為 98.7%
- **THEN** 驗證通過，繼續執行

#### Scenario: 比重嚴重偏低（爬蟲解析失敗）

- **WHEN** 某 ETF 的持股 weight 加總為 12%（欄位偏移導致只抓到部分資料）
- **THEN** `DataValidationStep` raise `ValueError`，Pipeline 中斷，LINE 發送警報含「持股比重異常：{ETF代碼} 總和 = 12%」

#### Scenario: 比重嚴重偏高

- **WHEN** 某 ETF 的持股 weight 加總為 200%（欄位重複計算）
- **THEN** `DataValidationStep` raise `ValueError`，Pipeline 中斷，LINE 發送警報

---

### Requirement: 持股筆數合理性驗證（關鍵）

`DataValidationStep` SHALL 計算每支 ETF 的持股筆數，若任一 ETF 的筆數為 0，則中斷 Pipeline。

#### Scenario: 持股清單正常

- **WHEN** 某 ETF 有 52 筆持股
- **THEN** 驗證通過

#### Scenario: 持股清單為空（爬蟲回傳空資料）

- **WHEN** 某 ETF 的持股清單筆數 = 0
- **THEN** `DataValidationStep` raise `ValueError`，Pipeline 中斷，LINE 發送警報含「持股筆數異常：{ETF代碼} = 0 筆」

---

### Requirement: 個股價格異常偵測（警告）

`DataValidationStep` SHALL 偵測 `price` 欄位異常的個股（`price ≤ 0` 或 `price > 10000`），但不中斷 Pipeline。

#### Scenario: 偵測到異常價格

- **WHEN** 持股資料中有個股 price = -1 或 price = 0
- **THEN** 將該個股代碼記入 `ctx.validation_warnings`，log warning，Pipeline 繼續執行

#### Scenario: 無異常價格

- **WHEN** 所有持股 price 均在 0 < price ≤ 10000 範圍內
- **THEN** `ctx.validation_warnings` 保持空 list

---

### Requirement: 驗證結果寫入 Pipeline Context

`DataValidationStep` SHALL 將驗證警告記入 `ctx.validation_warnings: list[str]`，供後續步驟（`NotifyStep`）讀取。

#### Scenario: 有警告時

- **WHEN** 偵測到 2 支個股 price 異常
- **THEN** `ctx.validation_warnings` 包含對應的警告訊息字串，`NotifyStep` 在 LINE 通知底部附上「⚠️ 資料警告：2 筆價格異常」

#### Scenario: 無警告時

- **WHEN** 所有驗證均通過且無警告
- **THEN** `ctx.validation_warnings` 為空 list，`NotifyStep` 不附加任何警告訊息

---

### Requirement: DataValidationStep 本身的錯誤不應崩潰 Pipeline（除非驗證邏輯判定應中斷）

`DataValidationStep` 的內部程式錯誤（如 KeyError、AttributeError）SHALL 被 catch，記錄 error log 後繼續，不中斷 Pipeline。只有明確驗證條件觸發（比重異常、筆數歸零）才允許 raise。

#### Scenario: 驗證程式本身出現 bug

- **WHEN** `DataValidationStep` 內部發生 `KeyError`（例如持股資料結構改變）
- **THEN** 記錄 error log，`ctx.validation_warnings` 加入「DataValidationStep 內部錯誤」，Pipeline 繼續執行
