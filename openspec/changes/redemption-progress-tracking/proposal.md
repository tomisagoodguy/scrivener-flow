## Why

代償是不動產交易流程中最複雜、最容易出錯的環節，涉及多家銀行、多個確認節點，現有系統僅有單一 `redemption_date` 欄位，無法追蹤每個步驟的完成狀態與日期，導致代書難以掌握進度、容易遺漏關鍵步驟（如塗銷申請、謄本確認）。

## What Changes

- 新增 `redemption_steps` 資料表，記錄代償 7 個步驟的完成狀態（`is_done`）與完成日期（`done_date`）
- 在案件詳情頁的代償區塊新增「代償進度追蹤」子模組 UI
  - 每個步驟顯示步驟名稱、勾選框、日期輸入
  - 支援即時儲存（勾選即觸發更新）
- 7 個步驟（順序固定、不可自訂）：
  1. 確認原貸款餘額
  2. 申請代償撥款（買方銀行）
  3. 確認撥款日
  4. 原貸款銀行確認收款
  5. 申請塗銷抵押設定
  6. 等塗銷完成
  7. 確認土地建物謄本乾淨

## Capabilities

### New Capabilities

- `redemption-progress`: 代償進度步驟的 CRUD 操作與 UI 展示，包含資料庫 schema、Server Action、以及案件詳情頁的步驟追蹤元件

### Modified Capabilities

（無：現有代償欄位 `redemption_date` 保留不動，僅新增步驟子模組）

## Impact

- **DB**：新增 `redemption_steps` 資料表，需新增 migration SQL
- **API**：新增 Server Action 處理步驟的 upsert（`updateRedemptionStep`）
- **UI**：修改 `src/app/redemptions/page.tsx` 與案件詳情頁代償區塊，加入進度追蹤子元件
- **Types**：在 `src/types/index.ts` 新增 `RedemptionStep` 型別
- **RLS**：`redemption_steps` 需套用與 `cases` 相同的 `user_id` 隔離政策
