## ADDED Requirements

### Requirement: etf_aum_series 時序資料表

系統 SHALL 建立 `etf_aum_series` 資料表，儲存每支 ETF 的日 AUM 時序資料，欄位為：
`etf_code, data_date, aum_100m, nav, units, inflow_100m`

#### Scenario: Migration 建立
- **WHEN** 執行 `supabase/migrations/<timestamp>_add_etf_aum_series.sql`
- **THEN** 資料表建立，PRIMARY KEY 為 `(etf_code, data_date)`，RLS 設為公開讀取

#### Scenario: 歷史 Backfill
- **WHEN** 執行一次性 backfill 腳本，從 `reference/tw-active/site/preview/scale.json` 匯入
- **THEN** 21 支 ETF 的 2025-05 至今歷史資料寫入 `etf_aum_series`

---

### Requirement: AumSyncStep 每日同步

Pipeline SHALL 包含 `AumSyncStep`，每日計算各 ETF 的 AUM（NAV × units），寫入 `etf_aum_series`，位置在 `MultiEtfStep` 之後。

#### Scenario: 正常同步
- **WHEN** `AumSyncStep.run()` 執行且 FinLab 回傳 NAV 資料
- **THEN** 計算 `aum = nav × units`，`inflow = aum_today - aum_yesterday - price_change_contribution`，寫入當日記錄

#### Scenario: 同步失敗為輔助步驟
- **WHEN** FinLab API 或投信 API 回傳失敗
- **THEN** 記錄 ERROR，不 raise，不中斷 pipeline

---

### Requirement: AUM 規模儀表板前端面板

`/investment/compare` 頁面 SHALL 新增「規模分析」Tab，展示 21 支 ETF 的 AUM 規模與申購占成長比。

核心指標定義：
- **AUM 成長倍數** = `aum_current / aum_first`
- **申購占成長比** = `inflow_cum / (aum_current - aum_first)`；> 0.7 標紅，< 0.3 標綠
- **AUM sparkline** = 最近 60 日 AUM 走勢（Unicode ▁▂▃▄▅▆▇█ 或 SVG 折線）

#### Scenario: 面板載入
- **WHEN** 使用者進入 `/investment/compare` 並切換至「規模分析」Tab
- **THEN** 顯示 21 支 ETF 表格，欄位：代號、名稱、天數、AUM 成長倍數、累計申購、申購占成長比、AUM 走勢

#### Scenario: 展開詳細資料
- **WHEN** 使用者點擊某支 ETF 列
- **THEN** 展開顯示：發行商、最高申購日 / 最高贖回日、NAV 當前值、流通單位數、AUM 折線圖（完整時序）

#### Scenario: 申購占成長比視覺化
- **WHEN** 某支 ETF 的申購占成長比 > 0.7
- **THEN** 該欄位顯示紅色（台股慣例：紅 = 警示），tooltip 說明「規模膨脹主要靠申購，非選股獲利」

#### Scenario: 按申購占成長比排序
- **WHEN** 使用者點擊「申購占成長比」欄標題
- **THEN** 表格依該值降序排列，方便識別「靠申購吹大」的 ETF
