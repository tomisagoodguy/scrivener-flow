## ADDED Requirements

### Requirement: etf_signals 資料表

系統 SHALL 建立 `etf_signals` 資料表，儲存 5 種策略訊號的偵測結果：
`id, signal_type, stock_code, stock_name, etf_codes (JSONB), data_date, strength (int 1-3), metadata (JSONB), created_at`

#### Scenario: Migration 建立
- **WHEN** 執行 `supabase/migrations/<timestamp>_add_etf_signals.sql`
- **THEN** 資料表建立，INDEX 在 `(signal_type, data_date)`，RLS 設為公開讀取

---

### Requirement: SignalDetectStep 批次偵測

Pipeline SHALL 包含 `SignalDetectStep`，於 `OverlapComputeStep` 之後執行，批次計算 5 種訊號並寫入 `etf_signals`。

5 種訊號定義：

| signal_type | 偵測邏輯 | strength 條件 |
|-------------|---------|--------------|
| `multi_fund_consensus` | 同時被 ≥ N 支 ETF 持有 | N=2→1, N=4→2, N=6→3 |
| `single_fund_overweight` | 單一 ETF 中持股比重 ≥ 5% | ≥5%→1, ≥8%→2, ≥10%→3 |
| `cross_product_accumulation` | 近 5 日在多支 ETF 同時出現 BUY 異動 | 2 ETF→1, 3 ETF→2, 4+ ETF→3 |
| `etf_fund_divergence` | 同一經理人旗下 ETF vs 共同基金持股差異 | 預留 Phase 2 |
| `seasonal_exit` | 季末前 10 個交易日出現大量 SELL 異動 | 預留 Phase 2 |

#### Scenario: 正常偵測寫入
- **WHEN** `SignalDetectStep.run()` 執行
- **THEN** 計算當日 3 種 Phase 1 訊號，以 `(signal_type, stock_code, data_date)` upsert 去重寫入 `etf_signals`

#### Scenario: 偵測為輔助步驟
- **WHEN** `SignalDetectStep` 拋出任何例外
- **THEN** 記錄 ERROR log，不 raise，不中斷 pipeline

#### Scenario: Phase 2 訊號預留
- **WHEN** `signal_type` 為 `etf_fund_divergence` 或 `seasonal_exit`
- **THEN** 步驟跳過計算，不寫入資料

---

### Requirement: Stock Detail Panel 內的訊號展示

訊號 SHALL 在 `StockDetailPanel` 的「訊號」區塊內完整展示，不只是列表的小 badge。

#### Scenario: 有訊號時展開顯示
- **WHEN** 使用者開啟某支有 `etf_signals` 記錄的股票面板
- **THEN** 「訊號」區塊顯示所有當日訊號，每筆含：訊號類型名稱、strength 視覺化（1=灰/2=橙/3=紅色標示）、觸發條件說明（e.g. 「被 4 支 ETF 持有，共識強度高」）

#### Scenario: 無訊號時區塊靜默
- **WHEN** 個股當日無任何 `etf_signals` 記錄
- **THEN** 訊號區塊顯示「今日無特殊訊號」，不顯示空框架

#### Scenario: 訊號免責聲明
- **WHEN** 訊號區塊渲染
- **THEN** 區塊底部固定顯示「此為參考指標，非投資建議」

#### Scenario: 選股池列表的快速 badge
- **WHEN** 渲染 `/investment` 選股池股票列表
- **THEN** 有訊號的股票在列右側顯示最高 strength 的小 badge（顏色同上），點擊開啟 StockDetailPanel 後才看到完整訊號內容
