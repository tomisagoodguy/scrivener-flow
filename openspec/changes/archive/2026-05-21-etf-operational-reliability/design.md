## Context

**現有監控層次分析：**

| 失敗場景 | 現有通知 | 缺口 |
|---------|---------|------|
| Python Pipeline raise | LINE 警報 ✅ | 無 |
| CI runner 掉線/離線 | 無 ❌ | CI 層 |
| `uv sync` / checkout 失敗 | 無 ❌ | CI 層 |
| OOM kill / 系統資源不足 | 無 ❌ | CI 層 |
| GitHub 配額耗盡 | 無 ❌ | 配額監控 |
| Job 無限卡死（未設 timeout） | 最多 6 小時後 GitHub 強制終止，但無通知 | timeout 保護 |

**GitHub Actions 配額現況：**
- Private repo 免費 2000 分鐘/月
- 月用量估計：etf_daily（22 天 × ~35 分鐘）+ equity_weekly（4 次 × ~60 分鐘）≈ 1010 分鐘/月
- 約使用 50%，但新增步驟後會逐漸增加

**LINE 通知技術方案：**
GitHub Actions 中可用 `curl` 直接呼叫 LINE Messaging API，不依賴 Python 環境（即使 `uv sync` 失敗也能發）：

```bash
curl -X POST https://api.line.me/v2/bot/message/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -d '{
    "to": "$LINE_USER_ID",
    "messages": [{"type": "text", "text": "🚨 CI 失敗\n..."}]
  }'
```

## Goals / Non-Goals

**Goals:**

- CI job 任何步驟失敗時，5 分鐘內發出 LINE 通知（含 job 名稱、失敗 step、workflow run URL）
- `run-tracker` 和 `sync` job 設定 90 分鐘 timeout
- 每週日查配額，超過 1600 分鐘（80%）時發 LINE 警告
- `etf_daily.yml` 支援 `workflow_dispatch` 手動觸發時選擇 runner（`ubuntu-latest` 或 `self-hosted`）

**Non-Goals:**

- 不實作 ubuntu-latest 自動 fallback 到 self-hosted（GitHub Actions 不原生支援）
- 不修改 `equity_weekly.yml` 的 runner 選擇（週排程失敗率低，手動觸發即可）
- 不監控 Supabase 配額 / FinLab 配額（屬不同維度）

## Decisions

### 決策 1：CI failure 通知的格式

通知內容包含：
```
🚨 ETF CI 失敗
📅 2026-05-21
🔧 Job: run-tracker
💬 由 GitHub Actions 自動偵測
🔗 https://github.com/<owner>/<repo>/actions/runs/<run_id>
```

`run_id` 透過 `${{ github.run_id }}` 取得，`owner/repo` 透過 `${{ github.repository }}` 取得。

### 決策 2：timeout-minutes 設定值

| Job | 現有 | 新設定 | 理由 |
|-----|------|-------|------|
| `validate-registry` | 無 | 10 min | 只跑 validate 腳本，10 分鐘綽綽有餘 |
| `run-tracker` | 無 | 90 min | 目前正常 ~35 min，90 min 保留 2.5x 緩衝 |
| `sync`（equity_weekly） | 60 min（已有）| 維持 60 min | 已設定，不變動 |

### 決策 3：配額監控的 API 方式

GitHub API `GET /repos/{owner}/{repo}/actions/billing/minutes` 可查詢當月已用分鐘數，但需要 `repo` scope 的 PAT（`GITHUB_TOKEN` 預設無此權限）。

替代方案：用 `GET /orgs/{org}/settings/billing/actions`（需 org 權限）→ 不適用個人 repo。

**選擇**：使用者需在 GitHub Settings 新增 PAT（`PERSONAL_ACCESS_TOKEN`），workflow 以此查詢。若配額超過 1600 分鐘 → LINE 警告；超過 1800 分鐘 → LINE 緊急警告。

### 決策 4：runner 手動切換機制

在 `etf_daily.yml` 的 `workflow_dispatch` 加入 `runner` 輸入：

```yaml
workflow_dispatch:
  inputs:
    runner:
      description: '執行環境'
      required: false
      default: 'ubuntu-latest'
      type: choice
      options: ['ubuntu-latest', 'self-hosted']
```

Job 的 `runs-on` 改為 `${{ github.event.inputs.runner || 'ubuntu-latest' }}`。

Schedule 觸發時 `github.event.inputs.runner` 為空，走 `|| 'ubuntu-latest'` fallback。

## Risks / Trade-offs

- **[風險] PAT 需要定期更新**：GitHub PAT 有效期最長 1 年，過期後配額監控失效 → 緩解：設定 PAT 到期前 LINE 發出警告（PAT 本身的到期通知由 GitHub 郵件處理）
- **[Trade-off] CI failure 通知靠 `curl`，不夠豐富**：相比 Python 端可發 Flex Message，`curl` 只能發純文字 → 可接受，緊急通知以簡潔為主
- **[風險] self-hosted runner 在 workflow 中設定 runner 後，若機器離線 job 會等待**：GitHub 預設 runner timeout 6 小時 → 手動觸發前確認 runner 狀態；不適合 schedule 自動切換
