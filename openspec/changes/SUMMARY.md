# 🌙 全站深色模式 OpenSpec 規劃完成

## 📋 更新說明

**重大範圍變更**：使用者澄清需求後，提案從「投資頁面」擴大至「全站深色模式」

---

## ✅ 已完成的 OpenSpec 提案

### 1. 📱 Enhanced LINE Notification

**狀態**：✅ 保持不變
**路徑**：`openspec/changes/enhanced-line-notification/`

**核心功能**：

- 擴展 LINE 通知，發送詳細的數據同步清單
- 使用 Flex Message 結構化呈現
- 包含持股總數、異動統計、TOP 5權重變化

**預估時間**：~70 分鐘

---

### 2. 🌙 Global Dark Mode (Full Site)

**狀態**：🔄 **範圍已擴大到全站**
**路徑**：`openspec/changes/investment-dark-mode/`

#### 📁 文件結構

```
investment-dark-mode/
├── proposal.md          # ✅ 已更新 - 全站範圍
├── tasks.md             # ✅ 已更新 - 5 Phases 完整流程
├── design.md            # ⚠️ 設計文件保留（配色、元件規範仍適用）
└── specs/
    └── dark-mode-ui/
        └── spec.md      # ⚠️ 規格保留（需小幅更新範圍）
```

#### 🔍 現狀分析

**發現**：

- ✅ `ThemeProvider` 已存在（`src/components/providers/ThemeProvider.tsx`）
- ❌ 但被強制鎖定為 `light` mode（no-op toggleTheme）
- ❌ `globals.css` 第 3-17 行明確禁用深色模式

  ```css
  :root { color-scheme: light only; }
  @media (prefers-color-scheme: dark) {
      :root { color-scheme: light only; }
  }
  ```

- ✅ 多數元件已有 `dark:` class variants（Header, SideNav 等）
- 🎯 **結論**：專案曾規劃過深色模式，但後來被禁用

#### 🚀 實作策略

**三步走**：

1. **移除禁用** → 清理 globals.css 的強制淺色設定
2. **重構 Provider** → 實作真正的主題切換與持久化邏輯
3. **逐頁啟用** → 確保全站元件正確支援 dark mode

#### 🎯 核心功能

##### Phase 1: 基礎設施 (~60 分鐘)

- ✅ 移除 `globals.css` 第 3-17 行的禁用程式碼
- ✅ 重構 `ThemeProvider.tsx` (實作真正的切換邏輯)
- ✅ 擴展 `tailwind.config.ts` (Fintech Dark Mode 配色)
- ✅ 建立 `ThemeToggler` 元件 (放置於 Header)

##### Phase 2: 全站佈局 (~30 分鐘)

- ✅ Layout Root (`layout.tsx`)
- ✅ Header (補充 ThemeToggler)
- ✅ SideNav

##### Phase 3: 全站頁面 (~90 分鐘)

- ✅ 首頁 (Dashboard)
- ✅ 案件管理 (`/cases`)
- ✅ 投資監控 (`/investment`) - 包含 Charts
- ✅ 共筆 (`/knowledge`)
- ✅ 其他頁面 (banks, redemptions, clauses, guidelines, notes, calculator)

##### Phase 4: 共用元件 (~30 分鐘)

- ✅ UI Components (Card, Tabs, Badge, Button)
- ✅ Form Components (Input, Textarea, Select)

##### Phase 5: 測試優化 (~30 分鐘)

- ✅ WCAG AAA 對比度測試
- ✅ 跨瀏覽器測試
- ✅ 效能測試 (FPS ≥ 60)

#### 🎨 設計系統（UI PRO MAX）

**配色方案** (基於 UI Pro Max - Fintech/Crypto):

```css
--dark-bg: #0F172A          /* Slate 950 - OLED 深黑 */
--dark-text: #F8FAFC        /* Slate 50 - 主文字 (15.28:1) */
--dark-primary: #F59E0B     /* Amber 500 - 金黃強調 */
--dark-cta: #8B5CF6         /* Violet 500 - 行動按鈕 */
--dark-positive: #10B981    /* Emerald 500 - 正值 */
--dark-negative: #EF4444    /* Red 500 - 負值 */
```

**風格特徵**：

- Dark Mode (OLED): 高對比度、低功耗
- Glassmorphism: 適度透明與模糊
- Subtle Glow: Violet 輝光效果

#### 📊 預估時間

**全站實作**：~4 小時（vs. 原投資頁面 3 小時）

---

## 🔄 兩個提案的關聯性

這兩個提案仍是**獨立**的：

- **Enhanced LINE Notification**: 後端/通知層（Python）
- **Global Dark Mode**: 前端/UI 層（React/TypeScript）

可並行或依序實作。

---

## 🚀 下一步建議

### 選項 A: 優先深色模式（推薦）

1. 先實作 **Global Dark Mode**（~4 小時）
   - 視覺效果立即可見
   - 提升全站使用體驗
2. 再完成 **Enhanced LINE Notification**（~1 小時）

### 選項 B: 優先通知改善

1. 先做 **Enhanced LINE Notification**（~1 小時）
2. 再做 **Global Dark Mode**（~4小時）

### 選項 C: 並行開發

如果有多位開發者，可同時進行。

---

## 📁 檔案位置

```
c:\Users\user\Documents\GitHub\scrivener-flow\openspec\changes\
├── SUMMARY.md (本文件)
│
├── enhanced-line-notification/
│   ├── proposal.md
│   ├── tasks.md
│   └── specs/line-completion-notification/spec.md
│
└── investment-dark-mode/  (⚠️ 名稱保留，但範圍已擴大到全站)
    ├── proposal.md         (✅ 已更新)
    ├── tasks.md            (✅ 已更新)
    ├── design.md           (保留 - 設計規範仍適用)
    └── specs/dark-mode-ui/spec.md (保留 - 規格仍適用)
```

---

## 💡 關鍵發現與決策

### 為什麼要移除深色模式禁用？

1. **使用者需求**：全站夜間模式
2. **技術債務**：ThemeProvider 存在但被禁用（no-op）
3. **基礎已備**：多數元件已有 `dark:` variants
4. **成本評估**：重構比重寫更高效

### 為什麼不重新命名 change ID？

1. **OpenSpec 慣例**：ID 一旦建立通常不改
2. **追溯性**：保留原 ID 有助於追蹤演進
3. **補充說明**：在 proposal.md 中明確標註範圍擴大

---

## ✅ 準備開始實作了嗎？

請告訴我你想：

1. **先做 Global Dark Mode** - 讓整個網站支援夜間模式
2. **先做 LINE Notification** - 改善每日數據通知
3. **兩個一起做** - 並行開發

我會根據你的選擇，開始執行對應的 `tasks.md`！🚀

---

**最後更新**：2026-02-03 21:39 (範圍擴大到全站)
