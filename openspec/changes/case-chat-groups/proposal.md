## Why

代書在 LINE、WhatsApp 等通訊軟體中，同一個案件可能建了不同名稱的群組（例如 LINE 叫「林家-代書群」、WhatsApp 叫「陳○○買屋」），目前系統沒有地方記錄這些對應關係，導致要回翻訊息才能找到對的群組。

## What Changes

- `cases` 表新增 `chat_groups` JSONB 欄位，儲存各 app 的群組名稱
- 備忘錄卡片（CaseMemoCard）新增「📱 通訊群組」可編輯區塊
- 案件搜尋加入 `chat_groups` 欄位，可用群組名稱找案件

## Capabilities

### New Capabilities
- `case-chat-groups`: 在案件上記錄 LINE / WhatsApp / 其他 app 的群組名稱，支援備忘錄頁直接編輯，並整合進全站搜尋

### Modified Capabilities
- `case-search`: 搜尋條件新增 `chat_groups` JSONB 欄位的 ilike 查詢

## Impact

- **DB**: `supabase/migrations/` 新增 migration，`cases` 表加 `chat_groups jsonb default '{}'`
- **Types**: `src/types/index.ts` 的 `DemoCase` 介面新增 `chat_groups` 欄位
- **UI**: `CaseMemoCard.tsx` 新增編輯區塊；`caseService.ts` 新增 `updateChatGroups()` 方法
- **Search**: `src/app/cases/page.tsx` 搜尋查詢加入 `chat_groups` 條件
