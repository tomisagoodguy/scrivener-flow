---
paths:
  - ".github/workflows/**"
---

# CI/CD 規則

> **paths-scoped**：只在觸碰 `.github/workflows/**` 時載入。內容自 CLAUDE.md 遷移（2026-07-05）。

## 工作流

| Workflow | 排程 | 執行內容 |
| :--- | :--- | :--- |
| `etf_daily.yml` | 每日 UTC 14:00（台灣 22:00） | `main.py --days 30` → `sync_stock_financials.py --days 60 --skip-shareholder` → `daily_ai_report.py` |
| `equity_weekly.yml` | 每週六 UTC 14:00 | `sync_equity_distribution.py` → `sync_stock_financials.py --days 14`（含股東結構） |

Pipeline 需要的 GitHub Secrets：`SUPABASE_DB_URL`、`FINLAB_API_TOKEN`、`GOOGLE_GEMINI_API_KEY`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`。

## 已知陷阱

- **Claude Code agent worktree 會變成 gitlink**：`.claude/worktrees/` 目錄若被 commit，git 會以 mode `160000` 記錄為 gitlink；CI 的 `git submodule` 步驟找不到對應 `.gitmodules` 記錄就報錯。已在 `.gitignore` 加入 `.claude/worktrees/`，未來 agent worktree 不會再被追蹤。
- **GitHub Actions 免費額度**：Private repo 每月 2,000 分鐘，月底重置。目前三個 workflow 月用量約 800 分鐘。額度用完當月 CI 會失敗，等下月重置即可。
- **Self-hosted Runner 已設定**：`C:\Users\user\actions-runner`（機器名稱 PCFIX8749），開機自動啟動。額度不足時將 workflow 的 `runs-on: ubuntu-latest` 改成 `runs-on: self-hosted` 即可切換到本機執行，不消耗 GitHub 額度。
