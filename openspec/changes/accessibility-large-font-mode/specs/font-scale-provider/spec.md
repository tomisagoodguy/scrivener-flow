## ADDED Requirements

### Requirement: 全域無障礙 Context Provider
系統 SHALL 提供 `AccessibilityProvider`，在 `layout.tsx` 根層級包裹，向下傳遞 `isLargeFont`、`isHighContrast` 狀態與 toggle 函式。

#### Scenario: Provider 掛載
- **WHEN** 應用程式載入
- **THEN** `AccessibilityProvider` 從 localStorage 讀取初始偏好，提供給所有子元件

#### Scenario: 狀態更新
- **WHEN** 任何子元件呼叫 `toggleLargeFont()` 或 `toggleHighContrast()`
- **THEN** 狀態更新、localStorage 寫入、`<html>` class 同步更新，三步驟原子完成

### Requirement: FOUC 防止（伺服器端渲染相容）
系統 SHALL 在 Next.js `<head>` 注入 `beforeInteractive` Script，在頁面 hydration 前讀取 localStorage 並套用 class，防止大字體/高對比模式閃爍。

#### Scenario: 有儲存偏好時載入
- **WHEN** 使用者曾啟用大字體模式，重新載入頁面
- **THEN** 頁面在 React hydration 完成前已套用 `.large-font` class，使用者不會看到正常尺寸閃爍

#### Scenario: 無儲存偏好時載入
- **WHEN** 使用者首次訪問或清除 localStorage
- **THEN** 不注入任何 class，頁面以預設樣式顯示

### Requirement: CSS 變數與 class 覆蓋規則
系統 SHALL 在 `accessibility.css` 中定義 `.large-font` 與 `.high-contrast` 的覆蓋規則，使用 `!important` 確保覆蓋 Tailwind 與 dark-theme.css。

#### Scenario: 大字體 CSS 規則
- **WHEN** `<html>` 有 `.large-font` class
- **THEN** `:root` 的 `font-size` 設為 `120%`，所有使用 `rem` 單位的元素等比縮放

#### Scenario: 高對比 CSS 規則
- **WHEN** `<html>` 有 `.high-contrast` class
- **THEN** 文字顏色覆蓋為 `#000000`（淺色主題）或 `#ffffff`（深色主題），背景對比度符合 WCAG AA
