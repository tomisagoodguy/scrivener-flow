## 1. 資料庫 Schema 與 RLS

- [x] 1.1 建立 migration `supabase/migrations/<timestamp>_add_chat_schema.sql`，實作設計文件「資料模型：conversations / conversation_members / messages」所述的三張表（含欄位、外鍵、`messages(conversation_id, created_at)` 與 `conversation_members(user_id)` 索引）；驗證方式：於本地/測試專案執行該 migration 後，`psql` 或 Supabase Studio 查詢 `information_schema.tables` 確認三張表與索引皆存在。
- [x] 1.2 在同一 migration 中加入設計文件「RLS：比照現有「全公司共用單一空間」，用成員關係而非租戶隔離」所述的 RLS policies（`conversations`/`conversation_members`/`messages` 的 SELECT/INSERT/UPDATE 規則）；驗證方式：以非對話成員的測試帳號直接呼叫 Supabase REST API 查詢/寫入 `messages`、`conversations`，確認回傳空結果或被拒絕（對應 spec 需求「Access to conversations and messages is restricted to members」的兩個 Scenario）。
- [x] 1.3 在同一 migration 中新增 `SECURITY DEFINER` RPC 函式 `list_chat_users()`，僅回傳 `auth.users` 的 `id, email` 兩欄；驗證方式：以任一登入帳號呼叫該 RPC，確認回傳不含 `encrypted_password`、`raw_app_meta_data` 等敏感欄位，且能列出除自己以外的其他使用者。

## 2. 型別與資料存取層

- [x] 2.1 建立 `src/types/chat.ts`，定義 `Conversation`、`ConversationMember`、`ChatMessage` 型別，欄位與 migration schema 一致，不使用 `any`；驗證方式：`yarn tsc --noEmit` 通過。
- [x] 2.2 建立 `src/lib/chat/chatService.ts`，提供建立/重用 1 對 1 對話、建立群組對話、送出訊息、更新 `last_read_at`、呼叫 `list_chat_users()` 的函式；驗證方式：撰寫單元測試涵蓋「選取單一使用者建立 1 對 1 對話時若已存在對話則重用而非新建」與「選取多位使用者建立群組對話」兩種情境（對應 spec 需求「Users can discover and start conversations without approval」的三個 Scenario），`yarn test --testPathPatterns chatService` 通過。

## 3. Realtime 即時訊息

- [x] 3.1 建立 `src/components/chat/hooks/useChatRealtime.ts`，依設計文件「Realtime：broadcast 即時送達 + postgres_changes 作為补強/多分頁同步」的順序（先 INSERT 成功才 broadcast），實作訂閱 `chat:<conversation_id>` channel 並在收到 `new_message` broadcast 事件時更新畫面；驗證方式：手動測試——兩個不同瀏覽器 session 分別登入帳號 A、B，A 送出訊息後 B 的畫面在未重新整理下顯示該訊息（對應 spec 需求「Users can send and receive messages in real time」的第一個 Scenario）。
- [x] 3.2 在訊息送出流程中，當 `messages` 表 INSERT 失敗時，於送出者畫面標示該則訊息為「送出失敗」且不送出 broadcast；驗證方式：模擬 RLS 拒絕或網路錯誤（例如暫時移除該使用者的 conversation member 資格）送出訊息，確認畫面出現失敗標示且其他成員未收到該訊息（對應 spec 需求「Users can send and receive messages in real time」的第二個 Scenario）。

## 4. 未讀計數

- [x] 4.1 建立 `src/components/chat/hooks/useUnreadCount.ts`，依對話最新訊息時間與 `conversation_members.last_read_at` 比較計算每個對話與總未讀數；驗證方式：撰寫單元測試涵蓋「新訊息送達後未讀數增加」情境（對應 spec 需求「Conversation list shows unread counts」的第一個 Scenario），`yarn test --testPathPatterns useUnreadCount` 通過。
- [x] 4.2 實作開啟對話時呼叫 `chatService` 更新 `last_read_at` 的邏輯；驗證方式：手動測試——開啟未讀對話後角標歸零，重新整理頁面後角標維持歸零（對應 spec 需求「Conversation list shows unread counts」的第二個 Scenario）。

## 5. UI 元件與側邊欄進入點

- [x] 5.1 建立 `src/components/chat/NewConversationPicker.tsx`，呼叫 `list_chat_users()` 顯示所有其他使用者（email + 姓名）供勾選，選 1 人建立 1 對 1、選 2 人以上需輸入群組名稱建立群組；驗證方式：於瀏覽器手動測試兩種建立流程皆能成功導向對應對話（對應 spec 需求「Users can discover and start conversations without approval」）。
- [x] 5.2 建立 `src/components/chat/ConversationList.tsx`、`src/components/chat/MessageThread.tsx`、`src/components/chat/ChatPanel.tsx`，組成依最新訊息時間排序的對話清單與訊息串 UI；驗證方式：瀏覽器手動測試對話清單排序與訊息顯示正確，並依 `src/lib/investment/holdingsUtils.ts` 等現有元件的既有 UI 風格（玻璃擬態 `.glass-card`）維持一致視覺。
- [x] 5.3 依設計文件「UI 進入點」決策，在 `src/components/layout/SideNav.tsx` 新增聊天圖示進入點，未讀總數 > 0 時顯示角標數字，點擊開啟 `ChatPanel`；驗證方式：瀏覽器手動測試（對應 spec 需求「Sidebar entry point with unread badge」的 Scenario：有未讀時顯示角標數字、無未讀時角標隱藏）。

## 6. 驗證與收尾

- [x] 6.1 執行 `yarn lint` 與 `yarn tsc --noEmit`，確認新增檔案無 lint 錯誤與型別錯誤；驗證方式：兩指令皆回傳 exit code 0。
- [ ] 6.2 依設計文件 Migration Plan，於本地 Supabase 專案套用該 migration 並執行一次完整手動驗收（對應 Implementation Contract 的四個驗收條件：即時 1 對 1 訊息送達、群組訊息送達、未讀角標歸零並持久化、非成員被 RLS 拒絕存取）；驗證方式：逐條核對四個驗收條件皆通過，並記錄於本次 change 的驗收結果。
