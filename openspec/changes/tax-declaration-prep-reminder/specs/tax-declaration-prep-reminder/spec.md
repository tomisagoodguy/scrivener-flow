## ADDED Requirements

### Requirement: 稅務申報準備提醒任務自動生成
系統 SHALL 在 `syncSystemTodos` 執行時，根據里程碑日期自動生成稅務申報準備提醒任務，提前 3 天提醒代書備妥申報文件。

#### Scenario: 用印日已設定 - 生成土增稅與契稅申報準備任務
- **WHEN** 案件 `seal_date` 不為 null
- **THEN** 系統生成兩個系統任務：`land_val_tax_prep`（土增稅申報準備）與 `deed_tax_prep`（契稅申報準備），`due_date` 為 `seal_date` 前 3 天

#### Scenario: 完稅日已設定 - 生成地價稅與房屋稅申報準備任務
- **WHEN** 案件 `tax_payment_date` 不為 null
- **THEN** 系統生成兩個系統任務：`land_tax_prep`（地價稅申報準備）與 `house_tax_prep`（房屋稅申報準備），`due_date` 為 `tax_payment_date` 前 3 天

#### Scenario: 基準日期未設定 - 不生成對應準備任務
- **WHEN** `seal_date` 為 null
- **THEN** `land_val_tax_prep` 與 `deed_tax_prep` 任務不生成

#### Scenario: 去重邏輯 - 重複 sync 不產生重複任務
- **WHEN** 相同案件第二次執行 `syncSystemTodos`
- **THEN** 系統以 `source_key` upsert，任務數量不增加，既有任務內容更新

#### Scenario: 任務標題格式
- **WHEN** 生成申報準備任務，買方名稱為「王大明」
- **THEN** 任務 `content` 格式為「王大明 案 - 土增稅申報準備 (M/D)」，其中日期為 `due_date` 的本地化顯示
