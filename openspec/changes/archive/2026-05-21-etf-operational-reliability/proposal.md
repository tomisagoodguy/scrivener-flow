## Why

目前 LINE 警報只在 Python Pipeline 內部 raise 時觸發（`PipelineOrchestrator` 捕捉後發送）。若 CI 環境本身出問題——runner 掉線、`uv sync` 失敗、OOM kill、GitHub 配額耗盡——Python 程式根本來不及執行，使用者完全不知道當日資料沒有更新。加上 `run-tracker` job 沒有 timeout，單步卡死可能讓整個 job 掛在那，直到 GitHub 6 小時強制終止。

## What Changes

- 在 `etf_daily.yml` 與 `equity_weekly.yml` 的每個 job 末尾加入「CI 層級失敗通知」步驟（`if: failure()` + `curl` 呼叫 LINE API），補上 Python 層通知的死角
- 為 `run-tracker` 與 `sync` job 加入 `timeout-minutes: 90`，防止無限卡住
- 新增每週 GitHub Actions 配額監控 workflow，使用量超過 80%（1600 分鐘/月）時發 LINE 警告
- 為 `etf_daily.yml` 加入 `workflow_dispatch` 的 `runner` 輸入參數，讓使用者能不修改 YAML 就手動切換到 self-hosted runner

## Capabilities

### New Capabilities

- `ci-failure-notify`: CI job 失敗時（非 Python 應用層）自動發送 LINE 通知，補全監控死角
- `etf-quota-monitor`: 每週監控 GitHub Actions 月度配額使用量，接近上限時提前警告
- `etf-runner-failsafe`: 透過 `workflow_dispatch` 參數支援手動切換 runner，無需修改 YAML

### Modified Capabilities

（無既有 spec 需變更）

## Impact

- **修改 Workflow**：`.github/workflows/etf_daily.yml`、`.github/workflows/equity_weekly.yml`（加 timeout + CI failure step + runner dispatch input）
- **新增 Workflow**：`.github/workflows/quota_monitor.yml`（每週日執行，查 GitHub API 配額）
- **新增 GitHub Secret**：`GITHUB_TOKEN`（已存在於 Actions 環境，無需新增）、`PERSONAL_ACCESS_TOKEN`（查配額 API 需要 repo scope PAT）
- 不修改 Python Pipeline 程式碼，不新增 DB 表
