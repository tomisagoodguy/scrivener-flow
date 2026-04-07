# CLAUDE.md — ETF Pipeline

## 專案本質

ETF Pipeline 是一個獨立的 Python 後端服務，每日自動追蹤三支主動型 ETF（00981A / 00980A / 00991A）的持股異動，透過 FinLab 補充股價/財務資料後存入 Supabase，最後由 Gemini AI 產生報告並推送 LINE 通知。

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
├── daily_ai_report.py         # 單獨執行 AI 報告的腳本
├── sync_stock_financials.py   # 手動同步股票財務資料
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
│       ├── weight_history_step.py # 聚合持股比重走勢
│       ├── multi_etf_step.py      # 處理 00980A / 00991A（MoneyDJ）
│       ├── sync_company_step.py   # 同步公司基本資料
│       ├── sync_ohlcv_step.py     # 同步 stock_prices_daily（含次要 ETF 成分股）
│       ├── overlap_compute_step.py # 聚合跨 ETF 共識持股 → etf_stock_overlap
│       ├── notify_step.py         # LINE 推送通知
│       └── cleanup_step.py        # 清理暫存資料
│
├── scrapers/
│   ├── fhtrust_scraper.py     # 00981A 來源：復華投信持股 Excel 下載
│   ├── moneydj_scraper.py     # 00980A / 00991A 來源：MoneyDJ 持股頁面
│   └── unified_scraper.py     # 統一爬蟲介面
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

# 同步股票財務資料
uv run python ETF/sync_stock_financials.py --days 60

# 執行測試
uv run pytest ETF/

# Lint + Format
uv run ruff check --fix && uv run ruff format
```

> **本地執行保護**：`main.py` 預設封鎖本地執行（保護 FinLab 5GB/天配額）。  
> 本地測試需在 `.env` 設定 `FORCE_RUN=true`。

---

## Pipeline 步驟順序

```text
ScrapeStep
  → PriceAttachStep
  → DiffComputeStep
  → SaveSnapshotStep
  → WeightHistoryStep
  → MultiEtfStep          ← 處理 00980A / 00991A，填入 ctx.secondary_stock_codes
  → SyncCompanyStep
  → SyncOHLCVStep         ← 合併 secondary_stock_codes 一起 sync 進 stock_prices_daily
  → OverlapComputeStep    ← 聚合跨 ETF 共識持股 → etf_stock_overlap
  → NotifyStep
  → CleanupStep
```

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

### ETF 資料來源差異

| ETF | 來源 | 爬蟲 | 特性 |
| :--- | :--- | :--- | :--- |
| **00981A** | 復華投信官網 | `fhtrust_scraper.py` | 主流程，含完整異動計算 |
| **00980A** | MoneyDJ | `moneydj_scraper.py` | 只存快照，價格從 `stock_prices_daily` 補充 |
| **00991A** | MoneyDJ | `moneydj_scraper.py` | 同 00980A |

### 前端資料依賴

- `etf_holdings_snapshot` — 前端持股明細頁的主要資料來源
- `stock_prices_daily` — 前端顯示個股現價（`SyncOHLCVStep` 維護）
- `etf_stock_overlap` — 前端跨 ETF 共識持股頁（`OverlapComputeStep` 維護）
- `etf_weight_history` — 前端持股比重走勢圖

> 修改 DB Schema 時需同步通知前端開發者（`src/app/investment/`）。

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
| catch 用 `except Exception as e: pass` | 必須記錄錯誤，不可靜默失敗 |
