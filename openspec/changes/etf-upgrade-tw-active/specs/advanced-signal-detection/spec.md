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
| `etf_fund_divergence` | 同一經理人旗下 ETF vs 共同基金持股差異 > 閾值 | 預留，Phase 2 實作 |
| `seasonal_exit` | 季末前 10 個交易日出現大量 SELL 異動 | 預留，Phase 2 實作 |

#### Scenario: 正常偵測寫入
- **WHEN** `SignalDetectStep.run()` 執行
- **THEN** 計算當日 `multi_fund_consensus` 和 `single_fund_overweight` 和 `cross_product_accumulation`，寫入 `etf_signals`，以 `(signal_type, stock_code, data_date)` upsert 去重

#### Scenario: 偵測為輔助步驟
- **WHEN** `SignalDetectStep` 拋出任何例外
- **THEN** 記錄 ERROR log，不 raise，不中斷 pipeline

#### Scenario: Phase 2 訊號預留
- **WHEN** `signal_type` 為 `etf_fund_divergence` 或 `seasonal_exit`
- **THEN** 步驟跳過計算，不寫入資料（待後續實作）

---

### Requirement: 前端選股池訊號顯示

選股池頁面（`/investment`）的股票列表 SHALL 新增訊號欄位，展示當日有效訊號。

#### Scenario: 訊號徽章顯示
- **WHEN** 某支股票當日有 `etf_signals` 記錄
- **THEN** 在股票列右側顯示 `SignalBadge` 元件，標示訊號類型與 strength（1 = 灰、2 = 橙、3 = 紅）

#### Scenario: 多個訊號同時顯示
- **WHEN** 某支股票當日有多個不同 signal_type
- **THEN** 顯示最高 strength 的訊號徽章，hover 時展開所有訊號詳細資訊

#### Scenario: 無訊號時不顯示
- **WHEN** 某支股票當日無 `etf_signals` 記錄
- **THEN** 訊號欄位空白，不顯示任何徽章

#### Scenario: 訊號為參考指標
- **WHEN** 訊號 tooltip 展開
- **THEN** 顯示「此為參考指標，非投資建議」說明文字
