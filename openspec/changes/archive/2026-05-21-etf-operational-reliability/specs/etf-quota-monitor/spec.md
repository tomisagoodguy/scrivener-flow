# Spec: ETF Quota Monitor

## Purpose

每週主動查詢 GitHub Actions 月度分鐘配額使用量，在接近上限前提早警告，避免月底 CI 靜默失敗。

---

## ADDED Requirements

### Requirement: 新增 quota_monitor.yml workflow，每週日執行

`.github/workflows/quota_monitor.yml` SHALL 設定 schedule cron 每週日 UTC 14:00（台灣時間 22:00）執行，透過 GitHub API 查詢當月 Actions 分鐘使用量。

#### Scenario: 正常週執行

- **WHEN** 每週日排程觸發
- **THEN** workflow 查詢 GitHub API 取得當月已用分鐘數，依閾值決定是否發 LINE

---

### Requirement: 配額超過 80%（1600/2000 分鐘）時發 LINE 警告

quota_monitor workflow SHALL 在查詢到當月已用分鐘數 ≥ 1600 時，發 LINE 訊息警告使用者考慮切換到 self-hosted runner。

#### Scenario: 使用量達 80% 警告線

- **WHEN** 當月 Actions 已用 1650 分鐘
- **THEN** LINE 收到：
  ```
  ⚠️ GitHub Actions 配額警告
  📊 本月已用：1650 / 2000 分鐘（82%）
  💡 建議手動觸發時切換 runner: self-hosted
  ```

#### Scenario: 使用量達 90%（1800 分鐘）緊急警告

- **WHEN** 當月 Actions 已用 1820 分鐘
- **THEN** LINE 收到更緊急的通知，建議立即切換 self-hosted runner，並說明切換方式（workflow_dispatch → runner: self-hosted）

#### Scenario: 使用量低於 80%

- **WHEN** 當月 Actions 已用 900 分鐘（< 1600）
- **THEN** workflow 靜默完成，不發 LINE

---

### Requirement: quota_monitor 使用 PERSONAL_ACCESS_TOKEN 查詢 API

quota_monitor workflow SHALL 使用 `secrets.PERSONAL_ACCESS_TOKEN`（`repo` scope PAT）呼叫 `GET /repos/{owner}/{repo}/actions/billing/minutes` API。

#### Scenario: PAT 有效且查詢成功

- **WHEN** API 回傳 HTTP 200
- **THEN** 解析 `total_minutes_used` 欄位進行閾值判斷

#### Scenario: PAT 過期或查詢失敗

- **WHEN** API 回傳非 200 狀態碼
- **THEN** LINE 收到：「⚠️ 配額查詢失敗，請確認 PERSONAL_ACCESS_TOKEN 是否有效」，workflow 以非零退出碼結束

---

### Requirement: quota_monitor 自身失敗時也發 LINE 通知

quota_monitor workflow 的 job SHALL 加入 `if: failure()` 步驟，防止監控工具本身靜默失敗。

#### Scenario: quota_monitor job 失敗

- **WHEN** quota_monitor 的 job 任何步驟失敗
- **THEN** LINE 收到：「🚨 配額監控 CI 失敗 / 請手動至 GitHub Actions 查看」
