# Spec: LINE Completion Notification

## ADDED Requirements

### REQ-LCN-001: Completion Summary Notification

**Priority**: High
**Component**: ETF/notifiers/line_notifier.py

系統必須在 ETF 數據同步完成後，發送包含結構化摘要的 LINE 通知。

#### Scenario: 成功同步後發送完整摘要

**Given** ETF 同步流程成功完成
**And** 持股資料已儲存至資料庫
**When** 呼叫 `LineNotifier.notify_completion(summary)`
**Then** 使用者收到 Flex Message 通知，包含：

- ETF 代碼與資料日期
- 持股總數
- 同步範圍（天數）
- 異動統計（新增/剔除/調整數量）
- 可點擊的「查看詳細資訊」按鈕

#### Scenario: 無異動時的基本摘要

**Given** 本次同步無新增或剔除成分股
**And** 僅有權重調整
**When** 呼叫 `LineNotifier.notify_completion(summary)`
**Then** 使用者收到通知，顯示「無成分股異動，僅權重調整」

#### Scenario: LINE API 失敗時的降級處理

**Given** LINE API 回應錯誤或超時
**When** 嘗試發送 Flex Message
**Then** 系統記錄錯誤日誌
**And** 嘗試發送純文字訊息作為 fallback
**And** 不中斷主流程執行

---

### REQ-LCN-002: Summary Data Structure

**Priority**: High
**Component**: ETF/main.py

主流程必須組裝並提供正確的摘要數據結構給 LineNotifier。

#### Scenario: 組裝完整摘要數據

**Given** ETF 同步流程執行完畢
**When** 準備發送完成通知
**Then** 系統組裝 `summary` dictionary，包含：

```python
{
    "etf_code": str,
    "data_date": str,
    "total_holdings": int,
    "sync_days": int,
    "diff_stats": {
        "total_changes": int,
        "new_in": int,
        "removed": int,
        "adjusted": int
    },
    "top_changes": List[Dict]  # Optional, TOP 5 權重變化
}
```

#### Scenario: 無異動資料時的摘要

**Given** 本次同步無 diff_logs
**When** 組裝 summary
**Then** `diff_stats` 中所有計數為 0
**And** `top_changes` 為空陣列

---

### REQ-LCN-003: Flex Message Design

**Priority**: Medium
**Component**: ETF/notifiers/line_notifier.py

Flex Message 設計必須清晰易讀，符合使用者閱讀習慣。

#### Scenario: 卡片視覺設計規範

**Given** 設計 Flex Message 卡片
**When** 建立通知內容
**Then** 遵循以下規範：

- Header: 深色背景 (`#0F172A`)，白色文字
- Body: 清單式呈現，使用 emoji 增強可讀性
- Footer: 包含 URI Action 按鈕，指向 `/investment` 頁面
- 文字大小：標題 `lg`, 內容 `sm`, 備註 `xs`
- 顏色：新增用綠色 `#1DB446`，剔除用紅色 `#FF334B`

#### Scenario: 資訊層級與優先級

**Given** 通知內容需要優先顯示重要資訊
**When** 組織卡片 body
**Then** 資訊排列順序為：

1. 持股總數
2. 同步範圍
3. 異動統計（新增/剔除/調整）
4. TOP 5 權重變化（若有）

---

## MODIFIED Requirements

無（本次為新增功能，不修改現有需求）

---

## REMOVED Requirements

無
