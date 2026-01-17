---
description: 徹底清除並重裝依賴 (Fix "it works on my machine" issues)
---

這個工作流將協助您解決依賴衝突或壞掉的 `node_modules`。

1. 刪除現有的 `node_modules`。
// turbo
2. 執行 `rm -rf node_modules` (在 Windows 使用 `powershell -command "Remove-Item -Path node_modules -Recurse -Force"`)
3. 刪除 `yarn.lock` 或 `package-lock.json` 以避免版本衝突。
// turbo
4. 執行 `powershell -command "Remove-Item -Path yarn.lock, package-lock.json -ErrorAction SilentlyContinue"`
5. 重新安裝所有依賴。
// turbo
6. 執行 `yarn install`

---
**適用時機：**
- 依賴版本衝突。
- 毀損的 `node_modules`。
- 切換分支後出現「Module not found」錯誤。
