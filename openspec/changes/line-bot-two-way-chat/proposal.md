## Why

目前 LINE Bot 只能單向推播（Server → 管理員），無法接收朋友傳來的訊息，也無法讓管理員透過 LINE 直接回覆朋友。為了讓私人股票討論群組的溝通流暢（朋友問選股/觀察清單，管理員即時回覆），需要實作完整的雙向對話架構。

## What Changes

- 新增 LINE Webhook 端點，接收朋友傳來的訊息事件（`message`、`follow`、`unfollow`）
- 新增 `line_followers` 資料表，記錄加過 Bot 好友的 User ID 與顯示名稱
- 朋友傳訊 → Bot 轉發給管理員，附帶回覆指令提示（`@暱稱 訊息`）
- 管理員在 LINE 輸入 `@暱稱 訊息` → Bot 解析後發送給對應朋友
- 加好友事件自動儲存 User ID + 顯示名稱；退好友事件標記停用
- 所有 Webhook 請求驗證 LINE Signature（`X-Line-Signature` header）

## Non-Goals

- 不實作群組聊天（Group Chat）支援
- 不實作 Rich Menu 或 Flex Message 回覆
- 不實作多管理員（只有一個固定管理員 User ID）
- 不實作訊息記錄的 Web UI（管理介面）
- 不修改現有 ETF 推播邏輯

## Capabilities

### New Capabilities

- `line-webhook-receiver`: 接收並驗證 LINE Webhook 事件（message/follow/unfollow）、轉發訊息給管理員、解析管理員 @reply 指令並傳送給指定朋友
- `line-follower-management`: 管理加過 Bot 好友的用戶清單（自動儲存/標記停用 User ID 與顯示名稱）

### Modified Capabilities

（無）

## Impact

- Affected specs: `line-webhook-receiver`（新）、`line-follower-management`（新）
- Affected code:
  - New: `src/app/api/line/webhook/route.ts`
  - New: `supabase/migrations/<timestamp>_add_line_followers.sql`
  - Modified: `src/lib/lineService.ts`（新增 `sendLineMessageToUser(userId, text)` 動態目標發送）
  - Modified: `.env.local`（新增 `LINE_CHANNEL_SECRET` 用於 Signature 驗證）
