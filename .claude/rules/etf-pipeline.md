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
| 步驟檔案 | 說明 |
|---------|------|
| `scrape_step.py` | 無資料就沒有後續一切 |
| `diff_compute_step.py` | 異動計算是核心邏輯 |
| `save_snapshot_step.py` | 持久化失敗等於本次白跑 |

這些步驟可以讓例外自然傳播（`raise`）。

### 輔助步驟（失敗應繼續，不中斷）

**ETF 主流程輔助**
| 步驟檔案 | 說明 |
|---------|------|
| `multi_etf_step.py` | 多支 ETF 爬取，單支失敗不影響其他 |
| `price_attach_step.py` | 附加當日股價（`stock_prices_daily`） |
| `weight_history_step.py` | 持股比重歷史同步（`etf_weight_history`） |
| `flow_compute_step.py` | 資金流向計算 |
| `buying_pattern_step.py` | 7 種買進模式分類 + 前瞻報酬補齊 → `etf_buying_patterns` |
| `frontrunning_step.py` | 持股公告前後成交量異常偵測 → `etf_frontrunning_events` |
| `overlap_compute_step.py` | ETF 持股重疊矩陣計算 |

**市場廣度 & 族群**
| 步驟檔案 | 說明 |
|---------|------|
| `sync_adl_step.py` | 全市場 ADL/ADR/MA → `market_breadth_daily`（輔助步驟） |
| `sync_treemap_step.py` | 族群 Treemap 資料同步 |
| `sector_strength_step.py` | 族群強弱品質指標計算 |
| `signal_detect_step.py` | 族群策略命中信號偵測 |

**量化策略**
| 步驟檔案 | 說明 |
|---------|------|
| `strategy_signal_step.py` | 5 種 FinLab 量化策略選股信號 → `strategy_signals` |
| `shareholder_signal_step.py` | 股東結構變化信號（大戶增減）|

**股東結構 & 公司基本面**
| 步驟檔案 | 說明 |
|---------|------|
| `position_summary_step.py` | ETF 部位成本摘要計算 |
| `matched_pairs_step.py` | 持股配對比較 |
| `active_share_step.py` | 主動型 ETF Active Share 計算 |
| `aum_sync_step.py` | ETF AUM（規模）同步 |
| `sync_ohlcv_step.py` | 個股 OHLCV 股價同步 |
| `sync_company_step.py` | 公司基本資料同步 |
| `cumulative_drag_step.py` | 累積費用拖累計算（`cumulative_drag`） |

**通知 & 維護**
| 步驟檔案 | 說明 |
|---------|------|
| `notify_step.py` | LINE Carousel 推播（`etf_notification_log` 防重複）|
| `news_context_step.py` | 新聞情境資料擷取 |
| `cleanup_step.py` | 清理過期舊資料（多資料表）|

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

## etf_diff_logs 欄位單位

| 欄位 | 單位 | 前端轉換 |
|------|------|---------|
| `diff_shares` | 原始股數（股） | ÷ 1000 → 張 |
| `diff_weight` | 百分比差值（pp） | 直接顯示，加 `pp` 後綴 |
| `is_significant` | boolean | `true` = 異動幅度顯著 |
| `amount_亿`（前端計算）| N/A（DB 無此欄） | `abs(diff_shares) * price / 1e8` |

**陷阱**：`diff_shares` 是 `diff_engine.py` 計算的原始股數（`c["shares"] - p["shares"]`），**不是 張**。  
顯示為 張 必須除以 1000；億元市值用 `abs(diff_shares) * 當日收盤價 / 1e8`（不要再乘 1000）。  
當日收盤價從 holdings 的 `price` 欄位取得（Server 端已補齊，見 `getHoldings()`）。

**所有爬蟲輸出單位均為股（株）**：`official_api_scraper`（千株×1000→株）、`pocket_scraper`（Pocket.tw 的「持有數」欄位直接是株）均已驗證。  
`pocket_scraper.py` docstring 舊版誤寫「單位：張」，已於 2026-05-09 修正。勿再懷疑單位不一致。

## 關鍵模組索引

| 路徑 | 說明 |
|------|------|
| `ETF/pipeline/context.py` | `PipelineContext`：步驟間共享狀態（含 `secondary_stock_codes`） |
| `ETF/pipeline/orchestrator.py` | 步驟執行順序 |
| `ETF/processors/diff_engine.py` | `compute_diff()`：計算持股 IN/OUT/BUY/SELL |
| `ETF/services/finlab/facade.py` | FinLab 股價 / OHLCV / 公司資料統一入口 |
| `ETF/database/sql_storage.py` | SQLAlchemy 直接操作 Supabase（繞過 RLS） |
| `ETF/daily_ai_report.py` | Gemini AI 報告產生 + LINE 發送 |
| `ETF/pipeline/steps/buying_pattern_step.py` | 7 種買進模式分類 + 前 30 天前瞻報酬增量補齊 → `etf_buying_patterns` |

## 買進模式（BuyingPatternStep）陷阱

| 模式 | 判定規則摘要 |
|------|------------|
| `volume_spike` | `abs(diff_shares)` > mean + **5.5×std**（過去 20 交易日，同 stock-ETF 對） |
| `chase_high` | `close >= high * 0.99` 且漲幅 ≥ 3%（需 `stock_prices_daily` 當日有資料） |
| `dip_buy` | `close <= low * 1.01` 且跌幅 ≤ -2% |
| `window_break` | 前 **60 曆日**無 BUY/IN（不是交易日）|
| `sustained_buy` | 過去 20 個交易日**全部**有 BUY/IN（20/20，非 ≥ 1）|
| `single_lot` | `800 ≤ abs(diff_shares) ≤ 1200`（股，約 1 張）|
| `new_position` | `change_type = 'IN'` |

**前瞻報酬單位**：`future_returns` jsonb 的 key 是天期字串（`"1"/"5"/...`），value 是小數報酬率（0.07 = 7%）。  
**增量 merge**：UPDATE 用 `future_returns = COALESCE(future_returns, '{}') || :new_data`，不可整欄覆蓋。  
**前端聚合**：`src/app/actions/getBuyingPatternStats.ts`（Server Action）在 Server 端 reduce，不回傳原始事件給瀏覽器。
