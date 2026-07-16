## Why

聊天室未讀訊息數（badge）目前是靜態顯示，使用者難以在多個對話並存時察覺「有新訊息尚未讀取」。需要一個視覺提示：未讀時 badge 閃爍以吸引注意，讀完後停止閃爍但數字不消失，讓使用者仍能確認「上次看到的未讀量」。

## What Changes

- 新增 `useBlinkingBadge` hook（`src/components/chat/hooks/useBlinkingBadge.ts`），將既有 `useUnreadCount` 算出的即時 `unread` 數值轉換為 `{ displayCount, isBlinking }` 狀態：
  - 當新的 `unread` 大於目前 `displayCount` 時（代表有新未讀訊息進來）→ 更新 `displayCount = unread`，`isBlinking = true`。
  - 當使用者已讀（`markConversationRead()` 執行後、hook 算出的 `unread` 歸零）→ `isBlinking` 立即變 `false`，但 `displayCount` **維持原數字**，不清零。
- `ConversationList.tsx` 每個對話項目改用 `useBlinkingBadge` 的 `displayCount`/`isBlinking` 取代目前直接綁定 `unread` 的 badge 顯示邏輯。
- `ChatHeaderButton.tsx` 的全站總未讀 badge 比照套用：只要任一對話 `isBlinking` 為真，整體 badge 就閃爍；顯示數字用彙總後的 `displayCount`。
- `globals.css` 新增 `blink-badge` keyframes 與 `--animate-blink-badge`（3 秒週期、`ease-in-out infinite`，透明度在 1 與 0.35 間變化），套用慣例比照既有 `--animate-pulse-slow`。**不使用**內建 Tailwind `animate-pulse`（週期固定 2 秒，且會連背景色一起淡化）。
- `src/app/dark-theme.css` 比照既有 `.bg-red-500.animate-pulse` 深色模式覆寫規則（第 471-472 行附近），新增對應 `animate-blink-badge` 的覆寫，避免深色模式下顏色被地毯式 `!important` 規則蓋掉。

## Non-Goals (optional)

- 不新增或修改 Supabase schema（`messages`、`conversation_members` 表不變），完全沿用既有 `last_read_at` 時間戳比較機制。
- 不改變未讀數的計算邏輯本身（`useUnreadCount.ts` 的 `computeUnreadCount`/`sumUnreadCounts` 不變）。
- 不處理「多分頁/多裝置同步已讀狀態」的即時性問題，沿用現有 Supabase Realtime 訂閱行為。
- 不對已讀後的 `displayCount` 提供手動清除機制（例如點擊 X 清空），僅在下一則新未讀訊息到來時才會更新。

## Capabilities

### New Capabilities

- `chat-unread-badge-blink`: 聊天未讀 badge 的閃爍狀態管理——未讀時每 3 秒閃爍，已讀後停止閃爍但保留上次未讀數字顯示，直到有新未讀訊息才更新並恢復閃爍。

### Modified Capabilities

(none)

## Impact

- Affected specs: `chat-unread-badge-blink`（新增）
- Affected code:
  - New: `src/components/chat/hooks/useBlinkingBadge.ts`
  - Modified: `src/components/chat/ConversationList.tsx`
  - Modified: `src/components/layout/ChatHeaderButton.tsx`
  - Modified: `src/app/globals.css`
  - Modified: `src/app/dark-theme.css`
