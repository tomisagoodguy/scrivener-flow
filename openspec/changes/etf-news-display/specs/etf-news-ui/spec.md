## ADDED Requirements

### Requirement: ETF 持股頁顯示近期重大公告面板
`/investment/[etf]` 頁面 SHALL 顯示 `EtfNewsPanel` 元件，列出該 ETF 前十大持股在 `etf_news` 中最近 5 天的重大公告。

#### Scenario: 有公告資料
- **WHEN** 用戶開啟 `/investment/00981A`
- **THEN** 頁面顯示新聞面板，按日期分組列出各持股公告標題與時間

#### Scenario: 無公告資料
- **WHEN** `etf_news` 中無符合條件的記錄（新 ETF 或假日後）
- **THEN** 面板顯示「近 5 日無重大公告」提示，不顯示錯誤

#### Scenario: 多筆同日公告
- **WHEN** 同一日有多支持股各自發佈公告
- **THEN** 同日公告依股票代碼排序，標題完整顯示（不截斷）

### Requirement: 新聞面板使用玻璃卡片風格
`EtfNewsPanel` SHALL 使用 `.glass-card` 容器樣式，與頁面其他區塊視覺一致。

#### Scenario: 深色模式
- **WHEN** 用戶切換為深色主題
- **THEN** 新聞面板背景與文字顏色遵循 `dark-theme.css` 規則，不出現白底或高對比色塊
