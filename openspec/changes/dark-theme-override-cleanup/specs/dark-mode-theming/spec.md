## ADDED Requirements

### Requirement: 元件自帶顏色不被深色模式結構覆蓋 hijack
深色模式的全域覆蓋 SHALL NOT 以「與顏色無關的結構性選擇器」（如 `.rounded-*`、`.shadow-*`、`<button>`、`[class*="card"]`、`[class*="panel"]`、`[class*="section"]`、`[class*="container"]`）強制 `background-color`。帶 inline style 或 Tailwind arbitrary value 背景／文字色的元件，在深色模式下 SHALL 保留其自身指定的顏色。

#### Scenario: inline 背景色卡片在深色模式維持原色
- **WHEN** 一個元件以 inline `style={{ backgroundColor }}` 設定主題色，且掛有 `rounded-lg` 或為 `<button>`
- **THEN** 切換到深色模式後，該元件 SHALL 顯示其 inline 指定的背景色，而非被全域 `!important` 壓成統一深灰

#### Scenario: 主題熱力卡片各自顏色（深淺一致）
- **WHEN** 使用者在 `/investment/sectors`「主題」視圖切換深／淺色模式
- **THEN** 每張主題卡片 SHALL 顯示各自的主題色，且文字對比相對於卡片自身顏色正確（深淺兩模式結果一致）

### Requirement: 深色背景以元件層級宣告為主
新元件需要深色背景時 SHALL 使用元件層級的 Tailwind `dark:` variant 或 `.glass-card`（其經由設計 token 自帶深色處理），而非新增全域地毯式 `!important` 覆蓋。

#### Scenario: 新容器宣告深色背景
- **WHEN** 開發者為新卡片容器指定深色背景
- **THEN** 該容器 SHALL 透過 `dark:bg-*` 類別或 `.glass-card` 取得深色背景
- **AND** SHALL NOT 依賴 `html.dark .rounded-lg` 之類結構選擇器來著色

### Requirement: 保留語意色彩柔化
本能力 SHALL 保留既有的語意色彩覆蓋（rose／red／amber 文字與背景柔化、input／select、`.text-foreground`、`.text-primary`、`.movement-none-badge`、`.topic-heat-cell`），這些屬顏色語意微調而非結構性 hijack。

#### Scenario: 台股紅綠語意在深色模式維持
- **WHEN** 深色模式下顯示漲跌數值
- **THEN** rose（漲）／emerald（跌）語意色彩 SHALL 維持既有柔化處理，不受本次清理影響
