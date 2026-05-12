# CLAUDE.md — ETF Pipeline

## 專案本質

ETF Pipeline 是一個獨立的 Python 後端服務，每日自動追蹤 **21 支主動型 ETF** 的持股異動，透過 FinLab 補充股價/財務資料後存入 Supabase，最後由 Gemini AI 產生報告並推送 LINE 通知。

ETF 清單統一由 **`ETF/config/etf_registry.py`** 維護（對應 `src/lib/investment/etfRegistry.ts`），新增 ETF 只需改這兩個檔案。

選用 **SQLAlchemy + FinLab** 的理由：需要繞過 Supabase RLS 批次寫入，FinLab 提供台股完整的 OHLCV / 財務 / 籌碼資料。

---

## 技術堆疊

| 技術 | 版本 | 用途 |
| :--- | :--- | :--- |
| **Python** | **3.13** | 主要執行環境 |
| **uv** | — | 套件管理，取代 pip/poetry |
| **SQLAlchemy** | — | 直接操作 Supabase PostgreSQL（繞過 RLS） |
| **FinLab** | **>=1.5.9** | 台股 OHLCV、財務、籌碼資料來源 |
| **pandas** | — | 持股 DataFrame 處理 |
| **google-generativeai** | — | Gemini AI 報告產生 |
| **python-dotenv** | — | 環境變數載入 |

---

## 目錄結構

```text
ETF/
├── main.py                    # 進入點，解析 args、建立 ctx、執行 Pipeline
├── daily_ai_report.py         # 單獨執行 AI 報告的腳本（覆蓋全部 11 支 ETF）
├── sync_stock_financials.py   # 手動同步股票財務資料
│
├── config/
│   └── etf_registry.py        # 「Python 端唱一 ETF 清單」—所有步驟從此讀取，對應 etfRegistry.ts
│
├── pipeline/
│   ├── context.py             # PipelineContext：步驟間共享狀態（核心）
│   ├── orchestrator.py        # 步驟執行順序定義
│   └── steps/
│       ├── base.py            # BaseStep 抽象類別
│       ├── scrape_step.py     # 抓取 00981A 持股（復華投信）
│       ├── price_attach_step.py   # FinLab 補充收盤價
│       ├── diff_compute_step.py   # 計算持股 IN/OUT/BUY/SELL
│       ├── save_snapshot_step.py  # 存入 etf_holdings_snapshot
│       ├── shareholder_signal_step.py  # 讀 stock-data-main JSON，計算大戶積累訊號 → ctx.shareholder_signals
│       ├── weight_history_step.py # 聚合持股比重走勢
│       ├── multi_etf_step.py      # 處理所有 official_api/pocket 來源 ETF
│       ├── aum_sync_step.py       # [輔助] 計算 AUM 時序 → etf_aum_series
│       ├── sync_company_step.py   # 同步公司基本資料
│       ├── sync_ohlcv_step.py     # 同步 stock_prices_daily（含次要 ETF 成分股）
│       ├── overlap_compute_step.py # 聚合跨 ETF 共識持股 → etf_stock_overlap
│       ├── flow_compute_step.py   # [輔助] 跨 ETF 每日資金流向 → etf_flow_daily
│       ├── signal_detect_step.py  # [輔助] 偵測進階訊號 → etf_signals
│       ├── buying_pattern_step.py # [輔助] 分類 7 種買進模式 + 補前瞻報酬 → etf_buying_patterns
│       ├── position_summary_step.py # [輔助] 現金流法持倉損益 → etf_position_summary + etf_pnl_series
│       ├── sync_bare_k_step.py    # 同步 watch_list 裸K快照
│       ├── news_context_step.py   # 直接呼叫 MOPS API，取重大公告 → ctx.news_context
│       ├── notify_step.py         # LINE 推送通知（含 💎 大戶積累標記）
│       └── cleanup_step.py        # 清理暫存資料
│
├── scrapers/
│   ├── fhtrust_scraper.py     # 00981A 來源：復華投信持股 Excel 下載
│   ├── official_api_scraper.py # 6 家投信官方 API（統一/野村/復華/安聯/群益），備援入口
│   ├── pocket_scraper.py      # 次要 ETF 統一來源：Pocket.tw（data_source='pocket' 的 ETF）
│   └── unified_scraper.py     # 統一爬蟲介面，price 空缺率 > 30% 時呼叫 official_api_scraper
│
├── processors/
│   ├── diff_engine.py         # compute_diff()：持股異動計算核心
│   └── revenue_processor.py   # 月營收資料處理
│
├── services/finlab/
│   ├── facade.py              # FinLab 統一入口（股價/OHLCV/公司資料）
│   ├── client.py              # FinLab API 客戶端
│   ├── price_service.py       # 收盤價服務
│   ├── ohlcv_service.py       # OHLCV 歷史資料服務
│   └── company_service.py     # 公司基本資料服務
│
├── services/news/
│   └── mops_client.py         # MOPS API 直打（HTTP POST），取重大公告；無需額外環境變數
│
├── database/
│   ├── sql_storage.py         # SQLAlchemy 直接寫入 Supabase（繞過 RLS）
│   ├── storage.py             # Supabase JS SDK 讀寫封裝
│   └── connection.py          # 資料庫連線設定
│
├── ai_report/
│   ├── fetcher.py             # 從 DB 取快照 / diff_logs 供 AI 分析
│   ├── analyzer.py            # AI 分析邏輯
│   ├── prompt_builder.py      # Gemini Prompt 建構
│   └── reporter.py            # 報告產生與發送
│
├── notifiers/
│   ├── line_notifier.py       # LINE Messaging API 推送
│   └── message_builder.py     # LINE 訊息格式化
│
├── history/                   # 爬取的原始 Excel / CSV（git ignore）
├── migrations/                # SQL migration 腳本
└── legacy/                    # 舊版腳本（不要修改）
```

---

## 常用指令

```bash
# 正常執行（CI 環境或設定 FORCE_RUN=true）
uv run python ETF/main.py --days 30

# Dry Run（只抓取資料，不寫 DB）
uv run python ETF/main.py --dry-run

# 單獨執行 AI 報告
uv run python ETF/daily_ai_report.py

# 同步股票財務資料（日排程：跳過集保，節省 ~69 分鐘）
uv run python ETF/sync_stock_financials.py --days 60 --skip-shareholder

# 同步股票財務資料（週排程 / 手動補跑：含集保）
uv run python ETF/sync_stock_financials.py --days 14

# 執行測試
uv run pytest ETF/

# Lint + Format
uv run ruff check --fix && uv run ruff format
```

> **本地執行保護**：`main.py` 預設封鎖本地執行（保護 FinLab 5GB/天配額）。  
> 本地測試需在 `.env` 設定 `FORCE_RUN=true`。

### GitHub Actions 執行時間預算

| 步驟 | 預期耗時 | 備註 |
| :--- | :--- | :--- |
| `main.py --days 30`（主 pipeline） | ~10 min | 正常 |
| `sync_stock_financials.py --skip-shareholder` | ~8 min | broker chunk_size=500 |
| `daily_ai_report.py`（11 ETF） | ~15 min | Gemini rate limit |
| **日排程合計** | **~33 min** | 22 交易日/月 ≈ 730 min |
| `equity_weekly.yml`（集保 + 週排程） | ~30 min | 僅每週一執行 |

> **注意**：日排程若超過 60 分鐘請先確認：
>
> 1. `--skip-shareholder` 有帶嗎？
> 2. `upsert_broker_transactions` 的 `chunk_size` 是否仍為 500？

---

## Pipeline 步驟順序

```text
ScrapeStep
  → PriceAttachStep
  → DiffComputeStep
  → SaveSnapshotStep
  → ShareholderSignalStep   ← [輔助] 讀 stock-data-main JSON，計算大戶積累 → ctx.shareholder_signals
  → WeightHistoryStep
  → MultiEtfStep            ← 動態讀取 etf_registry，處理所有非 finlab 來源 ETF
  → AumSyncStep             ← [輔助] 計算 NAV × units = AUM，日差 = inflow → etf_aum_series
  → SyncCompanyStep
  → SyncOHLCVStep           ← 合併 secondary_stock_codes 一起 sync 進 stock_prices_daily
  → OverlapComputeStep      ← 聚合跨 ETF 共識持股 → etf_stock_overlap
  → FlowComputeStep         ← [輔助] 跨 ETF 資金流，|Δshares/prev|≥3% 且 weight≥0.3pp → etf_flow_daily
  → SignalDetectStep        ← [輔助] 3 種訊號偵測（multi_fund/overweight/cross_product） → etf_signals
  → BuyingPatternStep       ← [輔助] 分類 7 種買進模式 + 補前 30 天前瞻報酬 → etf_buying_patterns
  → PositionSummaryStep     ← [輔助] 現金流法：CFt=−Δshares×close → etf_position_summary + etf_pnl_series
  → SyncBareKStep           ← 同步 watch_list 裸K快照
  → NewsContextStep         ← [輔助] 直打 MOPS API 取重大公告 → ctx.news_context
  → NotifyStep              ← LINE Carousel，BUY/IN 股若大戶積累顯示 💎
  → CleanupStep
```

> **輔助步驟**（`AumSyncStep`、`FlowComputeStep`、`SignalDetectStep`、`BuyingPatternStep`、`PositionSummaryStep`、`ShareholderSignalStep`、`NewsContextStep`）：`execute()` 內部 `try/except` 不 `raise`，失敗時靜默跳過，不中斷主流程。

---

## 環境變數（必要）

```bash
DATABASE_URL=              # SQLAlchemy 連線字串（Supabase PostgreSQL）
NEXT_PUBLIC_SUPABASE_URL=  # Supabase REST API URL
SUPABASE_SERVICE_ROLE_KEY= # Bypass RLS 的 service role key
FINLAB_API_KEY=            # FinLab API Key（5GB/天配額，本地謹慎使用）
GOOGLE_GEMINI_API_KEY=     # Gemini AI 報告
STOCK_LINE_CHANNEL_ACCESS_TOKEN=  # LINE Bot（股票專用）
STOCK_LINE_USER_ID=        # LINE 推送目標 User ID
```

---

## 關鍵知識

### PipelineContext 是步驟間唯一的溝通橋梁

每個步驟接收 `ctx`、修改後回傳。新增步驟只需繼承 `BaseStep` 並實作 `run(ctx)`。

**重要欄位：**

- `ctx.df` — 當前 ETF 持股 DataFrame
- `ctx.date_str` — 資料日期（`YYYY-MM-DD`）
- `ctx.diff_logs` — 持股異動事件列表（IN/OUT/BUY/SELL）
- `ctx.secondary_stock_codes` — 00980A / 00991A 成分股代碼，由 `MultiEtfStep` 填入，`SyncOHLCVStep` 消費
- `ctx.shareholder_signals` — `{stock_code: "積累"|"減少"|"持平"}`，由 `ShareholderSignalStep` 填入，`NotifyStep` 消費（💎 標記）
- `ctx.news_context` — MOPS 重大公告列表，由 `NewsContextStep` 填入，`reporter.py` 注入 AI Prompt

### ETF 資料來源差異

ETF 清單統一由 `ETF/config/etf_registry.py` 的 `source` 欄位決定爬蟲策略：

| `source` 值 | 適用 ETF 數 | 爬蟲 | 特性 |
| :--- | :--- | :--- | :--- |
| `official_api` | 1（00981A） + ~9 支 | `official_api_scraper.py` → fallback `fhtrust_scraper.py` | 00981A：官網 API 優先，失敗才 fallback ezmoney XLSX；其他：官網 API 失敗 fallback pocket |
| `pocket` | ~5 支 | `pocket_scraper.py` | Pocket.tw；公告日才更新（可能數日一筆） |

> **FinLab** 不用於持股爬取，僅 `PriceAttachStep` 用來補充收盤價（備援角色）。

新增 ETF：只需在 `etf_registry.py` 新增一行（含 `source`），以及在 `src/lib/investment/etfRegistry.ts` 同步更新。

### 前端資料依賴

- `etf_holdings_snapshot` — 前端持股明細頁的主要資料來源
- `stock_prices_daily` — 前端顯示個股現價（`SyncOHLCVStep` 維護）
- `etf_stock_overlap` — 前端跨 ETF 共識持股頁（`OverlapComputeStep` 維護）
- `etf_weight_history` — 前端持股比重走勢圖
- `etf_aum_series` — 前端 AUM 規模儀表板（`AumSyncStep` 維護）
- `etf_signals` — 前端訊號標記（`SignalDetectStep` + `FlowComputeStep` 維護）
- `etf_buying_patterns` — 買進模式 + 前瞻報酬（`BuyingPatternStep` 維護）；前端 `/investment/buying-patterns` 頁面讀取
- `etf_flow_daily` — 前端每日資金流向儀表板（`FlowComputeStep` 維護）
- `etf_position_summary` — 前端個股進出場損益（`PositionSummaryStep` 維護）
- `etf_pnl_series` — 前端 ETF 損益走勢圖（`PositionSummaryStep` 維護）

> 修改 DB Schema 時需同步通知前端開發者（`src/app/investment/`）。

---

## 籌碼與新聞步驟

### 大戶籌碼訊號（`ShareholderSignalStep`）

資料來源：`equity_distribution_stats` Supabase 表（由 `sync_equity_distribution.py` 每週從 FinLab 同步）。

```python
# 取最新一期的 big_holder_pct_change（400 張+ 大戶週度變化）
if delta > 0.1:    signal = "積累"   # LINE 通知顯示 💎
elif delta < -0.1: signal = "減少"
else:              signal = "持平"
```

- `equity_distribution_stats` 每週才更新（TDCC 集保公告週期），非每日
- 股票無資料（小型股、未入庫）→ 靜默跳過
- 此步驟為輔助步驟，失敗不中斷 pipeline

### MOPS 重大公告（`NewsContextStep`）

直接呼叫 `mops.twse.com.tw/mops/api/t05st02`，無需額外 API Key 或本地資料。取 ETF 前十大持股近 5 日公告，存入 `ctx.news_context` 供 AI 報告使用。

- MOPS API 回溯上限約 7 天
- 此步驟為輔助步驟，失敗不中斷 pipeline

---

## 常見錯誤

| ❌ 錯誤 | ✅ 正確 |
| :--- | :--- |
| 直接跑 `python ETF/main.py` | 必須用 `uv run`，且設定 `FORCE_RUN=true` |
| 用 `pip install` | 用 `uv add` 管理依賴 |
| 在步驟間用全域變數傳遞狀態 | 所有狀態放入 `PipelineContext` |
| 修改 `legacy/` 的舊腳本 | 舊腳本不使用，直接忽略 |
| 直接查 Supabase REST API | 批次寫入用 `sql_storage.py`（SQLAlchemy 繞過 RLS） |
| FinLab 本地隨意執行 | 有 5GB/天配額限制，本地測試用 mock 或 dry-run |
| 輔助步驟的 `except` 加 `raise` | 輔助步驟只 `logger.error()`，不 `raise`，確保主流程不中斷 |
| catch 用 `except Exception as e: pass` | 必須記錄錯誤，不可靜默失敗（`logger.error` 必填） |
| AI 報告週末全部跳過 | `reporter.py` 允許 3 天內資料（台股週末不開市，週五資料週日仍有效） |
| `etf_diff_logs` ON CONFLICT 報錯（409） | 唯一約束已存在仍可能 409：REST API `resolution=merge-duplicates` 不可靠。正確解法：`ctx.sql_storage.save_diff_logs()`（SQLAlchemy），與 `multi_etf_step._save_diff_logs` 同模式 |
| 大戶籌碼查不到資料 | 確認 `equity_distribution_stats` 表有資料；`sync_equity_distribution.py` 需先執行過 |
| 新聞用 Cloudflare D1 查詢 | 直接打 MOPS HTTP API（`services/news/mops_client.py`），無需額外環境變數 |
| 投信持股統計窗口用 10 日 | 台股投信持股統計窗口是 **5 日**，不是 10 日 |
| `sync_stock_financials.py` 不加 `--skip-shareholder` 直接跑 daily | TDCC 集保資料每週才更新，加上舊的 `chunk_size=50` 會讓 daily 跑 ~2 小時；**daily 必須帶 `--skip-shareholder`** |
| 把 `upsert_broker_transactions` 的 `chunk_size` 改回 50 | `chunk_size=50` 會讓 12,600 筆跑 ~34 分鐘；正確值是 **500** |
| 查詢 `etf_diff_logs` 用 `weight_after` | 此欄不存在；正確欄位是 `curr_weight`（當日持倉比重） |
| SQLAlchemy 讀回 `NUMERIC` 欄位直接做 `/` 運算 | PostgreSQL `NUMERIC` 對應 Python `decimal.Decimal`，不能直接和 `float` 相除；必須先 `float()` 轉型，例如 `float(diff_shares) * float(price) / 1e8` |
