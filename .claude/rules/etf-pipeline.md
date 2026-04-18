# ETF Pipeline 規則

## 步驟錯誤處理原則

Pipeline 步驟分兩級，錯誤處理策略不同：

### 關鍵步驟（失敗應中斷 pipeline）
| 步驟 | 原因 |
|------|------|
| `ScrapeStep` | 無資料就沒有後續一切 |
| `DiffComputeStep` | 異動計算是核心邏輯 |
| `SaveSnapshotStep` | 持久化失敗等於本次白跑 |

這些步驟可以讓例外自然傳播（`raise`）。

### 輔助步驟（失敗應繼續，不中斷）
| 步驟 | 原因 |
|------|------|
| `SyncBareKStep` | 裸K快照是看盤輔助功能 |
| `NotifyStep` | 通知失敗不影響資料完整性 |
| `MultiEtfStep` 內各 ETF | 單支 ETF 爬取失敗不影響其他 |
| `SyncOHLCVStep` | 股價同步失敗不影響快照 |

**這些步驟的 `except` 區塊禁止 `raise`，只能 log error 後繼續。**

```python
# ❌ 輔助步驟禁止這樣寫
except Exception as e:
    self.logger.error(f"Failed: {e}")
    raise  # ← 這會讓 NotifyStep 跑不到

# ✅ 正確寫法
except Exception as e:
    self.logger.error(f"Failed: {e}")
    # 不 raise，讓後續步驟繼續執行
```

## 真實案例（2026-04-12 至 2026-04-17）

`SyncBareKStep` 引入時 SQL 語法錯誤（`::jsonb` 在 SQLAlchemy 參數化查詢不相容），
加上 `except` 有 `raise`，導致每日 pipeline 在 `NotifyStep` 之前崩潰，
**LINE 通知中斷 5 天，但 00981A diff logs 仍正常**（因 `SaveSnapshotStep` 在它之前）。

## 資料來源限制

Pocket.tw 的「資料日期」反映 ETF 官方公告日，**不保證每天更新**。
- 00981A（ezmoney.com.tw）：每個交易日都有新 Excel → 每天有 diff
- 其他 10 支（Pocket.tw）：公告日才更新 → diff 可能數天才一筆

這是**正常行為**，不是 bug，不需要修改 pipeline 設計。

## SQL 語法規則

在 SQLAlchemy `text()` 查詢中，JSON 欄位轉型必須用 `CAST()`，不能用 `::` 語法：

```python
# ❌ 錯：SQLAlchemy 參數化查詢不支援
":col::jsonb"

# ✅ 正確
"CAST(:col AS jsonb)"
```

## 投資模組架構（前端）

投資儀表板路由：
- `src/app/investment/[etf]/page.tsx` — ETF 持股監控頁（動態路由，支援 00980A / 00981A / 00991A）
- `src/app/investment/stock/[code]/page.tsx` — 個股詳情頁

採 Repository Pattern，`repositories/` 下有 `priceRepo`、`revenueRepo`、`stockRepo`。  
對應 hooks：`hooks/investment/` 下的 `useHoldingsFilter`、`useStockDashboard`、`usePriceData` 等。

**00980A / 00991A 股價補充機制**：這兩支 ETF 的 `etf_holdings_snapshot` 的 `price` 欄位為 null。  
`getHoldings()` 在 Server 端偵測 `price = null` 的持股，從 `stock_prices_daily` 補充最新 `price`、`change_percent`、`amount`、`margin_ratio`。  
資料由 `SyncOHLCVStep` 透過 `ctx.secondary_stock_codes` 合併後 sync。

## 關鍵模組索引

| 路徑 | 說明 |
|------|------|
| `ETF/pipeline/context.py` | `PipelineContext`：步驟間共享狀態（含 `secondary_stock_codes`） |
| `ETF/pipeline/orchestrator.py` | 步驟執行順序 |
| `ETF/processors/diff_engine.py` | `compute_diff()`：計算持股 IN/OUT/BUY/SELL |
| `ETF/services/finlab/facade.py` | FinLab 股價 / OHLCV / 公司資料統一入口 |
| `ETF/database/sql_storage.py` | SQLAlchemy 直接操作 Supabase（繞過 RLS） |
| `ETF/daily_ai_report.py` | Gemini AI 報告產生 + LINE 發送 |
