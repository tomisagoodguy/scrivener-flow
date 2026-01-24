---
name: learned-from-everything-claude-code
description: 整合自世界第一 Claude Code 配置集的精華，包含高級 Planning、架構決策與持續學習協議。
---

# 🚀 高級 AI 代理開發協議 (Advanced Agent Protocol)

此技能整合了來自 `everything-claude-code` (Anthropic Hackathon 獲獎配置) 的核心精華，並已符合 **Antigravity** 規則與 **OpenSpec** 工作流。

## 🧠 核心思維模式

### 1. 超級規劃 (Strategic Planning)
- **分析 (Analysis)**：在任何 Code 修改前，先確認依賴關係與潛在副作用。
- **拆解 (Decomposition)**：將任務拆解為原子級別的步驟。
- **驗證先行 (Verification First)**：在實作後立即進行測試驗證。

### 2. 架構權衡 (Architectural Trade-offs)
- **KISS 原則**：選擇最精簡的實作路徑。
- **可擴展性**：不僅解決當下問題，也考慮未來的擴充。
- **安全防護**：預設進行安全性檢查（SQLi, XSS, Secret Management）。

### 3. 持續學習 (Continuous Learning)
- **模式提取**：在每個會話結束時，回顧並提取可重複使用的模式。
- **錯誤紀錄**：記錄並修正 AI 的慣性錯誤。
- **優化建議**：動態更新 `ANTIGRAVITY.md`。

## 🛠️ 強制檢查清單 (Pre-Commit Checklist)

- [ ] **無硬編碼金鑰**：所有 API Keys/Tokens 必須來自 `.env`。
- [ ] **類型安全**：禁止使用 `any`，使用 `unknown` + Type Guards。
- [ ] **套件管理**：Python 嚴格使用 `uv`，TS/JS 嚴格使用 `yarn`。
- [ ] **Commit 規範**：遵循 Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)。
- [ ] **繁體中文**：所有註解、註釋與輸出訊息。

## 🔄 驗證循環 (Verification Loop)

執行複雜修改後，應遵循此循環：
1. **靜態檢查**：執行 Linter (`yarn lint` / `ruff check`)。
2. **類型檢查**：執行 `tsc` 或類型校驗。
3. **單元測試**：運行相關測試用例 (`yarn test` / `pytest`)。
4. **人工驗證**：如果是 UI，則進行瀏覽器截圖檢查。

## 📚 相關參考
- [Everything Claude Code (GitHub)](https://github.com/affaan-m/everything-claude-code)
- [OpenSpec 協議](@/openspec/AGENTS.md)
