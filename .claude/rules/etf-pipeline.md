# ETF Pipeline 規則

## 管理員監控

### Pipeline 失敗警報
`PipelineOrchestrator.run()` 捕捉到任何步驟拋出的例外時，會在 re-raise 前透過 LINE 發送錯誤警報：

```
🚨 ETF Pipeline 異常
📅 YYYY-MM-DD
❌ 失敗步驟：<step_name>
💬 錯誤：<error message>

請至 GitHub Actions 查看完整 log。
```

**收到此訊息的處置流程：**
1. GitHub → Actions → Daily ETF Tracker → 找對應日期的失敗 run，看完整 log
2. 常見原因與解法：

| 失敗步驟 | 常見原因 | 解法 |
|---------|---------|------|
| `Scrape Holdings` | 爬蟲被 bot 保護阻擋（HTTP 302 loop） | 修 `unified_scraper.py` 的 session/cookie 處理，或用 Playwright fallback |
| `Scrape Holdings` | 資料來源網站改版（URL / Excel 格式變更） | 更新 `fhtrust_scraper.py` 或 `xlsx_parser.py` |
| `Save Snapshot` | Supabase 連線逾時 / schema 不符 | 確認 `SUPABASE_DB_URL` 有效，或查看 migration 是否有缺 |
| `Multi-ETF Scrape` | Pocket.tw / MoneyDJ 改版 | 更新對應 scraper（輔助步驟不應讓 pipeline 中斷） |

### 資料新鮮度確認
若懷疑資料停更（前端顯示的日期超過 3 個交易日以前）：
1. 先查 LINE 是否有收到今日的 ETF carousel 通知 → 有通知代表 pipeline 成功但資料來源本身沒更新（正常現象，尤其 Pocket.tw ETF）
2. 沒收到通知 → 代表 pipeline 失敗 → 查 GitHub Actions log
3. 最快驗證方式：`uv run python -c "from ETF.scrapers.unified_scraper import download_file_requests; import pathlib; print(download_file_requests('https://www.ezmoney.com.tw/ETF/Fund/AssetExcelNPOI?fundCode=49YTW', pathlib.Path('test.xlsx')))"`

---

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

## 自選股名稱查詢優先序

`watch_list.name` 空白時，依下列順序補填中文名稱（優先序由低到高）：

| 優先 | 資料來源 | 欄位 |
|------|---------|------|
| 3（最低）| `bare_k_snapshots` | `summary->>'name'`（JSON 欄位） |
| 2 | `etf_holdings_snapshot` | `stock_name` |
| 1（最高）| `stock_basic_info` | `name_short` |

**陷阱**：裸K看盤（`bare-k`）頁面顯示名稱是因為有 `summary?.name` fallback，而觀察清單（`watch-list`）只顯示 DB 儲存的 `name`。  
新增或 backfill 時，**必須同時查三張表**，否則名稱為空。

```ts
// watch-list/page.tsx backfill 範例
const [{ data: basicData }, { data: etfData }, { data: bareKData }] = await Promise.all([
    supabase.from('stock_basic_info').select('stock_code, name_short').in('stock_code', codes),
    supabase.from('etf_holdings_snapshot').select('stock_code, stock_name').in('stock_code', codes),
    supabase.from('bare_k_snapshots').select('stock_id, summary').in('stock_id', codes).order('date', { ascending: false }),
]);
```

**`etf_holdings_snapshot` 日期欄位**：日期欄位名稱是 `data_date`，**不是** `snapshot_date`。  
SQL 排序取最新一筆寫法：`ORDER BY stock_code, data_date DESC`。

**`equity_distribution_stats` 名稱 backfill**：若 `stock_name` 有空值，執行：  
```bash
uv run python ETF/sync_equity_distribution.py --backfill-names
```
此指令只補名稱（查 `etf_holdings_snapshot` + `stock_basic_info`），不重算統計數字，冪等安全。

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
