## Why

地政士之間會互相遞牌（幫沒有牌的人簽名用印），彼此支付遞牌費。通常當天結清，但偶爾會漏收，目前沒有地方記錄，事後無法追查哪一筆還沒收到錢。

## What Changes

- `/cases` 分頁列在「⚠️ 未完成統整」之後新增「💰 遞牌費」分頁（`/cases?status=HandoverFee`）；進入此分頁時隱藏案件監控小卡與案件列表。
- 新增遞牌費紀錄：日期（使用者可選，預設今天）、物件編號（手打文字）、付款地政士 → 收款地政士（皆從名單選擇，提供對調按鈕，兩者不可相同）、金額（正整數，單位元）、已收狀態（預設未收，標記已收時記錄收款時間）、備註。
- 未收款清單：列出所有未收紀錄，依日期由舊到新排序；超過 3 天顯示橘色、超過 7 天顯示紅色；按「已收」後該筆移出清單。
- 歷史紀錄：可依月份與地政士篩選所有紀錄（含已收）。
- 地政士名單：首次使用時自動建立預設 7 人（孔協、家華、定康、文慶、瑞麟、來慶、順鵬）；可新增、可隱藏（軟刪除，舊紀錄仍顯示姓名）。
- 新增 `scriveners`、`handover_fees` 兩張表，皆以 `user_id` 做 RLS 隔離。

## Non-Goals

- 不在首頁放遞牌費摘要卡片（功能使用頻率低）。
- 不做當日平分計算、月結互抵、清償建議（實務上當天結清，只需追蹤漏收）。
- 不與系統內案件（`cases`）建立關聯，物件編號只是文字。

## Capabilities

### New Capabilities

- `handover-fee-ledger`: 地政士遞牌費的個人紀錄、未收款追蹤與地政士名單管理

### Modified Capabilities

(none)

## Impact

- Affected specs: handover-fee-ledger（新增）
- Affected code:
  - New: supabase/migrations/20261028120000_add_handover_fee_ledger.sql
  - New: src/domain/handover-fee/types.ts
  - New: src/domain/handover-fee/agingUtils.ts
  - New: src/app/actions/handoverFees.ts
  - New: src/components/features/cases/handover-fee/（分頁元件與表單、清單、名單管理子元件）
  - Modified: src/app/cases/page.tsx（新增分頁、隱藏監控小卡與案件列表的條件）
