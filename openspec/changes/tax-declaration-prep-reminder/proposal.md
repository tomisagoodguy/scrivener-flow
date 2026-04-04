## Why

目前系統只在稅務**繳納期限**當天生成提醒任務，缺少「申報前置準備」的預先通知。代書在用印日後需要先備齊文件才能申報，若沒有提前提醒，容易在期限前才倉促準備，造成逾期風險。

## What Changes

- 在 `syncSystemTodos` 加入 4 個新的系統任務：
  - 土增稅申報準備（`seal_date` 前 3 天）
  - 契稅申報準備（`seal_date` 前 3 天）
  - 地價稅申報準備（`tax_payment_date` 前 3 天）
  - 房屋稅申報準備（`tax_payment_date` 前 3 天）
- 新增 4 個 `source_key`：`land_val_tax_prep`、`deed_tax_prep`、`land_tax_prep`、`house_tax_prep`
- 提醒內容標示「申報準備」以區別現有的「限繳」任務

## Capabilities

### New Capabilities
- `tax-declaration-prep-reminder`：根據里程碑日期（用印日 / 完稅日）自動在前 3 天生成稅務申報準備提醒任務，與現有繳納期限任務並存

### Modified Capabilities
- （無需求層級變更）

## Impact

- **修改**：`src/services/caseService.ts`（`syncSystemTodos` 方法，約 +20 行）
- **無 DB schema 變更**：`todos` 表結構不變，只新增新的 `source_key` 值
- **無 UI 變更**：任務會直接出現在現有待辦清單中
