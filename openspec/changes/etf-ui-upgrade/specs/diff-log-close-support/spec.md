## ADDED Requirements

### Requirement: DiffLog 型別支援 CLOSE 與新欄位
`DiffLog` interface SHALL 擴充 `change_type` 以包含 `'CLOSE'`，並新增 `prev_weight?`、`curr_weight?`、`prev_shares?`、`curr_shares?`、`is_significant?` 可選欄位。

#### Scenario: CLOSE 型別不造成 TypeScript 錯誤
- **WHEN** `etf_diff_logs` 回傳 `change_type = 'CLOSE'` 的記錄
- **THEN** TypeScript 編譯不報錯，UI 可正確渲染

#### Scenario: 新欄位為 null 時不影響現有顯示
- **WHEN** `prev_weight` 為 null（舊資料）
- **THEN** DiffLogCard 維持只顯示 `diff_weight`，不顯示 `→` 箭頭

### Requirement: DiffLogCard 顯示 CLOSE 視覺配置
DiffLogCard SHALL 為 `change_type = 'CLOSE'` 提供 amber 色調視覺配置，使用 `MinusCircleIcon`。

#### Scenario: CLOSE 卡片外觀
- **WHEN** log.change_type === 'CLOSE'
- **THEN** 卡片背景為 `bg-amber-50 dark:bg-amber-950/40`，icon 為 MinusCircleIcon，badge 文字為「大幅縮減」

### Requirement: DiffLogCard 顯示 prev → curr weight
當 `prev_weight` 或 `curr_weight` 有值時，DiffLogCard SHALL 在右側數字區補充顯示 `{prev}% → {curr}%`。

#### Scenario: 有 prev/curr weight 時顯示前後對比
- **WHEN** `log.prev_weight !== null || log.curr_weight !== null`
- **THEN** 右側在 diff_weight 下方顯示 `{prev_weight ?? '—'}% → {curr_weight ?? '—'}%`

#### Scenario: 無 prev/curr weight 時維持原有顯示
- **WHEN** `log.prev_weight === null && log.curr_weight === null`
- **THEN** 右側只顯示 `diff_weight`，不顯示 `→` 行

### Requirement: getDiffLogs 查詢包含新欄位
`getDiffLogs()` 的 Supabase 查詢 SHALL 包含 `prev_weight`、`curr_weight`、`prev_shares`、`curr_shares`、`is_significant` 欄位。

#### Scenario: 查詢包含新欄位
- **WHEN** `getDiffLogs()` 執行 Supabase 查詢
- **THEN** select 字串包含所有新欄位，確保資料傳遞至 DiffLogCard
