# 通知功能測試指南

## 前置設定

### 1. Gmail 設定
1. 前往 Google Account: https://myaccount.google.com/security
2. 啟用「兩步驟驗證」
3. 產生「應用程式密碼」
4. 在 `.env.local` 設定：
```env
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-char-app-password
```

### 2. LINE 設定
1. 前往 LINE Developers Console: https://developers.line.biz/console/
2. 建立 Messaging API Channel
3. 取得 Channel Access Token
4. 在 `.env.local` 設定：
```env
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
LINE_USER_ID=your-line-user-id
```

## 功能測試步驟

### Email 測試
```bash
curl -X POST http://localhost:3000/api/test/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "email": "recipient@example.com",
    "caseNumber": "TEST-001",
    "dueDate": "2026-01-25"
  }'
```

### LINE 測試
```bash
curl -X POST http://localhost:3000/api/test/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "line",
    "caseNumber": "TEST-001",
    "dueDate": "2026-01-25",
    "daysRemaining": 5
  }'
```

## 預期結果
- ✅ Email: 收到格式化的 HTML 郵件
- ✅ LINE: 收到文字提醒訊息
- ✅ API 回應: `{ "success": true, "message": "..." }`

## 錯誤排查
- Gmail 驗證失敗 → 檢查應用程式密碼是否正確
- LINE 401 錯誤 → 檢查 Channel Access Token
- LINE 400 錯誤 → 檢查 User ID 是否正確
