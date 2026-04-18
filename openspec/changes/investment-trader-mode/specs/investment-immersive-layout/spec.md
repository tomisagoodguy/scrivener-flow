## ADDED Requirements

### Requirement: SideNav hidden on investment routes
當 pathname 以 `/investment` 開頭時，`SideNav` SHALL 不渲染（return null），不佔用任何空間。

#### Scenario: 進入投資監控頁
- **WHEN** 用戶導覽至 `/investment` 或任何子路由
- **THEN** 左側 SideNav 完全消失，不顯示任何代書系統選項

#### Scenario: 離開投資監控頁
- **WHEN** 用戶從 `/investment` 導覽至 `/cases` 等代書路由
- **THEN** SideNav 恢復正常顯示

### Requirement: Main content full-width on investment routes
`MainWrapper` client component SHALL 在 `/investment/*` 路由移除 `lg:pl-[108px]`，讓內容區域全寬展開。

#### Scenario: Investment 頁面全寬
- **WHEN** 用戶在 `/investment` 頁面
- **THEN** 主內容區域不留左側 padding，水平空間完整利用

### Requirement: Header hidden on investment routes
`HeaderWrapper` client component SHALL 在 `/investment/*` 路由不渲染 Header。

#### Scenario: Investment 沉浸模式
- **WHEN** 用戶在任何 `/investment/*` 路由
- **THEN** 頁面頂部無 Header，內容直接從頂部開始

### Requirement: Trader terminal dark theme
`src/app/investment/layout.tsx` SHALL 為所有 investment 子頁提供深色操盤終端機視覺風格。

#### Scenario: Investment 頁面視覺風格
- **WHEN** 用戶訪問任何 `/investment/*` 頁面
- **THEN** 頁面背景為深黑色（`#070b14`），accent 色為霓虹綠（`#00ff88`）/ 霓虹藍（`#00d4ff`），數字使用 monospace 字體
