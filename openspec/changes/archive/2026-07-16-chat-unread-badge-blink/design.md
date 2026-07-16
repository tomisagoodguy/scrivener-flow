## Context

聊天未讀數的計算已存在（`useUnreadCount.ts`）：以 `conversation_members.last_read_at` 與 `messages.created_at` 比對，透過 Supabase Realtime 訂閱 `messages` INSERT 與 `conversation_members` UPDATE 自動 `refresh()`。已讀動作由 `markConversationRead()`（`src/lib/chat/chatService.ts`）執行，`UPDATE conversation_members SET last_read_at = now()`，執行後 `refresh()` 會讓對應對話的 `unread` 立即歸零。

顯示 badge 的兩個元件：`ConversationList.tsx`（每個對話項目各自顯示 `unread`）與 `ChatHeaderButton.tsx`（顯示 `totalUnread`）。兩者目前都直接綁定 `useUnreadCount` 回傳的即時數值，數值歸零時 badge 隨即消失。

本次變更要在**不動計算邏輯與 DB schema**的前提下，於顯示層插入一個「凍結顯示值」的狀態轉換層。

## Goals / Non-Goals

**Goals:**

- 未讀時（`unread > 0`）badge 每 3 秒閃爍一次。
- 使用者已讀後（`unread` 因 `markConversationRead()` 而歸零），badge 立即停止閃爍，但顯示數字維持在已讀前的最後未讀值，不歸零、不消失。
- 之後若有新的未讀訊息進來（`unread` 再度大於目前顯示值），顯示數字更新為新值並恢復閃爍。
- 對話列表（per-conversation）與全站 header（彙總）兩處 badge 行為一致。

**Non-Goals:**

- 不修改 `useUnreadCount.ts` 的計算邏輯或 Supabase Realtime 訂閱行為。
- 不新增 DB 欄位（不引入 `is_read` boolean 或額外 read-state 表）。
- 不處理多分頁/多裝置間「已讀後凍結值」是否同步的問題——凍結值是純前端 React state，重新整理頁面或另開分頁會各自重新初始化（初始值等於當下 `unread`，若當下為 0 則不顯示，不閃爍）。
- 不提供使用者手動清除凍結數字的 UI（例如叉叉按鈕）。

## Decisions

### 用 displayCount/isBlinking 狀態機取代直接綁定 unread

新增 `useBlinkingBadge(unread: number)` hook，內部用 `useState` 維護 `displayCount` 與 `isBlinking`，並用 `useEffect` 監看傳入的 `unread` 變化：

- `unread > displayCount` → 視為「有新未讀訊息」，同步更新 `displayCount = unread`、`isBlinking = true`。
- `unread === 0 && displayCount > 0 && isBlinking` → 視為「使用者已讀」，只將 `isBlinking` 設為 `false`，`displayCount` 不變。
- `unread === 0 && displayCount === 0` → 維持不顯示（`isBlinking = false`，`displayCount = 0`）。

**為何不直接在 `useUnreadCount.ts` 內部維護凍結值**：`useUnreadCount` 是純資料層 hook，多處使用（目前僅 chat 元件，但未來可能被其他地方引用作為「真實未讀數」）；把「凍結顯示邏輯」放在資料層會混淆「真實未讀數」與「UI 顯示用的殘留值」兩個語意，因此獨立成顯示層 hook，各消費端（`ConversationList`、`ChatHeaderButton`）各自呼叫。

**為何不用單一 boolean（`hasUnread`）取代 `isBlinking`**：需求明確要求「已讀後數字仍顯示」，若沒有獨立的 `displayCount` state，badge 會在 `unread` 歸零瞬間跟著消失，不符合需求。

### 動畫用自訂 CSS 變數而非 Tailwind 內建 animate-pulse

新增 `--animate-blink-badge: blink-badge 3s ease-in-out infinite;` 與對應 `@keyframes blink-badge { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`，寫在 `globals.css` 中緊鄰既有 `--animate-pulse-slow` 定義處。

**為何不用 `animate-pulse`**：Tailwind 內建週期固定 2 秒，需求明確為 3 秒；且專案已有 `--animate-pulse-slow` 的先例（`investment/layout.tsx` 使用），代表自訂週期動畫走「加 CSS 變數」路徑是既有慣例，比在元件內用 inline style 或 JS timer 更一致、也不會有 SSR/hydration 的時序問題。

### 深色模式覆寫比照既有 `.bg-red-500.animate-pulse` 規則

`src/app/dark-theme.css` 對 `.bg-red-500.animate-pulse` 已有 `!important` 覆寫（第 470-475 行），因為專案的 dark-theme 對結構性 class 採地毯式 `!important` 蓋色。新 class `animate-blink-badge` 若沿用相同底色（`bg-red-500`），必須新增對應的 `html.dark .bg-red-500.animate-blink-badge` 規則，否則會被既有規則排除在外、深色模式下顏色可能不正確。

## Implementation Contract

**Behavior**：

- 對話清單中任一對話有未讀訊息（`unread > 0`）時，該對話項目的未讀數字 badge 套用閃爍動畫（透明度在 1↔0.35 間、3 秒一週期、`ease-in-out`、無限循環）。
- 使用者開啟該對話（觸發現有 `markConversationRead()` 流程）後，該對話 badge **立即停止閃爍**，但數字維持顯示已讀前的最後未讀值，直到有新訊息進來才變動。
- 全站 header 的 `ChatHeaderButton` 未讀 badge：只要 `unreadByConversation` 中任一對話仍是「閃爍中」狀態，header badge 就閃爍；顯示數字為所有對話 `displayCount` 的加總。
- 若使用者從未有過未讀訊息（`unread` 一直是 0），badge 不顯示（沿用現有「0 不顯示」邏輯）。

**Interface / data shape**：

```ts
// src/components/chat/hooks/useBlinkingBadge.ts
function useBlinkingBadge(unread: number): { displayCount: number; isBlinking: boolean };
```

- 輸入：`unread`（`number`，來自 `useUnreadCount` 的 `unreadByConversation[id]` 或 `totalUnread`）。
- 輸出：`displayCount`（`number`，用於畫面顯示的數字）、`isBlinking`（`boolean`，是否套用 `animate-blink-badge` class）。

**Failure modes**：

- 無網路/Supabase 查詢失敗時，`useUnreadCount` 本身已有 `console.error` 記錄且不更新 `unreadByConversation`（現有行為不變）；`useBlinkingBadge` 對此無感知，僅依賴傳入值，不新增額外錯誤處理。

**Acceptance criteria**：

- 單元測試（`useBlinkingBadge.test.ts`）涵蓋以下情境：
  1. 初始 `unread = 0` → `displayCount = 0`、`isBlinking = false`。
  2. `unread` 從 0 變為 3 → `displayCount = 3`、`isBlinking = true`。
  3. 承上，`unread` 變回 0（已讀）→ `displayCount` 仍為 3、`isBlinking = false`。
  4. 承上，`unread` 再變為 2（新未讀訊息進來但少於前次凍結值也算「有新未讀」，因為此時 `displayCount` 已因已讀被視為 0 基準——見下方 Open Questions 之決議）→ `displayCount = 2`、`isBlinking = true`。
  5. `unread` 連續遞增（3 → 5，未曾歸零）→ `displayCount` 同步更新為 5，`isBlinking` 持續為 `true`。
- 手動驗證：於本機開兩個瀏覽器分頁模擬兩個帳號互傳訊息，確認 A 帳號收到訊息後 badge 閃爍，開啟對話後停止閃爍但數字不變，B 帳號再傳一則後 A 帳號 badge 恢復閃爍並數字更新為 1。
- Dark mode 手動驗證：切換深色模式，確認閃爍 badge 底色與文字對比度符合 `dark-theme.css` 既有紅色警示配色（`#7f1d1d` 底 + `#fca5a5` 文字），無被地毯式規則洗成預設色。

**Scope boundaries**：

- In scope：`useBlinkingBadge` hook 本身、`ConversationList.tsx`／`ChatHeaderButton.tsx` 的 badge render 邏輯改接此 hook、`globals.css`／`src/app/dark-theme.css` 新增動畫與深色覆寫。
- Out of scope：`useUnreadCount.ts`、`chatService.ts`、`markConversationRead()`、任何 Supabase migration、`MessageThread.tsx`、`ChatPanel.tsx` 內已讀觸發時機的變更。

## Risks / Trade-offs

- [Risk] `displayCount` 的「已讀後歸零基準」邏輯（見下方 Open Questions）若理解不一致，可能導致「已讀後又收到比凍結值少的未讀數」時是否觸發閃爍的行為認知落差 → Mitigation：在 Implementation Contract 的 acceptance criteria 明確定義規則（已讀事件會把「新未讀判斷基準」重置為 0，因此任何後續 `unread > 0` 都視為新未讀並觸發閃爍），tasks.md 需依此規則撰寫測試。
- [Risk] `ConversationList` 與 `ChatHeaderButton` 各自呼叫 `useBlinkingBadge`，若兩處對同一份 `unread` 來源的更新時序不同步（React state batching），可能出現 header 與清單 badge 短暫不一致 → Mitigation：兩者共同來源都是同一個 `useUnreadCount` 的 `unreadByConversation`/`totalUnread`，React 18+ 的自動批次更新可確保同一次 render cycle 內同步，風險極低，不額外處理。
- [Risk] 3 秒動畫週期在多個對話同時閃爍時，因各元件掛載時間點不同，動畫相位不同步（視覺上不是同時閃）→ Mitigation：此為預期行為，不視為缺陷，不需強制同步相位。

## Migration Plan

無資料庫或部署遷移需求，純前端變更；隨一般部署流程上線即可，無需 feature flag 或分階段 rollout。

## Open Questions

- 已讀後 `displayCount` 的「新未讀判斷基準」是否應重置為 0（即已讀後任何 `unread > 0` 都算新未讀並閃爍），或維持與凍結值比較（`unread > displayCount` 才算新未讀）？→ **決議**：採前者（已讀事件會將判斷基準重置為 0）。理由：已讀後 `unread` 本身就已經是「相對於已讀時間點的新未讀數」（因為 `last_read_at` 已更新），所以已讀後只要 `unread > 0` 就代表確實有訊息晚於使用者已讀時間到達，理應觸發閃爍，不應該被舊的 `displayCount` 卡住。此決議已寫入 Acceptance criteria 情境 4，tasks 需依此實作與測試。
