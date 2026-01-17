---
name: git-workflow-agent
description: Git 版本控制與提交規範。
---

# Git 工作流規範

## 🚀 核心流程

所有變更必須遵循以下流程：

1. **變更確認**：確認所有修改皆符合需求。
2. **暫存變更**：`git add .` 或 `git add -A`。
3. **提交訊息**：使用 Conventional Commits 格式。
4. **推送**：`git push origin <branch_name>`。

## 📝 Commit 訊息規範 (Conventional Commits)

格式：`<type>(<scope>): <description>`

| 類型 (Type) | 說明 |
| :--- | :--- |
| **feat** | 新功能 (New Feature) |
| **fix** | 修補 Bug (Bug Fix) |
| **docs** | 文件變更 (Documentation) |
| **style** | 程式碼格式調整 (不影響邏輯) |
| **refactor** | 重構 (無新功能也無修 Bug) |
| **perf** | 效能優化 |
| **test** | 新增或修正測試 |
| **chore** | 建置過程或輔助工具變更 |

## 💡 範例

```bash
git add .
git commit -m "feat(auth): 實作 JWT 驗證邏輯"
git commit -m "fix(api): 修正資料庫連接超時問題"
```

---
*由 Global Rules 自動分割而成。*
