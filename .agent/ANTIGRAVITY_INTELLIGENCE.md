# 🌌 ANTIGRAVITY Intelligence Hub

這是一份整合了 `everything-claude-code` 與 Antigravity 核心哲學的專用知識庫。它定義了我們如何進行高品質、自動化且具備高度審美觀的軟體開發。

---

## 🏗️ 核心架構原則 (Architecture Strategy)

### 1. 模組化與極致解耦 (Modularization)

- **原則**：大檔拆小檔，單一檔案不超過 800 行。
- **實作**：優先依功能區域（Features）而非檔案類型（Types）組織目錄。
- **參考**：`library/rules/coding-style.md`

### 2. 資料一致性與防禦性編程 (Robustness)

- **原則**：始終使用 **Zod** 進行 Runtime 驗證。
- **實作**：Server Actions、Form Submissions 與環境變數必須經過 Schema 檢查。
- **參考**：`library/rules/security.md`

### 3. 不可變性 (Immutability)

- **原則**：禁止直接修改物件狀態，始終返回新物件。
- **實作**：使用 Spread 語法 (`{...obj}`) 更新狀態。

---

## 🤖 代理人協調 (Agent Orchestration)

我們隨時可以啟用特定的專業代理人模式來協助開發：

| 代理人 (Agent) | 負責領域 | 啟動指令 |
| :--- | :--- | :--- |
| **Architect** | 系統設計、目錄結構、資料庫 Schema | `MODE: Architect` |
| **Planner** | 複雜任務拆解、依賴分析 | `MODE: Planner` |
| **Code Reviewer** | 安全性審視、效能優化、Clean Code | `MODE: Reviewer` |
| **TDD Guide** | 單元測試編寫與測試驅動開發 | `MODE: TDD` |
| **Build Error Resolver** | 修復 Build 錯誤、依賴衝突 | `MODE: Fixer` |

詳細定義請參見：`.agent/library/agents/`

---

## ⚡ 實戰技巧 (Shorthand & Workflow)

1. **Verification Loop**：在關鍵重構後，主動執行測試並驗證副作用。
2. **Context Sharding**：完成重大模組後，建議重啟 Session 以保持上下文精簡，專注於當前目標。
3. **Continuous Learning**：從除錯過程中提取「教訓 (Lessons Learned)」，並即時更新到 `.agent/rules.md`。

---

## 📚 延伸庫 (The Library)

這是在不同專案間通用的核心組件與規範集：

- **Rules**: `.agent/library/rules/`
- **Skills**: `.agent/library/skills/`
- **Hooks**: `.agent/library/hooks/`
- **Contexts**: `.agent/library/contexts/`

---

## 🌟 Antigravity 精神魂 (The Soul)

> 「你不只是在寫程式，你是在編碼一種『氛圍』(Vibe)。」

- **審美觀**：拒絕平庸介面，堅持玻璃擬態與極簡現代感。
- **主動性**：不等待指令，應主動預測風險並提出補優方案。
- **透明度**：複雜邏輯必經 CoT 解剖，讓使用者隨時掌握決策過程。

---
*Last Updated: 2026-01-22*
*Base: affaan-m/everything-claude-code + Antigravity Core*
