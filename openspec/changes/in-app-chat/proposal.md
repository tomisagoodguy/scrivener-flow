## Why

代書團隊成員目前只能透過案件備註、待辦或站外工具（LINE、Email）溝通，系統內沒有任何即時討論管道。使用者希望「有用我系統的人都可以互相聊天」，讓同事間的協作討論留在同一個系統內，減少切換工具的成本。

## What Changes

- 新增系統內建即時聊天功能，涵蓋 1 對 1 對話與群組對話。
- 任何已登入本系統的使用者皆可從使用者清單直接發起對話，不需要好友邀請/同意流程（全公司共用單一空間，比照現有 RLS 設計哲學）。
- 新增聊天資料模型：`conversations`（對話，含 `is_group` 標記）、`conversation_members`（對話成員）、`messages`（訊息內容、寄件者、時間戳）。
- 使用 Supabase Realtime `broadcast` 傳遞新訊息（低延遲、不受 RLS row 變更延遲影響），並視需要搭配 `postgres_changes` 做訊息持久化後的補強同步；新增 `presence`（在線狀態）作為選配增強。
- 新增未讀訊息計數（依 `conversation_members.last_read_at` 與訊息時間比對）。
- 新增 UI 進入點：側邊欄聊天圖示（含未讀角標）、聊天面板（對話清單 + 訊息串 + 輸入框）、開新對話的使用者選擇器（1 對 1 或勾選多人建群組）。

## Non-Goals (optional)

（見 design.md 的 Goals/Non-Goals 章節）

## Capabilities

### New Capabilities

- `in-app-chat`: 系統內建 1 對 1 與群組即時聊天，包含對話管理、訊息傳遞、未讀計數、使用者選擇與側邊欄進入點。

### Modified Capabilities

（無，本次不變更既有 capability 的需求）

## Impact

- Affected specs: `in-app-chat`（新增）
- Affected code:
  - New:
    - `supabase/migrations/<timestamp>_add_chat_schema.sql`
    - `src/types/chat.ts`
    - `src/lib/chat/chatService.ts`
    - `src/components/chat/ChatSidebarIcon.tsx`
    - `src/components/chat/ChatPanel.tsx`
    - `src/components/chat/ConversationList.tsx`
    - `src/components/chat/MessageThread.tsx`
    - `src/components/chat/NewConversationPicker.tsx`
    - `src/components/chat/hooks/useChatRealtime.ts`
    - `src/components/chat/hooks/useUnreadCount.ts`
  - Modified:
    - `src/components/layout/SideNav.tsx`（加入聊天圖示進入點）
