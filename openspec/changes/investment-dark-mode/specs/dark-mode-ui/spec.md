# Spec: Dark Mode UI System

## ADDED Requirements

### REQ-DM-001: Theme Context & State Management

**Priority**: High
**Component**: src/contexts/ThemeContext.tsx

系統必須提供全局的主題狀態管理，支援深色與淺色模式切換。

#### Scenario: 初次載入時讀取使用者偏好

**Given** 使用者首次訪問投資頁面  **And** localStorage 中有儲存的主題偏好
**When** ThemeProvider 初始化
**Then** 系統讀取 localStorage 中的 'theme' key
**And** 根據儲存值設定 `<html class="dark">` 或移除 class
**And** Context state 更新為對應的主題

#### Scenario: 無儲存偏好時的預設行為

**Given** 使用者首次訪問且 localStorage 無主題設定
**When** ThemeProvider 初始化
**Then** 系統預設使用 'light' 模式
**And** 不在 `<html>` 加入 `dark` class

#### Scenario: 切換主題並持久化

**Given** 使用者正在使用淺色模式
**When** 使用者點擊主題切換器
**Then** `toggleTheme()` 被觸發
**And** Context state 更新為 'dark'
**And** `<html>` 加入 `class="dark"`
**And** localStorage 中 'theme' key 更新為 'dark'
**And** 下次訪問自動套用深色模式

---

### REQ-DM-002: Theme Toggler Component

**Priority**: High
**Component**: src/components/ui/ThemeToggler.tsx

系統必須提供直覺的主題切換按鈕，讓使用者能輕鬆切換模式。

#### Scenario: 顯示當前模式狀態

**Given** 主題切換器已渲染
**When** 當前模式為淺色
**Then** 顯示 `Sun` icon (表示可切換至深色)

**When** 當前模式為深色
**Then** 顯示 `Moon` icon (表示可切換至淺色)

#### Scenario: 點擊切換主題

**Given** 使用者看到主題切換器
**When** 使用者點擊按鈕
**Then** 主題立即切換（無需重新載入頁面）
**And** Icon 平滑過渡至對應圖示 (200ms transition)
**And** 按鈕有明顯的 hover 與 active 狀態回饋

#### Scenario: Keyboard 操作支援

**Given** 使用者使用鍵盤導航
**When** 使用者 Tab 至切換器並按下 Enter 或 Space
**Then** 主題切換功能觸發
**And** Focus ring 清晰可見

#### Scenario: 視覺設計規範

**Given** 設計主題切換器
**When** 實作 UI
**Then** 遵循以下規範：

- 尺寸：`p-2` (8px padding)
- Icon 大小：`w-5 h-5` (20px)
- Border radius: `rounded-full`
- Transition: `transition-all duration-200`
- Hover state: `hover:bg-slate-100 dark:hover:bg-slate-800`
- Cursor: `cursor-pointer`

---

### REQ-DM-003: Tailwind Dark Mode Configuration

**Priority**: High
**Component**: tailwind.config.ts

Tailwind CSS 配置必須支援 dark mode 並定義 Fintech 風格的配色系統。

#### Scenario: 啟用 class-based dark mode

**Given** 配置 Tailwind
**When** 設定 `darkMode` 選項
**Then** 使用 `darkMode: 'class'` 策略
**And** 允許透過 `<html class="dark">` 控制全局主題

#### Scenario: 定義 Fintech Dark Mode 配色

**Given** 需要專業的深色配色系統
**When** 擴展 `theme.extend.colors`
**Then** 定義以下顏色變數：

```typescript
{
  'dark-primary': '#F59E0B',        // Amber 500
  'dark-secondary': '#FBBF24',      // Amber 400
  'dark-cta': '#8B5CF6',            // Violet 500
  'dark-bg': '#0F172A',             // Slate 950
  'dark-bg-secondary': '#1E293B',   // Slate 900
  'dark-text': '#F8FAFC',           // Slate 50
  'dark-text-muted': '#94A3B8',     // Slate 400
  'dark-border': '#334155',         // Slate 700
}
```

**And** 確保所有顏色可透過 `bg-dark-primary`, `text-dark-text` 等 utility class 使用

---

### REQ-DM-004: Investment Page Dark Mode Support

**Priority**: High
**Component**: src/app/investment/page.tsx

投資頁面主佈局必須完整支援深色模式。

#### Scenario: 主容器背景適配

**Given** 投資頁面已渲染
**When** 使用者切換至深色模式
**Then** 主容器背景從 `bg-white` 切換至 `bg-dark-bg`
**And** 過渡平滑無閃爍

#### Scenario: 文字顏色適配

**Given** 頁面包含標題、描述與各種文字內容
**When** 切換至深色模式
**Then** 所有文字顏色正確更新：

- H1 標題: `text-slate-900 dark:text-dark-text`
- 描述文字: `text-slate-500 dark:text-dark-text-muted`
- 內文: `text-slate-700 dark:text-slate-300`

**And** 所有文字對比度符合 WCAG AAA 標準 (≥ 7:1)

#### Scenario: 資料徽章適配

**Given** 頁面顯示「資料日期」徽章
**When** 切換至深色模式
**Then** 徽章背景：`bg-slate-100 dark:bg-dark-bg-secondary`
**And** 徽章邊框：`border-slate-200 dark:border-dark-border`
**And** 徽章內動畫指示器 (綠點) 保持清晰可見

---

### REQ-DM-005: HoldingsTable Dark Mode Support

**PrioritHoldingsTable.tsx

持股表格必須在深色模式下保持清晰可讀。

#### Scenario: 表格背景與邊框適配

**Given** HoldingsTable 元件已渲染
**When** 切換至深色模式
**Then** 表格樣式更新：

- Table header: `bg-slate-100 dark:bg-dark-bg-secondary`
- Table border: `border-slate-200 dark:border-dark-border`
- Row hover: `hover:bg-slate-50 dark:hover:bg-slate-800`

#### Scenario: Badge 顏色適配

**Given** 表格中有多種 Badge（營收增長、權重等）
**When** 切換至深色模式
**Then** Badge 配色調整為深色友善版本：

- 正值 Badge: `bg-green-100 text-green-800` → `bg-green-900/20 text-green-300`
- 負值 Badge: `bg-red-100 text-red-800` → `bg-red-900/20 text-red-400`
- 中性 Badge: `bg-gray-100 text-gray-800` → `bg-gray-800/20 text-gray-300`

**And** 所有 Badge 文字對比度符合 WCAG AAA

#### Scenario: Progress Bar 在深色模式下可見

**Given** 表格包含 Progress Bar 元件
**When** 切換至深色模式
**Then** Progress Bar：

- 背景：`bg-slate-200 dark:bg-slate-700`
- 填充：保持原語義顏色（綠/紅），但調整飽和度

---

### REQ-DM-006: DiffLedger Dark Mode Support

**Priority**: High
**Component**: src/components/features/investment/DiffLedger.tsx

異動紀錄元件必須支援深色模式，包含 Manager Behavior Tags。

#### Scenario: 卡片背景與邊框適配

**Given** DiffLedger 元件已渲染
**When** 切換至深色模式
**Then** 卡片樣式更新：

- Card background: `bg-white dark:bg-dark-bg-secondary`
- Card border: `border-slate-200 dark:border-dark-border`
- Card shadow: 調整為適合深色背景的 glow 效果

#### Scenario: Manager Behavior Tag 配色適配

**Given** 異動紀錄包含 Manager Behavior Tags
**When** 切換至深色模式
**Then** Tag 配色更新：

- 首次買入 (藍色): `bg-blue-100 text-blue-800` → `bg-blue-900/20 text-blue-300`
- 完全清倉 (灰色): `bg-gray-100 text-gray-800` → `bg-gray-800/20 text-gray-300`
- 激進買入 (紅色): `bg-red-100 text-red-800` → `bg-red-900/20 text-red-300`
- 激進賣出 (綠色): `bg-green-100 text-green-800` → `bg-green-900/20 text-green-300`

**And** Icon 顏色與 Tag 文字保持一致

---

### REQ-DM-007: Chart Components Dark Mode Support

**Priority**: High
**Component**: All Chart Components

所有圖表元件必須在深色模式下正確顯示，包含清晰的座標軸、網格線與資料標籤。

#### Scenario: 圖表背景適配

**Given** 圖表元件 (RankingTrendChart, ChangeImpactChart 等) 已渲染
**When** 切換至深色模式
**Then** 圖表背景：透明或 `bg-dark-bg-secondary`
**And** 與頁面背景和諧融合

#### Scenario: 圖表文字與網格線適配

**Given** 圖表包含座標軸、標籤與網格線
**When** 切換至深色模式
**Then** 樣式更新：

- 座標軸文字：`text-slate-600` → `text-dark-text-muted`
- 網格線：`stroke-slate-200` → `stroke-dark-border`
- 資料標籤：保持高對比度

#### Scenario: 圖表配色語義保留

**Given** 圖表使用顏色表示正負值
**When** 切換至深色模式
**Then** 顏色語義保留：

- 正值/增長：使用 `#10B981` (Emerald 500)
- 負值/下降：使用 `#EF4444` (Red 500)
- 中性：使用 `#94A3B8` (Slate 400)

**And** 所有顏色在深色背景下清晰可辨

---

### REQ-DM-008: Accessibility & Performance

**Priority**: High
**Component**: All Components

深色模式實作必須符合無障礙標準並確保效能。

#### Scenario: 對比度符合 WCAG AAA

**Given** 所有文字與互動元件
**When** 在深色模式下顯示
**Then** 對比度測試結果：

- 標題文字 (H1-H3): ≥ 7:1
- 內文文字: ≥ 7:1
- 次要文字: ≥ 4.5:1
- Icon 與 UI 元素: ≥ 3:1

#### Scenario: Keyboard 操作支援

**Given** 使用者使用鍵盤導航
**When** Tab 至任何互動元件
**Then** Focus ring 清晰可見 (深色模式下使用高對比度顏色)

#### Scenario: 切換效能要求

**Given** 使用者切換主題
**When** 執行切換動作
**Then** 切換延遲 ≤ 200ms
**And** 動畫幀率 ≥ 60 FPS
**And** 無 Layout Thrashing 或重排問題

---

## MODIFIED Requirements

無（本次為新增功能）

---

## REMOVED Requirements

無
