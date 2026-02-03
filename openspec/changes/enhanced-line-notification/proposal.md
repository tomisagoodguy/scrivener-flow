# Proposal: Enhanced LINE Notification

## Overview

**Change ID**: `enhanced-line-notification`
**Status**: Proposed
**Created**: 2026-02-03
**Problem**: 目前 ETF 數據同步的 LINE 通知僅發送「同步完成」訊息，缺少實際同步內容的詳細清單，使用者無法直接從通知中了解本次同步的具體資料。

## User Value

使用者能在每次 GitHub Actions 執行後，立即從 LINE 通知中看到：

- **同步的持股數量**
- **新增/剔除的成分股列表**
- **權重變化最大的前 5 檔股票**
- **本次數據日期與同步範圍**

這讓使用者無需打開網頁即可快速掌握投資組合變化。

## Scope

### In Scope

- ✅ 擴展 `LineNotifier` 的完成通知，包含結構化摘要
- ✅ 新增 Flex Message 卡片，展示持股統計與異動清單
- ✅ 在 `main.py` 中傳遞必要的統計數據給 notifier
- ✅ 保留現有的 diff 異動通知機制

### Out of Scope

- ❌ 修改資料庫 Schema
- ❌ 改變 GitHub Actions 的執行邏輯
- ❌ 新增使用者設定功能（如自訂通知格式）

## Acceptance Criteria

1. **完成時觸發通知**：每次 ETF 同步完成後發送包含摘要的 Flex Message
2. **清單資訊完整**：通知中包含持股總數、新增、剔除、TOP 5 權重變化
3. **向下相容**：不影響現有的 diff 異動通知功能
4. **Graceful Degradation**：若 LINE API 失敗，不影響主流程執行

## Technical Approach

### 高層架構

```
ETF Main Pipeline
  ├─ Scraper (獲取最新持股)
  ├─ Diff Engine (計算異動)
  ├─ Storage (存入資料庫)
  └─ Notifier
      ├─ notify_diffs() [現有]
      └─ notify_completion() [新增] ← 本次實作重點
```

### 關鍵變更點

1. **新增方法**：`LineNotifier.notify_completion(summary: Dict)`
2. **摘要數據**：在 `main.py` 中組裝 summary dict
3. **Flex Message 設計**：使用 LINE Flex Message Bubble 展示結構化內容

## Dependencies

- 現有：`requests`, `python-dotenv`
- 新增：無（使用現有套件）

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LINE API 超時/失敗 | 通知未送達 | 使用 try-except 包裹，記錄錯誤但不中斷流程 |
| Flex Message 格式錯誤 | 通知發送失敗 | 提前驗證 JSON schema，fallback 到純文字訊息 |
| 資料不完整 | 通知內容缺漏 | 設定預設值與安全檢查 |

## Alternatives Considered

1. **使用 Email 通知**：太重量級，查看不即時
2. **使用 Slack**：需要額外整合，用戶已有 LINE 環境
3. **僅文字訊息**：缺乏結構化呈現，閱讀體驗差

**選擇方案**：LINE Flex Message - 平衡了即時性、美觀性與實作成本

## Implementation Plan

詳見 `tasks.md`
