## Why

前一變更 `cases-export-assignable-calendar` 讓匯出檔可逐事件指派承辦人，但指派只作用在「時程」區。被指派的協助者切換到自己時，「承辦中表格」與「備忘錄」仍顯示全部案件，看不出哪些案件歸她、也看不到承辦人標記，交接時三個區塊資訊不一致。需要把指派改為以「案件」為單位（整案一人），並讓三個區塊同步顯示與篩選。

## What Changes

- **BREAKING**（僅影響匯出檔內部狀態結構）：指派鍵由逐事件的 `caseId::fieldKey` 改為逐案件的 `caseId`，一個案件只有一位承辦人。時程事件的指派下拉與新增的表格列指派下拉都讀寫同一個 `caseId` 指派，改一處三區同步。
- **承辦人標記**：承辦中表格每一列、備忘錄每張卡片顯示「承辦：<人名>」徽章；未指派時不顯示徽章。
- **篩選連動**：篩選列切到某人時，承辦中表格列、備忘錄卡片、時程事件一起只顯示指派給她的案件；「全部」顯示所有案件。
- **表格可直接指派**：承辦中表格每一列新增承辦人下拉，可直接指派整案。
- **逐事件完成打勾不變**：完成狀態仍以 `eventId`（`caseId::fieldKey` / `caseId::todo::todoId`）為鍵，存於該檔 `localStorage`。
- **下載已指派版本**：序列化的 `assignments` 改為案件層級（`{ [caseId]: person }`），其餘（people、done）維持。
- 維持單一自包含 HTML、無外部資源、JavaScript 關閉時三區塊仍可閱讀。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cases-export-interactive-calendar`: 指派單位由事件改為案件；承辦中表格與備忘錄區塊納入承辦人標記、人員篩選與（表格）直接指派；「下載已指派版本」序列化案件層級指派。

## Impact

- Affected specs: 修改 `cases-export-interactive-calendar`（其基準 spec 目前位於尚未 archive 的前一變更 cases-export-assignable-calendar，archive 順序需前者先行）
- Affected code:
  - New: (none)
  - Modified:
    - src/lib/cases/exportInteractive.ts
    - src/lib/cases/htmlExport.ts
    - src/lib/cases/__tests__/exportInteractive.test.ts
    - src/lib/cases/__tests__/exportInteractive.integration.test.ts
    - src/lib/cases/__tests__/htmlExport.test.ts
  - Removed: (none)
