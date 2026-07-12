## Context

現有系統無「使用者對使用者」的通訊功能，也沒有多租戶/組織邊界——RLS 目前以 `user_id = auth.uid()` 隔離個人資料，部分知識庫類資料表（如 `team_notes`、`guidelines`）則是全公司共用、不做隔離。使用者身分來自 Supabase Auth 的 Google OAuth（`auth.users.email`），沒有自訂 `profiles.email` 同步機制可靠使用。

Realtime 既有用法僅限 `supabase.channel(name).on('postgres_changes', ...)`（見 `src/components/features/cases/MemoRealtimeRefresh.tsx`、`src/components/todo/hooks/useTodoSync.ts`），尚無 `broadcast` 或 `presence` channel 的先例。

## Goals / Non-Goals

**Goals:**

- 任何已登入使用者都可以在系統內找到其他使用者並直接開始 1 對 1 或群組聊天，不需邀請/同意流程。
- 訊息即時送達（同一使用者的多裝置/多分頁皆能即時收到）。
- 對話清單依最新訊息時間排序，並顯示未讀數。
- 側邊欄提供聊天入口與未讀角標。

**Non-Goals:**

- 不做端對端加密（訊息以明文存於 Supabase，比照現有 `team_notes` 等共用資料的安全假設）。
- 不做已讀回條（僅做「未讀計數」，不逐筆標示誰已讀）。
- 不做訊息編輯、檔案附件、表情回應、@提及等進階功能（**訊息收回**已於實作階段納入範圍，見下方 Decisions）。
- 不做跨事務所/組織隔離（沿用現有「全公司共用單一空間」假設）。
- 不做推播通知（web push / LINE 通知），僅站內即時更新。

## Decisions

### 資料模型：conversations / conversation_members / messages

- `conversations(id uuid pk, is_group boolean not null default false, name text null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now())`
  - `name` 僅群組聊天使用；1 對 1 對話 `name` 為 null，前端顯示對方姓名。
- `conversation_members(conversation_id uuid references conversations(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, last_read_at timestamptz not null default now(), joined_at timestamptz not null default now(), primary key (conversation_id, user_id))`
- `messages(id uuid pk default gen_random_uuid(), conversation_id uuid not null references conversations(id) on delete cascade, sender_id uuid not null references auth.users(id), content text not null, created_at timestamptz not null default now())`
- 1 對 1 對話以「兩個 `conversation_members` 且 `is_group = false`」表示，不額外做去重唯一索引（同一組使用者若重複建立 1 對 1 對話，前端在開新對話時先查詢既有對話並重用，不在 DB 層強制唯一）。

替代方案考慮：曾考慮用單一 `messages` 表 + `recipient_ids` 陣列欄位取代 join table，但無法乾淨支援群組已讀游標與成員異動，故採用 join table 正規化設計。

### RLS：比照現有「全公司共用單一空間」，用成員關係而非租戶隔離

- `conversations`：`SELECT` 僅限 `auth.uid()` 是該 conversation 的成員（`EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = conversations.id AND user_id = auth.uid())`）；`INSERT` 允許任何登入使用者（`created_by = auth.uid()`）。
- `conversation_members`：`SELECT` 限成員本人所屬的 conversation 的所有列（可看到同對話其他成員）；`INSERT` 限對話建立者或既有成員可加人；`UPDATE`（`last_read_at`）限本人列。
- `messages`：`SELECT`/`INSERT` 皆限 `auth.uid()` 是該 `conversation_id` 的成員。
- 使用者清單（發起新對話用）：不新增獨立 `profiles` 查詢表，改為新增一個 `SECURITY DEFINER` RPC 函式 `list_chat_users()`，回傳 `auth.users` 的 `id, email`（因 `auth.users` 不可直接 RLS 查詢，且現有 `profiles` 表無可靠寫入資料）。

替代方案考慮：曾考慮直接開放 `profiles` 表給所有登入使用者 `SELECT`，但 `profiles.email` 無寫入邏輯佐證（見現有調查），資料可能為空或過期，故改用 RPC 直讀 `auth.users`。

### Realtime：broadcast 即時送達 + postgres_changes 作為补強/多分頁同步

- 訊息送出時，先 `INSERT` 進 `messages` 表（權威落地），成功後同時對 `chat:<conversation_id>` channel 送出 `broadcast` 事件（payload 含訊息內容），讓同對話其他線上成員立即收到，不必等待 `postgres_changes` 的 replication 延遲。
- 同時保留一個 `postgres_changes` 訂閱（同 channel 或獨立 channel）作為「訊息送達 UI 但實際上未成功寫入 DB」情境的補強校正與多分頁同步的保底機制；`broadcast` 失敗或漏收時，畫面重新整理/切換分頁會透過 `postgres_changes` 或初次載入的 REST 查詢補齊。
- 未讀計數：不使用 `presence`（本次 Non-Goals 不含已讀回條），改以 `conversation_members.last_read_at` 與該對話最新訊息 `created_at` 比較，前端在對話清單載入時計算未讀數；進入對話時前端呼叫 RPC/UPDATE 更新 `last_read_at`。

替代方案考慮：曾考慮全部改用 `presence` 做在線狀態與已讀回條，但 Non-Goals 已明確排除已讀回條，presence 的額外複雜度與本次範圍不符，故不採用。

### UI 進入點

- **實作階段調整**：改為右下角浮動按鈕（`src/components/chat/ChatFab.tsx`，比照 Facebook Messenger 慣例），掛載於 `src/app/layout.tsx` 根層級，所有頁面（含 `/investment` 開頭、`SideNav` 會隱藏自身的頁面）皆可見；未讀總數 > 0 時顯示角標數字。原規劃的 `SideNav.tsx` 進入點已移除。
- 點擊後在按鈕上方彈出 `ChatPanel`（固定尺寸卡片，非全高側邊抽屜），避免遮蔽整個畫面右側。
- 使用者顯示名稱優先採 Google OAuth 姓名（`user.user_metadata.full_name`，經 `list_chat_users()` RPC 的 `raw_user_meta_data ->> 'full_name'` 帶出），缺少時退回 email 帳號名稱（`chatDisplayName()`，與 `WelcomeHeader.tsx` 既有慣例一致），不直接顯示完整 email。

## Implementation Contract

**行為（Behavior）**：
- 使用者點擊右下角聊天浮動按鈕 → 開啟聊天面板，看到依最新訊息時間排序的對話清單（含未讀角標）。
- 使用者點擊「開新對話」→ 看到系統所有其他使用者清單（顯示姓名，缺姓名時退回 email 帳號名稱）→ 勾選 1 人建立/開啟 1 對 1 對話，勾選 2 人以上建立群組對話（需輸入群組名稱）。
- 使用者在對話中送出訊息 → 訊息立即出現在自己畫面，同對話其他線上成員的畫面在 1 秒內（同一 Realtime channel 延遲範圍）收到並顯示。
- 使用者切換到某對話 → 該對話未讀角標歸零；側邊欄總未讀數同步更新。

**資料形狀（Interface / Data Shape）**：
- `conversations`、`conversation_members`、`messages` 三表結構如 Decisions 所述。
- `list_chat_users()` RPC 回傳 `{ id: string; email: string; full_name: string }[]`，且只包含近 10 天內有案件活動（`cases.updated_at`）的使用者（見 Risks/Trade-offs 實作階段發現）。
- 前端 TypeScript 型別定義於 `src/types/chat.ts`：`Conversation`、`ConversationMember`、`ChatMessage`。
- Realtime broadcast payload 形狀：`{ type: 'new_message'; message: ChatMessage }`。

**失敗模式（Failure Modes）**：
- 訊息 `INSERT` 失敗（網路/RLS 拒絕）→ 前端顯示該則訊息「送出失敗」狀態，不送出 broadcast，不靜默吞掉錯誤。
- Realtime channel 斷線 → 前端顯示連線中斷提示，重新整理對話時改用 REST 查詢補齊訊息，不阻擋使用者繼續使用其他系統功能。
- `list_chat_users()` RPC 失敗 → 開新對話的使用者選擇器顯示明確錯誤訊息，不呈現空清單佯裝「目前無其他使用者」。

**驗收條件（Acceptance Criteria）**：
- 兩個測試帳號分別登入不同瀏覽器 session，A 對 B 發起 1 對 1 對話並送出訊息，B 的畫面在未重新整理的情況下即時顯示該訊息與未讀角標。
- A 建立一個包含 B、C 的群組對話並送出訊息，B、C 皆能即時收到，且對話清單顯示正確的群組名稱與成員。
- B 進入該對話後未讀角標歸零，重新整理頁面後角標維持歸零（`last_read_at` 已持久化）。
- 以非對話成員的第三個測試帳號直接呼叫 `messages`/`conversations` 表的 Supabase REST API，確認 RLS 拒絕存取非本人所屬對話的資料。

**範圍邊界（Scope Boundaries）**：
- 範圍內：1 對 1 聊天、群組聊天（建立時指定成員、群組名稱）、即時訊息送達、未讀計數、側邊欄入口、`list_chat_users()` RPC、對應 RLS。
- 範圍外：已讀回條、訊息編輯、檔案/圖片附件、@提及、推播通知、跨事務所隔離、訊息搜尋、對話成員的中途新增/移除（本次群組成員於建立時一次性指定，不做後續管理 UI）。訊息收回（軟刪除）已於實作階段納入範圍，見下方 Risks/Trade-offs。

## Risks / Trade-offs

- [風險] `broadcast` 事件與 `messages` 表寫入為兩個獨立步驟，若 broadcast 送出後 UI 樂觀更新、但實際 DB 寫入失敗，會造成短暫的假象訊息。 → 緩解：採「先 INSERT 成功才 broadcast」的順序（見 Decisions），不做 UI 樂觀更新於 DB 確認之前。
- [風險] `list_chat_users()` 用 `SECURITY DEFINER` 直讀 `auth.users`，若未嚴格限制回傳欄位，可能洩漏敏感的 auth 中繼資料（如 `encrypted_password`、`raw_app_meta_data`）。 → 緩解：RPC 內僅 `SELECT id, email FROM auth.users`，不回傳其他欄位；並於 design 落地前經 security-reviewer 覆核。
- [風險] 群組聊天成員在建立後無法增減，若使用情境需要「事後拉人進群」會不敷使用。 → 緩解：已列入 Non-Goals 明確排除，作為第一版已知限制，後續可另開 change 補上成員管理。
- [風險] 全公司共用單一空間 + 免審核加聊天，理論上任何登入者都能看到「所有其他使用者」清單，若未來系統開放外部使用者（如客戶帳號）會有資料外洩疑慮。 → 緩解：此為現有系統既定的「全公司共用」假設之延伸，非本次新增風險；若未來新增客戶端角色，需另開 change 重新設計 `list_chat_users()` 的角色過濾。
- [風險，實作階段發現] `conversation_members` 的 RLS 政策若直接以 `EXISTS (SELECT 1 FROM conversation_members ...)` 查詢自身資料表，會觸發該表自己的 RLS 政策而無限遞迴（PostgreSQL 報錯 `infinite recursion detected in policy for relation "conversation_members"`）。 → 緩解：改用 `SECURITY DEFINER` 輔助函式 `is_conversation_member(conversation_id, user_id)` 繞過 RLS 做成員資格檢查；`conversations`、`conversation_members`、`messages` 所有引用成員資格的政策統一改走此函式（見 `supabase/migrations/20260712130000_fix_conversation_members_rls_recursion.sql`）。
- [風險，實作階段發現] `chatService.ts` 建立對話時先 `INSERT conversations` 再另外 `INSERT conversation_members`（非同一交易），`.insert().select().single()` 的 `RETURNING` 在 PostgreSQL RLS 下也要通過 SELECT 政策；建立者在 members 列尚未寫入前不算「成員」，導致 RETURNING 被擋，報錯與 INSERT WITH CHECK 失敗文字完全相同（`new row violates row-level security policy for table "conversations"`），一開始難以分辨真正原因。 → 緩解：`conversations` 的 SELECT 政策新增 `created_by = auth.uid()` 條件，建立者一律能看到自己建立的對話，不受成員列寫入時序影響（見 `supabase/migrations/20260712150000_fix_conversations_select_for_creator.sql`）。另外同步修正 `chatService.ts` 所有 `throw error`（Supabase 回傳的是純物件 `PostgrestError`，非 `Error` 實例）改為 `throw new Error(error.message)`，避免 UI 層 `err instanceof Error` guard 吞掉真正的錯誤訊息、只顯示通用文字。
- [風險，實作階段發現] `ChatFab` 原規劃固定於 `right-6 bottom-6`，與 `/cases` 頁面既有的 `CaseQuickNavigator.tsx`（`fixed bottom-8 right-8`，上下捲動快速鍵）以及其他頁面的 `QuickScrollNavigator.tsx` 重疊。 → 緩解：`ChatFab`／`ChatPanel` 改為 `right-24`（水平往左偏移），與既有捲動 FAB 群共用同一底部對齊線但不同水平欄位，兩者視覺上仍同屬右下角區域但不重疊。
- [範圍擴充，使用者實測後要求] 新增「訊息收回」：`messages` 加 `deleted_at` 軟刪除欄位（比照 `todos` 軟刪除慣例，不清空 `content` 以保留稽核紀錄）；新增 `messages` 的 UPDATE RLS 政策（原本 messages 只有 SELECT/INSERT，無 UPDATE），限寄件者本人可收回自己的訊息；`useChatRealtime` 新增訂閱 `postgres_changes` 的 `UPDATE` 事件以同步收回狀態給其他線上成員；UI 顯示「此訊息已收回」佔位文字取代原內容。
- [範圍調整，使用者實測後要求] 新對話選擇器（`list_chat_users()`）加上活動篩選，理由是「只有登入但沒建案件的帳號」視為訪客/殭屍帳戶，不應出現在聊天對象清單。定義經過一次放寬調整：
  - 初版：近 10 天內有案件活動（`cases.updated_at >= now() - interval '10 days'`）。
  - **現版**（`supabase/migrations/20260712180000_relax_list_chat_users_activity.sql`）：使用者名下有**承辦中**案件（`cases.status NOT IN ('Closed', 'Cancelled')`，比照 `CASE_INACTIVE_STATUSES` 用排除法而非只認 `'Processing'`，因 `CaseStatus` 中英文值混用），且該案件近 **30 天**內有編輯（`cases.updated_at`）。
  - → 若之後有使用者完全沒有案件但仍需要聊天（例如純協作角色），需另開 change 重新設計「活躍」定義。
- [範圍擴充，使用者實測後要求] 新增「在線狀態」綠燈指示：新增 `src/components/chat/hooks/useOnlinePresence.ts`，用 Supabase Realtime **Presence**（channel `chat-online-presence`，`config.presence.key = currentUserId`，`track()` 自己上線、監聽 `sync` 事件取得目前線上使用者 id 集合）；`NewConversationPicker`（每位使用者旁）與 `ConversationList`（1 對 1 對話的對方名稱旁）顯示 `OnlineDot`（綠＝在線、灰＝離線）。群組對話不顯示（多人在線狀態意義不明確，暫不處理）。此為本次唯一使用 `presence` 的地方，Realtime 決策原本排除 presence 是針對「已讀回條」，不影響在線狀態這個獨立用途。
- [已確認非新增工作] 未讀訊息數在聊天入口上的角標本來就是即時的（`useUnreadCount` 訂閱 `messages`/`conversation_members` 的 `postgres_changes` 全域頻道，任何新訊息都會觸發重新計算），使用者詢問「有訊息會不會顯示數字」時已是既有行為，未額外開發。
- [範圍擴充，使用者實測後要求] 新增「刪除對話」：只從本人清單隱藏，比照 Gmail 刪除信件語意，不影響其他成員、不刪除訊息紀錄。`conversation_members` 加 `hidden_at` 欄位；`isConversationHidden(hiddenAt, lastMessageAt, conversationCreatedAt)`（`chatService.ts`，純函式，有單元測試）判斷「隱藏後若有新訊息（含自己再次發言）則自動恢復顯示」；沿用既有「本人可更新自己的已讀時間」UPDATE RLS 政策（未限制欄位），不需新增政策。UI 在 `ConversationList` 每列 hover 顯示垃圾桶圖示。
- [風險，實作階段發現] `ChatPanel` 原本以一般子元件方式渲染在 `ChatHeaderButton` 內、`ChatHeaderButton` 又渲染在 `<header>` 內；`<header>` 的 `backdrop-blur-xl`（`backdrop-filter`）在 Chromium 會讓該 header 成為其 `position: fixed`子孫元素的新 containing block，導致「fixed 定位」的 `ChatPanel` 實際上被限制在 header 的堆疊層內、視覺上卡在其他 header 內容（如「新增案件」按鈕）後方，而非真正浮在整個頁面最上層。 → 緩解：`ChatPanel` 改用 `createPortal` 直接掛載到 `document.body`（`mounted` state 處理 SSR 階段 `document` 不存在的情況），不受任何祖先元素的 filter/transform 堆疊context 影響。
- [範圍擴充，使用者實測後要求] 聊天入口從右下角浮動按鈕（`ChatFab`）改為 Header 右上角圖示按鈕（`ChatHeaderButton`，跟主題切換同一列）。因主系統 `Header.tsx` 與 `/investment` 模組有各自獨立的 header（`src/app/investment/layout.tsx`），`ChatHeaderButton` 需同時掛在兩處才能維持「所有頁面皆可見」；`ChatFab.tsx` 已刪除。

## Migration Plan

- 新增一支 migration（`supabase/migrations/<timestamp>_add_chat_schema.sql`）建立三張表、索引（`messages(conversation_id, created_at)`、`conversation_members(user_id)`）、RLS policies 與 `list_chat_users()` RPC。
- 屬於全新表，無既有資料需搬遷，無需 backfill。
- Rollback：若需回退，新增對應的 down migration 或直接 `DROP TABLE` 三張新表（因無其他表依賴它們，可安全刪除）。

## Open Questions

- 聊天面板要做成獨立路由（`/chat`）還是固定尺寸浮動卡片？目前採用右下角浮動卡片（見 UI 進入點決策，已從原規劃的側邊抽屜改為 Messenger 式 FAB），但若使用情境顯示訊息量大、需要更大版面，可能需要重新評估。
