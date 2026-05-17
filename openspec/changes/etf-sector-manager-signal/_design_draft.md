## Context

族群強弱頁面（`/investment/sectors`）已實作：`getSectorStrength`（族群層級）與 `getSectorStocks`（成分股，點擊展開時 lazy load）。資料庫中 `etf_diff_logs` 記錄每支 ETF 每日的持股增減事件（BUY/IN/SELL/OUT），`sector_strength_stocks` 記錄每支股票對應的族群分類。這兩張表的交叉比對可得出「哪個族群有 ETF 經理人正在買進」。

現有相關 Server Actions：
- `getSectorStrength` → 族群摘要（`sector_strength`）
- `getSectorStocks` → 族群成分股（`sector_strength_stocks`，lazy）
- `getStrategySignals` → 已有類似「查 `etf_diff_logs` 近 7 天 00981A 買進動向」的前例

## Goals / Non-Goals

**Goals:**
- 在族群列頭顯示「哪些 ETF 經理人」在近 14 天有加碼（BUY/IN）該族群成分股
- 在展開的成分股清單中，標記哪些個股有 ETF 經理人買進
- 新增「ETF買」排序模式，按族群內被加碼股票數排序

**Non-Goals:**
- 不修改後端 Pipeline
- 不顯示減碼訊號（SELL/OUT）
- 不支援選擇不同的時間窗口（固定 14 曆日）

## Decisions

### Server Action 設計：getEtfSectorActivity

**決策**：新建獨立 Server Action `src/app/actions/getEtfSectorActivity.ts`，並行查詢 `etf_diff_logs` 和 `sector_strength_stocks`，在記憶體中 JOIN。

**不採用**：在 `getSectorStrength` 中擴充回傳值 ── 職責不單一，且 ETF 動向是獨立維度。

查詢邏輯：
1. 平行查詢：
   - `sector_strength_stocks`（`.eq('date', sectorDate)`）→ stock_id → category 映射
   - `etf_diff_logs`（`.in('change_type', ['BUY', 'IN'])`, `.gte('data_date', cutoff)`, `.lte('data_date', sectorDate)`, `abs(diff_weight) >= 0.05`）→ stock_code → etf_code 清單
2. 記憶體 JOIN：對 diff_logs 每筆，查 stockToCategory 映射，彙整到 `categoryToEtfs`
3. 回傳型別：`EtfSectorActivityMap = Record<string, { etf_codes: string[]; stock_codes: string[] }>`

篩選條件 `abs(diff_weight) >= 0.05` 對齊 `etf-consensus-direction` spec 的閾值定義，排除微幅調整。

**注意**：`etf_diff_logs` 的 `diff_weight` 欄位可能是正數（加碼）或負數（減碼）。查詢加碼時以 `change_type IN ('BUY','IN')` 篩選，再以 `diff_weight >= 0.05`（不取絕對值，BUY/IN 應為正值）確保幅度足夠。如 DB 端無法直接過濾，則在記憶體中 `Math.abs(row.diff_weight) >= 0.05`。

### 族群列 ETF 標籤渲染

**決策**：使用 `ETF_REGISTRY`（`src/lib/investment/etfRegistry.ts`）的 `issuer` 短名（如「統一」「野村」）作為標籤文字。最多顯示前 3 個 issuer，超出顯示「+N」。

標籤樣式：`bg-rose-100/80 text-rose-700 text-xs px-1.5 py-0.5 rounded`（配合台股紅漲慣例）。

### 成分股 ETF 買進標記

**決策**：展開族群時，`getSectorStocks` 回傳的 `SectorStock` 陣列保持不變；ETF 買進資訊從父元件透過 props 傳入（`etfActivity` map）。展開時根據 `stock_id` 查詢 `etfActivity[category].stock_codes` 是否包含該股，若是則顯示 ETF issuer 標籤。

**不採用**：在 `getSectorStocks` Server Action 中合併 ETF 資訊 ── 族群展開是 lazy 的，而 `etfActivity` 在頁面載入時已取得，無需重新 round-trip。

### 「ETF買」排序 Tab

**決策**：在 `SectorDashboard` 的 `SortKey` type 新增 `'etf'`，排序依據為 `etfActivity[category]?.stock_codes.length ?? 0` 降序。此 Tab 只在 list 模式下出現（heatmap/grouped 模式隱藏，與 `hit` Tab 行為一致）。

### page.tsx 資料載入順序

**決策**：`getSectorStrength()` 先執行取得 `date`，再並行執行 `getFactorIC` 和 `getEtfSectorActivity(date)`。

```ts
const sectorData = await getSectorStrength();
const [icData, etfActivity] = await Promise.all([
    getFactorIC(SECTOR_PROXY_FACTORS, 12),
    getEtfSectorActivity(sectorData.date),
]);
```

這增加一個串行步驟（`getSectorStrength` 先執行），但 `getEtfSectorActivity` 需要正確的 `sectorDate` 才能對齊 `sector_strength_stocks`，不能改為完全並行。

## Risks / Trade-offs

- **`etf_diff_logs` 資料量**：14 天 × 15 支 ETF 的 BUY/IN 事件，預計數百到數千筆，記憶體 JOIN 可接受。如未來 ETF 數大幅增加，考慮改為 DB 端 JOIN（RPC）。
- **`diff_weight` 正負值**：CLAUDE.md 說 BUY/IN 時 `diff_weight` 為正值，但需確認 DB 實際資料符合預期。若有異常負值，用 `Math.abs` 防禦。
- **`sector_strength_stocks` 分頁**：全量查詢可能超過 1000 筆，需分頁（`range`）或提高限制。目前 `getAllSectorStocks` 已有分頁範例可參考。
