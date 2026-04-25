## ADDED Requirements

### Requirement: 盤前指引常駐摘要卡
投資首頁 (`/investment`) 的 `InvestmentTabs` 區塊上方 SHALL 顯示 `PreMarketGuide` 元件，
展示當日最新一筆 `etf_flow_daily` 的盤前摘要。元件為 Server Component，頁面載入即有資料。

#### Scenario: 有資料時顯示摘要卡
- **WHEN** `etf_flow_daily` 有最新一筆記錄
- **THEN** 頁面在 Tabs 上方顯示：日期、N/21 家已揭露、共識買進列表、集中加碼列表、共識賣列表、淨流入總結

#### Scenario: 無資料時顯示佔位
- **WHEN** `etf_flow_daily` 無任何記錄
- **THEN** 元件不顯示（返回 null），不影響下方 Tabs 正常渲染

### Requirement: 共識買進（Consensus Buy）
系統 SHALL 從 `inflow` 中篩選 `etf_count >= 3` 的股票，依 `total_nt` 降序顯示。
顯示：代號、名稱、金額（億）、ETF 列表（來自 `by_etf[]` 的 etf_code）。

#### Scenario: 有共識買進
- **WHEN** inflow 中存在 etf_count >= 3 的股票
- **THEN** 顯示「N 家以上共識買進」區塊，含各股票的名稱、金額、ETF 代號標籤

#### Scenario: 無共識買進
- **WHEN** inflow 中無 etf_count >= 3 的股票
- **THEN** 不顯示共識買進區塊（整個 section 隱藏）

### Requirement: 集中加碼（Concentrated Add）
系統 SHALL 從 `inflow` 中篩選 `etf_count < 3 且 total_nt >= 300_000_000`（3 億）的股票，
依 `total_nt` 降序顯示，最多 6 檔。

#### Scenario: 有集中加碼
- **WHEN** inflow 中有 etf_count < 3 且 total_nt >= 3億 的股票
- **THEN** 顯示「集中加碼」區塊，最多 6 檔，含名稱、金額、買入 ETF 標籤

#### Scenario: 無集中加碼
- **WHEN** 無符合條件的股票
- **THEN** 不顯示集中加碼區塊

### Requirement: 共識賣出（Consensus Sell）
系統 SHALL 從 `outflow` 中篩選 `etf_count >= 3` 的股票，依 `total_nt` 升序（最大負值在前）。

#### Scenario: 有共識賣
- **WHEN** outflow 中有 etf_count >= 3 的股票
- **THEN** 顯示「共識賣」區塊

#### Scenario: 無共識賣
- **WHEN** outflow 中無 etf_count >= 3 的股票
- **THEN** 顯示「共識賣：無」提示文字

### Requirement: Basket Buy 警示
系統 SHALL 偵測是否有單一 ETF 占總流入 > 50%，若是則顯示警示，
說明「X% 來自 YYYYY 被動申購」。

#### Scenario: 觸發 basket buy 警示
- **WHEN** `by_etf` 中最大 ETF 的 net_flow / totals.total_in_nt > 0.5
- **THEN** 在淨流入總結文字後顯示「⚠ XX% 來自 ETFCODE basket buy」橘色標籤

#### Scenario: 未觸發
- **WHEN** 無單一 ETF 占比 > 50%
- **THEN** 正常顯示淨流入總結，無警示標籤

### Requirement: 淨流入總結
系統 SHALL 在摘要卡底部顯示一行總結：「主動 ETF 淨流入 +X億（N/21 家已揭露）」或
「主動 ETF 淨流出 X億」（依正負決定文字和色彩）。

#### Scenario: 淨流入正值
- **WHEN** totals.net_nt >= 0
- **THEN** 顯示「+X億」，使用 rose-600（台股紅漲慣例）

#### Scenario: 淨流出
- **WHEN** totals.net_nt < 0
- **THEN** 顯示「-X億」，使用 emerald-600（台股綠跌慣例）

### Requirement: 色彩慣例
所有漲跌色彩 MUST 遵守台股慣例：紅色（`text-rose-600`）= 買入 / 上漲，
綠色（`text-emerald-600`）= 賣出 / 下跌。MUST NOT 使用歐美慣例（綠漲紅跌）。

#### Scenario: 買入金額顯示
- **WHEN** 顯示流入金額
- **THEN** 使用 `text-rose-600 dark:text-rose-400`

#### Scenario: 賣出金額顯示
- **WHEN** 顯示流出金額
- **THEN** 使用 `text-emerald-600 dark:text-emerald-400`
