## Why

遞牌費帳本目前每筆都必填付款人、收款人與金額，並以「未收款」追蹤。但使用者有時是自己一個代書遞牌，沒有對口的地政士、也不用確認收款，只想知道遞了幾件或賺了多少錢，現有表單無法這樣記錄，歷史紀錄也沒有當月統計。

## What Changes

- 新增「自己遞牌」紀錄類型：不需付款人與收款人，填日期、件數（正整數，預設 1）、金額（選填）、物件編號（選填）、備註（選填）。
- 一次遞多件可填一筆（件數 N），也可一件一筆，由使用者自行決定。
- 新增表單提供「互遞／自己遞牌」切換；編輯時類型固定不可切換。
- 自己遞牌紀錄沒有收款狀態：不進未收清單、沒有帳齡警示、不可標記已收。
- 歷史紀錄上方新增當月統計，自己遞牌（件數、金額）與互遞（筆數、金額）分開顯示。
- 既有紀錄一律視為互遞，行為不變。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `handover-fee-ledger`: 新增自己遞牌紀錄、自己遞牌的編輯與收款排除規則、歷史當月統計；歷史清單改為可顯示自己遞牌紀錄

## Impact

- supabase/migrations/20261028120000_add_handover_fee_ledger.sql（既有結構參考，不修改；另立新 migration，含 DROP NOT NULL，由使用者在 SQL Editor 執行）
- src/domain/handover-fee/types.ts
- src/app/actions/handoverFees.ts
- src/components/features/cases/handover-fee/HandoverFeeForm.tsx
- src/components/features/cases/handover-fee/HandoverFeeEditContext.tsx
- src/components/features/cases/handover-fee/FeeHistory.tsx
- src/app/actions/__tests__/handoverFees.test.ts
- src/components/features/cases/handover-fee/__tests__/FeeHistory.test.tsx
- src/components/features/cases/handover-fee/__tests__/HandoverFeeEdit.test.tsx
- src/components/features/cases/handover-fee/__tests__/UnpaidFeeList.test.tsx
