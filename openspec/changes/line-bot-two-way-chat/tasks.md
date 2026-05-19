## 1. 資料庫：建立 line_followers 表

- [x] 1.1 [P] 新增 migration 檔 `supabase/migrations/<timestamp>_add_line_followers.sql`，依 design.md「資料表設計：`line_followers`」規格建立表格（欄位：`id uuid PK`、`user_id text UNIQUE NOT NULL`、`display_name text`、`is_active boolean DEFAULT true`、`created_at/updated_at timestamptz`），不啟用 RLS
- [x] 1.2 [P] 在 `src/types/index.ts` 或 `src/types/line.ts` 新增 `LineFollower` TypeScript interface

## 2. lineService.ts：新增動態目標發送函式

- [x] 2.1 在 `src/lib/lineService.ts` 新增 `sendLineMessageToUser(userId: string, text: string): Promise<void>` 函式，依 design.md「lineService.ts 擴充策略」保持現有函式向後相容，新增動態目標版本
- [x] 2.2 在 `src/lib/lineService.ts` 新增 `verifyLineSignature(body: string, signature: string): boolean` 函式，使用 `LINE_CHANNEL_SECRET` 做 HMAC-SHA256 驗證（LINE Signature 驗證機制）

## 3. follower 管理邏輯

- [x] 3.1 [P] 建立 `src/lib/lineFollowerService.ts`，實作 `upsertFollower(userId: string, displayName: string | null): Promise<void>`，使用 `service.ts` client（follow event persists friend's User ID）
- [x] 3.2 [P] 在 `src/lib/lineFollowerService.ts` 實作 `deactivateFollower(userId: string): Promise<void>`（unfollow event deactivates friend record）
- [x] 3.3 在 `src/lib/lineFollowerService.ts` 實作 `findFollowerByDisplayName(displayName: string): Promise<string | null>`，case-insensitive 查詢 `is_active = true` 的記錄，回傳 `user_id` 或 `null`（follower lookup for @reply dispatching）

## 4. LINE Profile API 整合

- [x] 4.1 在 `src/lib/lineService.ts` 新增 `getLineUserProfile(userId: string): Promise<{ displayName: string } | null>` 函式，呼叫 `https://api.line.me/v2/bot/profile/{userId}` 取得用戶顯示名稱，失敗時回傳 `null`（profile API unavailable）

## 5. Webhook Handler

- [x] 5.1 建立 `src/app/api/line/webhook/route.ts`，`POST` handler 最前方呼叫 `verifyLineSignature()`，依 design.md「管理員辨識」以 `LINE_USER_ID` 區分管理員與朋友事件，失敗返回 HTTP 400；`LINE_CHANNEL_SECRET` 未設定返回 HTTP 500（webhook endpoint validates LINE signature）
- [x] 5.2 在 Webhook handler 中處理 `follow` 事件：呼叫 `getLineUserProfile()` 取得名稱，再呼叫 `upsertFollower()`（follow event persists friend's User ID）
- [x] 5.3 在 Webhook handler 中處理 `unfollow` 事件：呼叫 `deactivateFollower()`（unfollow event deactivates friend record）
- [x] 5.4 在 Webhook handler 中處理非 admin 的 `message` 事件（text 類型）：依 design.md「轉發訊息格式」組合 `[好友 {display_name}] {text}\n\n↩ 回覆：@{display_name} 你的訊息` 並呼叫 `sendLineMessageToUser(LINE_USER_ID, ...)`（friend messages are forwarded to the admin）
- [x] 5.5 在 Webhook handler 中處理非 admin 的 `message` 事件（非 text 類型）：回覆固定訊息 `目前只支援文字訊息，謝謝！`（non-text message events from friends receive a canned reply）
- [x] 5.6 在 Webhook handler 中處理 admin 的 `message` 事件：依 design.md「@reply 解析規則」解析 `@{nickname} {message}`，呼叫 `findFollowerByDisplayName()` 取得 userId；找到則 Push 給朋友，找不到則回傳錯誤提示給 admin（admin @reply command is dispatched to the target friend；nickname not found）
- [x] 5.7 在 Webhook handler 中處理 admin 發送不含 `@` 前綴的訊息：忽略，直接 return HTTP 200（admin sends a message without @ prefix）

## 6. 環境變數更新

- [x] 6.1 在 `.env.local` 新增 `LINE_CHANNEL_SECRET=` 欄位；在 `CLAUDE.md` 的環境變數表更新說明（LINE Signature 驗證機制）
- [x] 6.2 在 Vercel 環境變數設定中新增 `LINE_CHANNEL_SECRET`；在 LINE Developers Console 的 Messaging API 設定中填入 Webhook URL：`https://scrivener-flow.vercel.app/api/line/webhook`

## 7. 測試

- [x] 7.1 [P] 為 `verifyLineSignature()` 撰寫單元測試，覆蓋：正確 signature 通過、錯誤 signature 拒絕、空 secret 返回 false
- [x] 7.2 [P] 為 `findFollowerByDisplayName()` 撰寫單元測試，覆蓋：完全相符、大小寫不符仍相符、無 active 記錄返回 null
