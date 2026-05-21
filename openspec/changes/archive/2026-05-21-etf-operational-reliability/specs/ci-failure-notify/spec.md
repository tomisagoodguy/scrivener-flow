# Spec: CI Failure Notify

## Purpose

補上 Python Pipeline 層通知的死角：當 GitHub Actions CI 環境本身失敗時（runner 離線、依賴安裝失敗、OOM），透過 `curl` 直接呼叫 LINE API 發出通知，不依賴 Python 環境是否可用。

---

## ADDED Requirements

### Requirement: etf_daily.yml 的 run-tracker job 失敗時發 LINE 通知

`etf_daily.yml` 的 `run-tracker` job SHALL 在最後加入一個 `if: failure()` 步驟，以 `curl` 呼叫 LINE Messaging API，發送包含 job 名稱、日期、workflow run URL 的純文字通知。

#### Scenario: run-tracker job 任何步驟失敗

- **WHEN** `run-tracker` job 中任何 step 以非零退出碼結束
- **THEN** 最後的 failure 通知步驟執行，LINE 收到格式如下的訊息：
  ```
  🚨 ETF CI 失敗
  📅 <日期>
  🔧 Job: run-tracker
  🔗 https://github.com/<repo>/actions/runs/<run_id>
  ```

#### Scenario: run-tracker job 全部步驟成功

- **WHEN** `run-tracker` job 所有 step 成功完成
- **THEN** failure 通知步驟不執行（`if: failure()` 條件不成立）

---

### Requirement: etf_daily.yml 的 validate-registry job 失敗時發 LINE 通知

`etf_daily.yml` 的 `validate-registry` job SHALL 同樣加入 `if: failure()` 通知步驟。

#### Scenario: registry 同步驗證失敗

- **WHEN** `validate_registry_sync.py` 以非零退出碼結束
- **THEN** LINE 收到通知：「🚨 ETF CI 失敗 / Job: validate-registry / ...」

---

### Requirement: equity_weekly.yml 的 sync job 失敗時發 LINE 通知

`equity_weekly.yml` 的 `sync` job SHALL 同樣加入 `if: failure()` 通知步驟。

#### Scenario: 週排程 sync job 失敗

- **WHEN** `sync` job 中任何 step 失敗
- **THEN** LINE 收到通知，標示「Job: sync (equity_weekly)」

---

### Requirement: run-tracker job 設定 90 分鐘 timeout

`run-tracker` job SHALL 設定 `timeout-minutes: 90`，超時時 GitHub 強制終止並觸發 `if: failure()` 通知步驟。

#### Scenario: job 超過 90 分鐘未完成

- **WHEN** `run-tracker` job 執行超過 90 分鐘（例如某步驟網路請求卡死）
- **THEN** GitHub Actions 強制終止，`if: failure()` 步驟執行，LINE 收到超時通知

#### Scenario: job 在 90 分鐘內正常完成

- **WHEN** `run-tracker` job 在 90 分鐘內完成所有 step
- **THEN** timeout 不生效，流程正常結束

---

### Requirement: validate-registry job 設定 10 分鐘 timeout

`validate-registry` job SHALL 設定 `timeout-minutes: 10`。

#### Scenario: validate-registry 超過 10 分鐘

- **WHEN** 驗證步驟超過 10 分鐘
- **THEN** GitHub 強制終止，LINE 收到通知
