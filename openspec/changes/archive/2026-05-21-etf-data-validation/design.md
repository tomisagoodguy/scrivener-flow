## Context

目前 Pipeline 爬取持股後直接進入 `DiffComputeStep` 計算差異，再由 `SaveSnapshotStep` 寫入 DB。若爬蟲解析失敗（欄位偏移、回傳空 list、HTML 改版），None / 空資料會被 diff 計算，可能產生全持股「OUT」的假訊號，並觸發錯誤的 LINE 通知。

`ctx.etf_data` 是 `MultiEtfStep` 執行後的持股清單（`list[dict]`），每筆包含 `stock_code`, `stock_name`, `weight`, `shares`, `price`。驗證步驟需在此資料進入 diff 引擎前執行。

FinLab 部分：`StrategySignalStep` 呼叫 5 個策略，每個策略各自呼叫 `data.get()`，共計可能消耗數百 MB 配額。`data.get_role()` 和 `data.is_vip()` (v1.5.11) 可查詢目前用戶身份，但**無法直接查詢剩餘配額**——配額超過時 FinLab 會拋出 `DataError`。

## Goals / Non-Goals

**Goals:**

- 爬取結果進入 diff 引擎前，完成三項驗證：比重總和、筆數、價格異常
- 嚴重錯誤（比重 < 50%、筆數歸零）中斷 Pipeline
- 輕微警告（少數個股價格異常）記錄後繼續
- FinLab `DataError` 在 StrategySignalStep 被攔截，步驟 skip 而非崩潰
- LINE 通知附上本次驗證摘要（通過 / N 個警告 / 失敗原因）

**Non-Goals:**

- 不驗證 `etf_diff_logs`、`etf_weight_history` 等衍生資料表
- 不做跨日 diff 比對（「今天比昨天多 30 支持股」的異常偵測）屬未來範圍
- 不修改爬蟲本身的錯誤處理邏輯

## Decisions

### 決策 1：DataValidationStep 插入位置

**選擇**：插入在 `PriceAttachStep`（步驟 2）之後、`DiffComputeStep`（步驟 3）之前。

**理由**：`PriceAttachStep` 已補充 `price` 欄位，驗證時可同時做價格異常偵測。比 `ScrapeStep` 之後更晚插入可確保所有 ETF 資料已就位（`MultiEtfStep` 在步驟 7，其驗證邏輯在 `MultiEtfStep` 內部各別執行）。

**替代方案**：在 `ScrapeStep` 結束時驗證 → 捨棄，因為只能驗證 00981A，無法統一處理所有 ETF。

### 決策 2：驗證規則嚴格程度

三條規則，各有不同嚴格程度：

| 規則 | 觸發條件 | 行為 |
|------|---------|------|
| 比重總和 | 總和 < 50% 或 > 150% | **中斷 Pipeline**（raise）|
| 筆數合理性 | 持股筆數 = 0 | **中斷 Pipeline**（raise）|
| 價格異常 | 個股 price ≤ 0 或 price > 10000 | log warning，記入 ctx，**繼續** |

比重上限 150% 而非 110%：主動 ETF 可合法使用槓桿，放寬上限避免誤報。

### 決策 3：FinLab 配額 Guard 實作方式

由於 FinLab 無法提前查詢剩餘配額，採用 `try/except DataError` 包裹整個 `StrategySignalStep.run()`：
- 捕捉到 `DataError`（含「quota」關鍵字）→ log warning + ctx 記錄 + **不 raise**
- 其他 Exception → 維持現有行為（輔助步驟，不 raise）

### 決策 4：驗證結果傳遞方式

在 `PipelineContext` 新增 `validation_warnings: list[str]`（預設空 list）。`DataValidationStep` 寫入，`NotifyStep` 讀取並附加到 LINE 訊息底部（僅在有警告時顯示，不污染正常通知）。

## Risks / Trade-offs

- **[風險] 比重閾值誤判**：部分 ETF 在公告初期比重未加總至 100%（例如剛成立的 ETF）→ 緩解：先 log 觀察一週，視情況調整閾值或加例外清單
- **[Trade-off] DataValidationStep 是關鍵步驟**：若驗證因為程式 bug 本身崩潰，會中斷 Pipeline。需確保驗證邏輯本身有 try/except 保護，只在明確條件下才 raise
- **[風險] FinLab DataError 不含「quota」關鍵字**：需確認 FinLab v2.0.0 的 `DataError` 訊息格式，若無關鍵字則改為捕捉所有 `DataError` 並 skip

## Migration Plan

1. 本地 `--dry-run` 驗證 DataValidationStep 邏輯（不寫 DB）
2. 合併至 main，觀察次日 CI log 確認閾值設定合理
3. 若有誤報，調整閾值後重新部署

無 DB migration，僅 Python 程式碼變更。
