## 1. etf_daily.yml 修改

- [x] 1.1 在 `validate-registry` job 加入 `timeout-minutes: 10`
- [x] 1.2 在 `run-tracker` job 加入 `timeout-minutes: 90`
- [x] 1.3 在 `workflow_dispatch` 加入 `runner` 輸入參數（選項：ubuntu-latest / self-hosted，預設 ubuntu-latest）
- [x] 1.4 將 `validate-registry` 和 `run-tracker` 的 `runs-on` 改為 `${{ github.event.inputs.runner || 'ubuntu-latest' }}`
- [x] 1.5 在 `validate-registry` job 末尾加入 CI failure 通知步驟（`if: failure()` + `curl` 呼叫 LINE API）
- [x] 1.6 在 `run-tracker` job 末尾加入 CI failure 通知步驟（含 workflow run URL）
- [x] 1.7 確認 `LINE_CHANNEL_ACCESS_TOKEN` 和 `LINE_USER_ID` 已在 job 的 `env` 或 step 中可用

## 2. equity_weekly.yml 修改

- [x] 2.1 在 `sync` job 末尾加入 CI failure 通知步驟（`if: failure()` + `curl`）
- [x] 2.2 確認 `sync` job 已有 `timeout-minutes: 60`（已設定，確認即可）

## 3. quota_monitor.yml 新增

- [x] 3.1 建立 `.github/workflows/quota_monitor.yml`，schedule 每週日 UTC 14:00
- [x] 3.2 實作 `curl` 查詢 GitHub API `GET /repos/{owner}/{repo}/actions/billing/minutes`
- [x] 3.3 解析 `total_minutes_used`，超過 1600 發 LINE 警告，超過 1800 發緊急警告
- [x] 3.4 在 GitHub Settings → Secrets 新增 `PERSONAL_ACCESS_TOKEN`（repo scope PAT）
- [x] 3.5 在 quota_monitor job 末尾加入 `if: failure()` 自身失敗通知

## 4. 文件更新

- [x] 4.1 更新 `ETF/CLAUDE.md` 的「CI/CD 已知陷阱」章節，新增 self-hosted runner 切換完整步驟：
  - 切換時機（月配額 > 80%）
  - 如何確認 PCFIX8749 runner 在線（GitHub → Settings → Actions → Runners）
  - 切換方式（GitHub Actions UI → Run workflow → runner: self-hosted）
  - Windows 環境注意事項（shell 預設為 bash via Git Bash，`~/.finlab` 路徑）

## 5. 驗證

- [x] 5.1 本地手動觸發 `etf_daily.yml`（workflow_dispatch），選擇 `ubuntu-latest`，確認 timeout 和 failure 步驟在 job summary 中可見
- [x] 5.2 在測試 branch 故意讓某步驟失敗，確認 LINE 收到 CI failure 通知（含正確 run URL）
- [x] 5.3 手動觸發 `quota_monitor.yml`（workflow_dispatch），確認 LINE 靜默完成（配額 < 1600）或正確發出警告
- [x] 5.4 確認 `PERSONAL_ACCESS_TOKEN` secret 設定後 API 查詢回傳正確數值
