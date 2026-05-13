## ADDED Requirements

### Requirement: 週數時間窗口選擇
籌碼排行榜 SHALL 支援 1/2/3/4 週時間窗口切換，透過 URL param `weeks=1|2|3|4` 控制，預設 1。

#### Scenario: 預設顯示 1 週變化
- **WHEN** 用戶訪問 `/investment/equity`（無 `weeks` param）
- **THEN** 顯示最新快照 vs 上一期的大戶持股變化（等同現有行為）

#### Scenario: 切換至 2 週
- **WHEN** 用戶點擊「2週」tab（URL 變為 `?weeks=2`）
- **THEN** 顯示最新快照 vs 2 期前快照的大戶持股變化，排行榜依此重新排序

#### Scenario: 顯示日期區間標記
- **WHEN** 任何 weeks 設定下
- **THEN** UI 顯示「起始日期 → 結束日期」（e.g. `04/24 → 05/08`）

#### Scenario: 資料期數不足時的 fallback
- **WHEN** DB 中快照期數少於 `weeks`（e.g. 只有 2 期但 `weeks=4`）
- **THEN** 顯示「資料不足」提示，不崩潰

### Requirement: weeks 與 tier 可同時組合
weeks 參數 SHALL 與現有 tier 參數（200/400/1000）獨立運作，可同時使用。

#### Scenario: 組合 tier=400 + weeks=2
- **WHEN** URL 為 `?tier=400&weeks=2`
- **THEN** 僅顯示 400 張以上大戶的 2 週持股變化排行

### Requirement: WeekNav UI 元件
頁面 SHALL 顯示 1/2/3/4 週切換 tabs，樣式與 TierNav 一致。

#### Scenario: 當前週數高亮
- **WHEN** 當前 `weeks=2`
- **THEN** 「2週」tab 呈現選中狀態，其餘未選中
