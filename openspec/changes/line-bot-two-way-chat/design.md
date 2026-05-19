## Context

目前 `src/lib/lineService.ts` 只支援單向 Push Message，目標 User ID 硬編碼為環境變數 `LINE_USER_ID`（管理員本人）。`src/app/api/line/secure/route.ts` 是管理員主動從 Web App 發訊息的加密 API，不是 Webhook。

系統需要新增雙向能力：接收朋友的訊息（Webhook）、回覆給特定朋友（動態目標發送）、以及管理好友 User ID 的持久化清單。

## Goals / Non-Goals

**Goals:**
- 接收並驗證 LINE Webhook 事件（message / follow / unfollow）
- 朋友訊息自動轉發給管理員（附 @暱稱 回覆提示）
- 管理員輸入 `@暱稱 訊息` → Bot 解析並傳送給對應朋友
- 自動儲存加好友事件的 User ID 與顯示名稱到 `line_followers` 表

**Non-Goals:**
- 不支援群組聊天（Group Chat）
- 不支援 Rich Menu / Flex Message 回覆
- 不實作多管理員
- 不建立訊息歷史的 Web UI
- 不修改現有 ETF 推播邏輯

## Decisions

### LINE Signature 驗證機制

使用 `LINE_CHANNEL_SECRET` 對 `X-Line-Signature` header 做 HMAC-SHA256 驗證，在 Webhook handler 最前方驗證，驗證失敗立即返回 HTTP 400。

**替代方案考量：** 不驗證（直接處理）→ 任何人都可以偽造 Webhook 請求，產生偽造的 @reply 指令，安全性不可接受。

### 管理員辨識

以 `LINE_USER_ID` 環境變數代表管理員，Webhook 收到的訊息若 sender 的 `source.userId` 等於管理員 ID，視為管理員回覆指令；其他 userId 則視為朋友訊息。

**替代方案考量：** DB 儲存管理員 ID → 過度設計，系統只有一個管理員。

### @reply 解析規則

管理員訊息格式：`@暱稱 訊息內容`（空格分隔）。
- 以首個 token（`@` 開頭）作為暱稱 lookup key，查詢 `line_followers.display_name` 或 `nickname`
- 找不到暱稱 → 回覆管理員錯誤提示，不靜默失敗
- 無 `@` 前綴 → 管理員的普通訊息，不轉發（忽略）

### 資料表設計：`line_followers`

```
line_followers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text UNIQUE NOT NULL,  -- LINE User ID (Uxxxxxxxx)
  display_name  text,                   -- LINE 顯示名稱
  is_active     boolean DEFAULT true,   -- false = 已退好友
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
)
```

不啟用 RLS（由 Service Role 管理，Bot 是系統行為，不是用戶操作）。使用 `service.ts` client 讀寫。

### 轉發訊息格式

朋友訊息轉發給管理員的格式：
```
[好友 {display_name}] {原始訊息}

↩ 回覆：@{display_name} 你的訊息
```

這樣管理員一看就知道是誰傳的，且知道如何回覆。

### lineService.ts 擴充策略

在現有 `sendLineMessage()` 基礎上，新增 `sendLineMessageToUser(userId: string, text: string)` 函式，接受動態目標。現有函式維持向後相容（使用 `LINE_USER_ID` 環境變數）。

## Risks / Trade-offs

- [Reply Token 30 秒限制] → 本方案改用 Push Message 回覆（無時限），不使用 Reply API，避免管理員反應太慢導致 token 過期。
- [LINE 顯示名稱重複] → @暱稱 lookup 若有同名好友，取第一筆。現階段私人 Bot 好友數量少，不需要處理衝突；未來可加 UUID 後綴。
- [管理員誤傳普通訊息] → 不含 `@` 的管理員訊息直接忽略，不做任何事。設計上不回應確認，保持 Bot 靜默，避免噪音。
- [LINE_CHANNEL_SECRET 未設定] → Webhook handler 應在啟動時 early-return HTTP 500，不處理任何事件。
