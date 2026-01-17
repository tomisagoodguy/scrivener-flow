---
description: 建立並同步主分支的開發功能分支 (Start a new feature branch synchronized with main)
---

這個工作流將協助您從最新的 main 分支建立一個規範化的功能開發分支。

1. 請輸入您的功能名稱 (例如: `user-auth` 或 `api-optimization`)。
2. 切換至 main 分支以確保從最新進度開始。
// turbo
3. 執行 `git checkout main`
4. 從遠端儲存庫拉取最新程式碼。
// turbo
5. 執行 `git pull origin main`
6. 建立並切換至新的功能分支。
// turbo
7. 執行 `git checkout -b feature/[feature-name]`

---
**使用效益：**
- 確保分支始終源自最新的 main，減少衝突。
- 規範化分支命名規範 (`feature/xxx`)。
- 透過 turbo 模式自動化重複性 Git 指令。
