# CLAUDE.md — ETF Pipeline

## 專案本質

ETF Pipeline 是一個獨立的 Python 後端服務，每日自動追蹤 **16 支主動型 ETF** 的持股異動，透過 FinLab 補充股價/財務資料後存入 Supabase，最後由 Gemini AI 產生報告並推送 LINE 通知。

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
| **deap** | — | 基因演算法框架（optimizer 模組使用） |
| **pymoo** | — | 多目標優化（optimizer/moo 實驗性模組使用） |

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
│       ├── aum_sync_step.py       # [輔助] AUM 時序 + 折溢價/成長拆解 → etf_aum_series
│       ├── dividend_sync_step.py  # [輔助] 同步配息記錄（TWSE etfDiv）→ etf_dividend_records
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
│   ├── etf_dividend_scraper.py # TWSE ETF 分配收益 API：fetch_dividends(etf_code)
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
├── optimizer/                 # GA 策略條件優化器（獨立工具，不進主 pipeline）
│   ├── run.py                 # 入口：uv run python ETF/optimizer/run.py
│   ├── condition_pool.py      # BuyCondition — 技術面/基本面/籌碼條件資料載入
│   ├── conditions.yaml        # 80+ 個條件定義（可自行擴充）
│   ├── analyze.py             # 逐年交易績效統計工具
│   ├── ga/                    # DEAP 基因演算法核心
│   │   ├── compat.py          # FinLab v1/v2 API 自動相容層
│   │   ├── evaluate.py        # 個體適應度計算
│   │   ├── score.py           # single / weighted 兩種計分模式
│   │   ├── setup.py           # DEAP toolbox 初始化（多進程支援）
│   │   ├── run_ga.py          # eaSimple 執行 → 結果存 JSONL
│   │   └── tool.py            # 條件快取、YAML 載入、命名空間
│   └── moo/                   # pymoo 多目標優化（實驗性）
│       └── run_nsga3.py       # NSGA-III，同時最佳化報酬/回撤/Sortino
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

### GA 策略優化器

```bash
# 執行 GA 優化（第一次需先登入 FinLab）
uv run python ETF/optimizer/run.py

# 環境變數（選填）
# PICKLE_FOLDER   條件快取目錄（預設 ./optimizer_cache）
# GA_RESULTS_PATH 結果輸出目錄（預設 ./optimizer_results）

# 安裝 optimizer 額外依賴
uv add deap pymoo joblib
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
| `equity_weekly.yml`（集保 + 週排程） | ~20 min | `--skip-broker` 跳過券商資料，timeout-minutes: 60 |

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
  → DividendSyncStep        ← [輔助] 全 ETF 配息記錄冪等 upsert → etf_dividend_records
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
FINLAB_REFRESH_TOKEN=      # CI 用 Firebase 認證（python -m finlab token --env 取得）
FINLAB_SESSION_ID=         # CI 用 Firebase Session ID
FINLAB_API_KEY=            # CI 用 Firebase API Key（非舊版 FinLab token）；本地用 credentials.json 免設
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

### 各投信直接 API 規格

升級爬蟲或新增 ETF 時參考，以下為各投信官方來源（JS 參考實作位於 `reference/etf_scratch/skills/`）：

#### 復華投信（策略 A — 最穩定）

```http
GET https://www.fhtrust.com.tw/api/assetsExcel/{fhtrustCode}/{YYYYMMDD}
```

- `fhtrustCode`：ETF 內部代碼（00991A → `ETF23`）
- `responseType: arraybuffer` → openpyxl / xlrd 解析
- 找表頭：遍歷所有列找含 `"證券代號"` 的列，**不能硬編碼行號**（各基金前幾列可能是簡介）
- 欄位順序：`[0]=代號 [1]=名稱 [2]=股數 [3]=金額(不用) [4]=權重%`
- 日期不是交易日時 API 回空 Excel → 偵測到無表頭列直接 return None

#### 統一投信 / ezmoney（策略 B — 需 Playwright）

```http
https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode={ezmoneyCCode}
```

- SPA，需 Playwright/Puppeteer 等待 `networkidle`，再 sleep 5s 讓前端渲染完
- DOM：`#assetBody tr`，欄位順序 `[0]=代號 [1]=名稱* [2]=股數, [3]=權重%`
- 清洗：名稱去 `*`，股數去逗號 `parseInt`，權重去 `%` `float`
- 過濾：排除列 `tds[0]` 為 `'股票代號'` 或 `'期貨(名目本金)'`
- `ezmoneyCCode` 對照：00981A → `49YTW`、00988A → `61YTW`

#### 野村投信（策略 D — REST API）

```http
POST https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundTradeInfo
Body: {"FundNo": "00980A", "Date": "YYYY/MM/DD"}   # 注意斜線格式
Headers: Referer: https://www.nomurafunds.com.tw/   # 缺少會 403
```

- 回傳：`res["Entries"]["Stocks"]`，若不存在則嘗試 `res`（Array 型態）
- 欄位名稱不固定：`CStockCode` / `CStocNo`，`CStockName` / `CStocName`，`CQuantity` / `CShares`，`CWeightsPct` / `CProportion` → 用 `or` / `.get()` 雙匹配
- 適用：00980A、00985A

#### 元大投信（策略 C — Playwright + NUXT state）

```http
https://www.yuantaetfs.com/tradeInfo/pcf/{fundCode}
```

- 前端 DOM **只顯示前 5 名**（設計限制），完整持股（53+ 筆）在 SSR hydration state
- Playwright 導航後 sleep 3s，執行 `page.evaluate()` 讀取 `window.__NUXT__`
- 路徑：`window.__NUXT__.data[]`（遍歷找含 `pcfData` 的項目）→ `.pcfData.FundWeights.StockWeights`
- 欄位：`s.code`（含交易所後綴需清洗）、`s.name`、`s.qty`（含逗號）、`s.weights`
- 後綴清洗 regex：`\s+(US|TW|HK|JP|KP|GR|FP|SG|KR|GB)$`
- `__NUXT__` < 3 筆時 fallback MoneyDJ DOM：`table.datalist tr`（取名稱/權重/股數三欄）
- 00990A 資料時間：T+1 公告（4/28 資料在 4/29 才出現），注意日期對齊
- 若元大升級 Nuxt 版本，`__NUXT__` 路徑可能變更，需重新探勘

#### 群益投信（策略 E — REST API）

```http
POST https://www.capitalfund.com.tw/CFWeb/api/etf/buyback
Body: {"fundId": 399}   # 數字 id，非 ETF 代碼
Headers: Referer: https://www.capitalfund.com.tw/etf/product/detail/399/portfolio
```

- 群益使用內部數字 `fundId`，需維護對照表：`{"00982A": 399}`（新基金需手動到官網查詢）
- 回傳：`res["data"]["stocks"]`；欄位：`stocNo / stocName / share / weight`
- 此 API **不需傳日期**，預設回傳最新一期

---

### 前端資料依賴

- `etf_holdings_snapshot` — 前端持股明細頁的主要資料來源
- `stock_prices_daily` — 前端顯示個股現價（`SyncOHLCVStep` 維護）
- `etf_stock_overlap` — 前端跨 ETF 共識持股頁（`OverlapComputeStep` 維護）
- `etf_weight_history` — 前端持股比重走勢圖
- `etf_aum_series` — 前端 AUM 規模儀表板 + 深潛頁市場機制 Tab（`AumSyncStep` 維護，含 close/premium_pct/inflow/market_pnl）
- `etf_dividend_records` — 前端配息時間軸（`DividendSyncStep` 維護；深潛頁市場機制 Tab）
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

## 買進模式回測統計

`etf_buying_patterns` 資料回測結果（2026-02-03 ～ 2026-04-22，29 個交易日，171 支股票，711 筆已結算事件）。

| 模式 | 樣本數 | 5日勝率 | 5日均報酬 | 10日勝率 | 10日均報酬 | 20日勝率 | 20日均報酬 | 20日樣本 |
|------|--------|---------|----------|---------|-----------|---------|-----------|---------|
| `new_position`（新倉建立） | 394 | 54.9% | +2.72% | 67.2% | +7.87% | 72.9% | **+16.77%** | 48 |
| `window_break`（長期突破） | 941 | 59.6% | +3.16% | 71.2% | +7.46% | **78.7%** | **+15.72%** | **343** |
| `chase_high`（強勢追漲） | 538 | 59.5% | +2.87% | 61.4% | +5.22% | 73.3% | +14.17% | 172 |
| `dip_buy`（拉回買進） | 348 | 50.3% | +1.21% | 66.4% | +5.85% | 67.3% | +12.23% | 101 |
| `volume_spike`（爆量異常） | 241 | 57.9% | +1.71% | 67.8% | +5.19% | 66.7% | +10.60% | 36 |
| `sustained_buy`（持續買進） | 108 | 62.9% | +2.87% | 66.3% | +5.85% | 72.7% | +6.03% | 11 |
| ~~`single_lot`~~（已移除） | — | — | — | — | — | 27.7% | — | — |

**使用注意事項：**
- `window_break` 樣本最大（n=343），是最可信的訊號；20 日勝率 78.7% + 均報酬 +15.72%
- `new_position` 均報酬最高（+16.77%）但 20 日樣本僅 48 筆，區間恰逢多頭，數字有高估風險
- `sustained_buy` 20 日樣本僅 11 筆，尚無統計意義，不建議單獨作為決策依據
- 所有數字均受 2026 上半年台股多頭影響，**勝率絕對值偏高**，關注模式間的**相對排序**更有意義
- `single_lot` 已移除：20 日勝率僅 27.7%（低於任何 baseline），無超額報酬

**程式碼定義位置**：`ETF/pipeline/steps/buying_pattern_step.py`
**前端顯示**：`/investment/buying-patterns`（折線圖 / 熱力圖 / 勝率圖）

---

## 市場籌碼資料線（market-chips-dashboard）

`MarketChipsStep`（掛於 RetailSentimentStep 之後、NotifyStep 之前，輔助步驟）每日同步四段市場籌碼，全走**免費公開端點**（不吃 FinLab 配額），段錯誤獨立 try 續跑、全段失敗才標 step 失敗。

### 端點與資料表

| 段 | 來源端點 | 資料表 | 保留 |
| :--- | :--- | :--- | :--- |
| 期貨籌碼 | TAIFEX `cht/3/futContractsDate`（POST HTML，大台 commodityId=`TXF` 正規化為 `TX`）＋ `cht/3/futDataDown`（big5 CSV，欄名「未沖銷契約數」，MXF 行情代碼為 `MTX`） | `futures_institutional_daily` | 長存 |
| 融資融券 | TWSE `rwd/zh/marginTrading/MI_MARGN?selectType=MS`（市場合計） | `market_margin_daily` | 長存 |
| 個股法人 | TWSE `rwd/zh/fund/T86`（上市）＋ TPEx `insti/dailyTrade`（上櫃，民國年日期） | `institutional_stock_daily` | **90 天滾動**（cleanup_step） |
| 訊號 | 由 `institutional_stock_daily` 計算 + JOIN 當日 `etf_diff_logs` BUY/IN 設 `etf_cross` | `institutional_signals` | 長存不清理 |

### 散戶多空比（只算 MXF/TMF，大台無意義）

```text
散戶未平倉 = 全市場 OI − 三大法人 OI（多、空分別計）
retail_ls_ratio = (散戶多單 − 散戶空單) / 全市場 OI × 100
```

存於 `futures_institutional_daily` 的 `institution='retail_summary'` 彙總列（long_oi/short_oi 為推導散戶值，market_oi/retail_ls_ratio 只在此列有值）。

### 三種訊號定義（`market_chips_step.py` 純函式，可單測）

- `dual_buy`：同日 foreign_net > 0 且 trust_net > 0
- `consecutive_buy`：(foreign_net + trust_net) 連續 ≥3 **交易日** > 0（跨週末不中斷）
- `divergence`：外資/投信一正一負，且兩者絕對值**各自**進當日前 50 大

metadata 記錄判定用淨額（＋etf_codes），可稽核不需回查來源列。前端頁：`/investment/market-chips`（Server Action `getMarketChips()`）。

### 陷阱

- TPEx/TWSE 憑證鏈缺 Subject Key Identifier，本機偶發 `SSL: CERTIFICATE_VERIFY_FAILED`；scraper 已用 certifi context，且單來源失敗只寫另一來源（段級容錯，正常行為）
- `futures_institutional_daily` 的 `TMF/trust` 常為 0/0/0 — 投信無微台部位，是真實數據非解析錯誤

---

## 市場機制資料線（etf-market-mechanics）

### etf_aum_series 市場機制欄位（`AumSyncStep` 計算，缺輸入一律 NULL 不估計）

| 欄位 | 公式 / 來源 | NULL 語義 |
| :--- | :--- | :--- |
| `close` | FinLab `price:收盤價`，**只取與 data_date 同日**的價格 | 該日 FinLab 無價 |
| `premium_pct` | `(close − nav) / nav × 100` | close 或 nav 任一缺（**禁止用估計 NAV**） |
| `inflow` | `(units_t − units_{t−1}) × nav_t`（億元，近似式） | 前一日無列、或當日 units/nav 缺 |
| `market_pnl` | `units_{t−1} × (nav_t − nav_{t−1})`（億元，近似式） | 同上 |

- 近似值成因：units 由 AUM/NAV 推算（與 tw-active 同限制），前端 tooltip 已註明
- 聚合指標（growth_mult、inflow_share_of_growth、top flow days）由 Server Action `getEtfMechanics()` / `getAumGrowthRanking()` **讀時計算，不預存**
- 純函式 `compute_premium_pct` / `compute_decomposition` 在 `aum_sync_step.py`，回補腳本重用同一實作
- 一次性回補：`uv run python ETF/scripts/backfill_aum_mechanics.py`（`--dry-run` / `--etf CODE` / `--skip-dividends`）

### etf_dividend_records 配息表（`DividendSyncStep` 每日冪等 upsert）

- 來源：TWSE ETF 分配收益 API `GET https://www.twse.com.tw/rwd/zh/ETF/etfDiv?stkNo={code}&startDate=&endDate=&response=json`（民國年日期需轉換；憑證鏈缺 SKI，用 certifi context）
- 欄位：`(etf_code, period)` UNIQUE、cash_per_unit、ex_date、pay_date（可 NULL）、yield_pct（來源未提供恆 NULL）、source
- **period 由 ex_date 推導（YYYY-MM）**，來源無期別欄；金額 null（除息日已公告、金額未定）→ 跳過該筆，下次同步自動補
- 查詢窗口固定從 2024-01-01 全量抓，冪等 upsert 使連跑筆數不變；無配息 ETF 不寫列不報錯

### NAV 覆蓋現況（fund_assets 來源）

已接 **11 家 issuer**：nomura / allianz / capital（JSON 原生）＋ uni、fhtrust（XLSX 表頭列）、yuanta（靜態 HTML）、taishin（PartialHistoryFundNav，僅 nav）、mega（#asset_div）、ctbc_html（Label_AUM02/03/04）、jpm（XLSX summary，nav_date 恆 None）、fubon（li 清單）。

**NAV 未接清單**（premium_pct 無法計算，前端顯示「NAV 來源未接」）：

| issuer | ETF | 原因 |
| :--- | :--- | :--- |
| first_financial | 00994A | 已知端點無 NAV 揭露管道 |
| cathay | 00400A | REST 無 NAV；Angular SPA 需 Playwright 另行探查 |
| ctbc（REST） | 00995A | token 驗證本機失敗，回應內容未確認 |
| alliance_bernstein | 00984D | 端點故障（302 → 不可達的內部 port 81） |

> 抽取資產摘要失敗**不影響持股解析**（包 try/except，assets=None）；`aum ≈ nav × units` 合理性檢查誤差 >5% 只留 nav。

## 基金持股同步線（manager-fund-dual-track）

**與每日 ETF pipeline 完全獨立的月頻資料線**：抓「經理人共同基金」的月報/季報持股，支撐 `/investment/manager` 經理人雙軌視角與 `fund_signals` 訊號。

### 資料來源與流向

| 來源 | 端點 | 內容 | 限制 |
| :--- | :--- | :--- | :--- |
| SITCA IN2629 | `www.sitca.org.tw/ROC/Industry`（ASP.NET 表單 POST） | 基金月報 Top 10 | **只能查最新一期**（歷史期 server filter 失效，`sitca_scraper` 對非最新期 raise ValueError） |
| SITCA IN2630 | 同上 | 基金季報 ≥1% 持股 | 同上 |
| MOPS t78sb39_q3 | `mopsov.twse.com.tw/mops/web`（POST 民國年+月） | 月報 Top 5 | 歷史期可查，用於回補；只有前五大 |

兩站憑證鏈都缺 Subject Key Identifier，requests 需 `verify=False`（與 fhtrust/official_api scraper 同模式）。

### 檔案與資料表

| 檔案 | 職責 |
| :--- | :--- |
| `scrapers/sitca_scraper.py` | `fetch_monthly/fetch_quarterly/get_latest_*_period`（dropdown 判定最新期） |
| `scrapers/mops_fund_scraper.py` | `fetch_monthly(ym)`，內建基金名正規化 + unmatched 收集 |
| `utils/fund_name_normalizer.py` | raw 全名 → canonical `fund_short`（白名單比對，對不上回 None） |
| `config/fund_manager_map.py` | 19 檔 seed（6 ETF + 13 基金）；**DB `fund_manager_map` 為準**，此檔僅 dry-run fallback |
| `analysis/fund_signals.py` | 6 種訊號偵測（純函式，閾值常數置頂） |
| `run_fund_holdings_sync.py` | 月頻同步主腳本（支援 `--dry-run`） |
| `scripts/backfill_fund_holdings_mops.py` | `--from/--to YYYYMM` 歷史回補（source='mops'） |

資料表：`fund_holdings_monthly`（PK 含 source，sitca/mops 同鍵共存、讀取時 sitca 優先）、`fund_holdings_quarterly`、`fund_manager_map`（經理人對照，含 valid_from/valid_to）、`fund_signals`（UNIQUE (signal_type, stock_code, period)）。

### CI 排程

`.github/workflows/fund_holdings_monthly.yml`：每月 **12、15 日**台北 09:00（月報約 10 日後公佈）跑 `run_fund_holdings_sync.py`；單一 comid 失敗不中斷其餘，但整體 exit 非 0 → LINE 失敗通知。

### 與 etf_signals 的口徑差異（前端已標示，勿混用）

| | `etf_signals` | `fund_signals` |
| :--- | :--- | :--- |
| 頻率 | 日頻 | 月頻 |
| 主體 | ETF 代號（etf_codes TEXT[]） | 基金短名（fund_names JSONB） |
| 本質 | ETF 每日持股**近似**共識 | 基金月報/季報**真雙軌**（基金先買、ETF 後買） |
| 期間欄 | `data_date` DATE | `period` TEXT（YYYYMM） |

unmatched 基金（白名單外）是**正常現象**（元大/台新等大投信旗下非觀測基金），只記 log 不寫 DB；要納入觀測 → 補 `fund_manager_map` 一列（DB + seed 檔同步）。

## CI/CD 已知陷阱

### Self-hosted Runner 切換指南（月配額不足時）

**切換時機：** GitHub Actions 月度配額超過 80%（1600/2000 分鐘）。每週日的 `quota_monitor.yml` 會自動警告；或直接查看 GitHub → Settings → Billing → Actions。

**確認 PCFIX8749 runner 在線：**

1. GitHub → repo → Settings → Actions → Runners
2. 確認 `PCFIX8749` 狀態為 **Idle**（綠燈）
3. 若顯示 **Offline**：在本機以系統管理員開啟 PowerShell → `cd C:\Users\user\actions-runner` → `.\run.cmd`

**切換方式（不需修改 YAML）：**

1. GitHub → repo → Actions → Daily ETF Tracker
2. 右上角「Run workflow」
3. 下拉 `runner`，選 `self-hosted`
4. 點「Run workflow」送出

> Schedule 觸發時仍自動用 `ubuntu-latest`，只有手動觸發可選 self-hosted。

**Windows 環境注意事項：**

- **Shell**：self-hosted runner 在 Windows 上預設使用 bash（Git Bash），`shell: bash` 已在 workflow 中設定，行為與 ubuntu-latest 一致
- **FinLab cache 路徑**：`~/.finlab` 在 Windows Git Bash 環境等效 `C:\Users\user\.finlab`；`mkdir -p ~/.finlab` 正常運作
- **`actions/cache`**：self-hosted 環境可能無法命中 `ubuntu-latest` 留下的 cache（OS 不同），FinLab 會重新下載資料；pipeline 不報錯，僅速度稍慢（首次約多 10 分鐘）
- **Python 版本確認**：`uv run` 會自動抓 `pyproject.toml` 指定的 Python 3.13，不依賴系統 Python

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
| 週排程 `equity_weekly.yml` 不加 `--skip-broker` | `etl:broker_transactions` 是全市場巨型資料集，FinLab cache 7 天後被驅逐，每週從零下載會撞 6 小時 GitHub Actions timeout；**週排程必須帶 `--skip-broker`**（broker 已由日排程同步） |
| 把 `upsert_broker_transactions` 的 `chunk_size` 改回 50 | `chunk_size=50` 會讓 12,600 筆跑 ~34 分鐘；正確值是 **500** |
| 查詢 `etf_diff_logs` 用 `weight_after` | 此欄不存在；正確欄位是 `curr_weight`（當日持倉比重） |
| SQLAlchemy 讀回 `NUMERIC` 欄位直接做 `/` 運算 | PostgreSQL `NUMERIC` 對應 Python `decimal.Decimal`，不能直接和 `float` 相除；必須先 `float()` 轉型，例如 `float(diff_shares) * float(price) / 1e8` |
