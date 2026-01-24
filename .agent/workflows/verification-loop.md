---
description: 執行系統化的驗證循環，確保代碼品質。
---

# 🔄 驗證循環 (Verification Loop) 工作流

此工作流確保在任何代碼變更後，系統的功能、效能與安全性均達到標準。

## 執行步驟

### Step 1: 靜態分析 (Static Analysis)
- 檢查 TypeScript 編譯錯誤。
- 執行 Linter 確認代碼風格。

```bash
# TypeScript
yarn tsc --noEmit

# ESLint
yarn lint
```

### Step 2: 單元與整合測試 (Unit & Integration Tests)
- 執行相關的單元測試。
- 確保沒有破壞現有功能。

```bash
yarn test
```

### Step 3: 安全性掃描 (Security Scan)
- 檢查是否有硬編碼的金鑰。
- 檢查是否有不安全的 API 使用。

### Step 4: UI/UX 驗證 (僅限前端修改)
- 使用 `agent-browser` 或 `playwright-skill` 進行截圖或互動測試。
- 確認在不同螢幕尺寸下的響應式效果。

### Step 5: 手動回報
- 向使用者總結驗證結果。
- 提供相關的測試輸出片段。

## 何時使用？
- 在完成重大功能開發後。
- 在準備提交 Pull Request 前。
- 在修復複雜的 Bug 後。
