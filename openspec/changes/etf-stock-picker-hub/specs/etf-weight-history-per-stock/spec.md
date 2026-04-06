## ADDED Requirements

### Requirement: 跨 ETF 持倉歷史 API
系統 SHALL 提供 `GET /api/investment/etf-weight-history?code=[stock_code]`，回傳該股票在三支 ETF 中的歷史持股權重序列。

回傳格式：
```json
{
  "00981A": [{ "date": "2025-01-01", "weight": 3.2, "rank": 5 }],
  "00980A": [{ "date": "2025-01-01", "weight": 1.8, "rank": 12 }],
  "00991A": []
}
```
未持有的 ETF 回傳空陣列（不拋錯）。資料來源優先 `etf_weight_history`，fallback `etf_holdings_snapshot`。

#### Scenario: 查詢三 ETF 都有持有的股票
- **WHEN** 請求 `GET /api/investment/etf-weight-history?code=2330`
- **THEN** 回傳三個 ETF 各自的日期-權重序列（長度 > 0）

#### Scenario: 查詢只有部分 ETF 持有的股票
- **WHEN** 請求某股票，其中一支 ETF 從未持有
- **THEN** 未持有的 ETF 鍵值為空陣列，HTTP 狀態 200

#### Scenario: 缺少 code 參數
- **WHEN** 請求 `GET /api/investment/etf-weight-history`（無 code）
- **THEN** 回傳 HTTP 400

### Requirement: 個股頁跨 ETF 持倉折線圖
個股詳情頁 SHALL 在現有圖表區塊之後新增「ETF 持倉歷史」模組，顯示三 ETF 對該股持股權重的時序折線圖（三條線，顏色對應 ETF 色系：00981A 紫、00980A 藍、00991A 橘）。未持有期間的 ETF 線條不顯示（斷點）。

#### Scenario: 個股被三 ETF 持有
- **WHEN** 使用者進入某個股詳情頁，且三 ETF 皆持有該股
- **THEN** 圖表顯示三條折線，各有 ETF 代號圖例

#### Scenario: 個股只被部分 ETF 持有
- **WHEN** 使用者進入某個股詳情頁，只有兩 ETF 持有
- **THEN** 圖表顯示兩條折線，未持有的 ETF 不顯示（不顯示零值線）

#### Scenario: 個股完全不在任何 ETF
- **WHEN** 使用者進入某個股詳情頁，三 ETF 都未持有
- **THEN** 隱藏整個「ETF 持倉歷史」模組（不顯示空圖表）

### Requirement: 持倉折線圖 Y 軸顯示排名
持倉折線圖 SHALL 同時提供「權重 %」和「持股排名」兩種 Y 軸切換，預設顯示「持股排名」（數字越小排越高，Y 軸反轉）。

#### Scenario: 切換至權重視角
- **WHEN** 使用者點擊「切換至權重%」按鈕
- **THEN** Y 軸改為顯示持股權重百分比，數值越大位置越高
