---
paths:
  - "src/app/api/line/**"
  - "src/lib/lineService.ts"
  - "src/lib/lineFollowerService.ts"
---

# LINE Bot 規則

> **paths-scoped**：只在觸碰 LINE 相關檔案時載入。內容自 CLAUDE.md 遷移（2026-07-05）。

## 三層架構

| 層 | 檔案 | 職責 |
| :--- | :--- | :--- |
| **公開 Webhook** | `src/app/api/line/webhook/route.ts` | 接收 LINE 平台事件，HMAC-SHA256 簽章驗證後分派 |
| **安全推播** | `src/app/api/line/secure/route.ts` | 管理員呼叫的推播端點（需驗證 session） |
| **Follower 管理** | `src/lib/lineFollowerService.ts` | `upsertFollower` / `deactivateFollower` / `listActiveFollowers`（`line_followers` 資料表） |

**Webhook 支援的使用者指令：**

- `/list` — 回覆目前 Bot 好友清單
- 一般文字訊息 — Bot 依設定回應

**ETF 通知去重機制：** `etf_notification_log` 資料表記錄每日已發送的 Carousel，防止同一天重複推播。

## 注意事項

- `LINE_CHANNEL_SECRET` 用於 HMAC-SHA256 簽章驗證，若未設定會導致所有 Webhook 請求被拒
- `LINE_USER_ID` 是管理員推播目標，不是 Bot 的 Channel ID
- `/api/line/webhook` 為公開路由（不需 session），**勿加 Auth middleware**
