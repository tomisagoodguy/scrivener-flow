<!-- SPECTRA:START v1.0.2 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `/spectra-*` skills when:

- A discussion needs structure before coding → `/spectra-discuss`
- User wants to plan, propose, or design a change → `/spectra-propose`
- Tasks are ready to implement → `/spectra-apply`
- There's an in-progress change to continue → `/spectra-ingest`
- User asks about specs or how something works → `/spectra-ask`
- Implementation is done → `/spectra-archive`
- Commit only files related to a specific change → `/spectra-commit`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `/spectra-apply` and `/spectra-ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

此檔案提供 Claude Code 在本專案中工作的指引。詳細規則請見 `.claude/rules/`（下方有索引）。

---

## 專案本質

**Scrivener Flow** 是一套面向台灣代書（地政士）的不動產案件管理系統。核心命題：把簽約→用印→完稅→代償→交屋的整個作業流程，從 Excel + 便利貼轉移到一個具備即時同步、自動提醒、投資組合追蹤與 AI 輔助的 Web App。

選用 **Next.js App Router + Supabase** 的理由：Supabase RLS 可在資料庫層強制多租戶隔離，Realtime 訂閱可讓跨裝置即時同步零成本。部署目標：Vercel (`scrivener-flow.vercel.app`)。

---

## 技術堆疊（含版本號）

| 技術 | 版本 | 在此專案的用途 |
| :--- | :--- | :--- |
| **Next.js** | **16.1.1** | App Router、Server Components、API Routes、Server Actions |
| **React** | **19.2.3** | UI 元件樹 |
| **TypeScript** | **^5** | 嚴格型別（禁用 `any`，改用 `unknown` + type guards） |
| **Tailwind CSS** | **^4** | 玻璃擬態 (glassmorphism) 視覺風格 |
| **Supabase JS** | **^2.89.0** | PostgreSQL 資料庫、Auth、Realtime、Storage |
| **Prisma** | **^7.2.0** | DB Schema 定義（⚠️ `schema.prisma` 幾乎為空，實際 Schema 在 `supabase/migrations/`） |
| **next-auth** | **^4.24.13** | Google OAuth 整合 |
| **Tiptap** | **^3.17.0** | 知識庫富文字編輯器 |
| **Zod** | **^4.3.5** | Schema 驗證（資料優先設計的核心） |
| **Framer Motion** | **^12.26.2** | 頁面 / 卡片動畫 |
| **Lightweight Charts** | **^5.1.0** | 投資儀表板 K 線圖 |
| **Python** | **3.13** | 背景爬蟲、FinLab 量化分析 |
| **uv** | — | Python 套件管理（取代 pip/poetry） |

---

## 目錄結構

```text
scrivener-flow/
├── src/
│   ├── app/                    # Next.js App Router 頁面與路由
│   │   ├── actions/            # Server Actions（AI、資料同步）
│   │   ├── api/                # API Routes（Webhooks、第三方整合）
│   │   ├── cases/              # 案件詳情頁（含 [id] 動態路由）
│   │   ├── investment/         # 投資儀表板（[etf]、stock/[code]、dashboard/[code]、bare-k、watch-list、compare、consensus、consensus-signal、fund-tracker、momentum、equity、revenue-lab、history、buying-patterns、sectors、frontrunning、strategy、breadth）
│   │   └── login/components/   # 拆解的登入子元件
│   ├── components/             # React 元件
│   │   ├── features/           # 功能型元件
│   │   ├── layout/             # Header、SideNav、Footer
│   │   └── todo/               # 待辦事項（List / Matrix / Calendar）
│   ├── hooks/                  # 自訂 React Hooks（投資分析 + 通用 App）
│   ├── services/               # 業務邏輯（caseService.ts、syncService.ts）
│   ├── repositories/           # 資料存取層（投資模組 Repository Pattern）
│   ├── lib/
│   │   ├── supabase/           # client / server / service 三種 client（用途不同，見下方）
│   │   ├── crypto/             # E2EE（AES-256-GCM）
│   │   ├── ai/                 # Gemini API（geminiConfig.ts）
│   │   └── investment/         # holdingsUtils.ts、etfRegistry.ts、yearUtils.ts
│   ├── domain/case/types.ts    # 案件領域模型（Single Source of Truth）
│   └── types/                  # 全域 TypeScript 型別定義
├── prisma/schema.prisma        # ⚠️ 僅含 generator/datasource，不定義 model
├── supabase/migrations/        # 真正的 DB Schema（SQL 格式）
├── ETF/                        # Python ETF Pipeline（含自己的 CLAUDE.md）
│   └── optimizer/              # GA 策略條件優化器（DEAP + pymoo，不進主 pipeline）
├── openspec/changes/           # 功能變更的 proposal / design / specs / tasks
└── pyproject.toml              # Python 依賴（uv 管理）
```

架構模式：**分層架構**（Pages → Hooks → Services → Repositories → DB），投資模組採 Repository Pattern。

---

## 常用指令

### 前端開發

```bash
yarn dev              # 啟動 Next.js dev server（port 3000，被占用則 3001）
yarn build            # Production 建置
yarn test             # 執行所有 Jest 單元測試
yarn test --testPathPatterns src/path/to/test  # 執行單一測試檔（旗標為 --testPathPatterns，複數）
yarn lint             # ESLint 靜態分析
```

TypeScript 路徑別名：`@/` → `src/`（對應 `tsconfig.json` 的 `paths`）。

### ETF Pipeline（Python）

```bash
uv run python ETF/main.py --days 30        # 正常執行（同步最近 30 天）
uv run python ETF/main.py --dry-run        # 只跑 ScrapeStep，不寫 DB（本地安全）
uv run python ETF/daily_ai_report.py       # 單獨執行 AI 報告
uv run ruff check --fix && uv run ruff format  # Lint + Format
uv run pytest ETF/                         # 執行所有 ETF 單元測試
uv run pytest ETF/tests/test_specific.py   # 執行單一測試檔
```

> **本地執行保護**：`main.py` 預設封鎖本地執行（保護 FinLab 5GB/天配額）。本地測試需在 `.env` 設定 `FORCE_RUN=true`。

CI：`.github/workflows/etf_daily.yml` 每日 UTC 14:00（台灣時間 22:00）自動執行。

---

## 環境變數

`.env.local` 需包含以下變數：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 僅 Server 端，bypass RLS

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Google
GOOGLE_GEMINI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# LINE
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=            # HMAC-SHA256 Webhook 簽章驗證
LINE_USER_ID=                   # 管理員的 LINE User ID（Bot 推播目標）

# 加密
ENCRYPTION_MASTER_KEY=          # AES-256-GCM，90 天輪替

# 投資（FinLab 新版 Firebase 認證，本地用 `uv run python -m finlab login` 後自動讀 credentials.json）
FINLAB_REFRESH_TOKEN=           # CI 用：python -m finlab token --env 取得
FINLAB_SESSION_ID=              # CI 用：python -m finlab token --env 取得
FINLAB_API_KEY=                 # CI 用：Firebase API Key（非舊版 FinLab token）
DATABASE_URL=                   # Prisma / SQLAlchemy connection string

# 裸K看盤公開瀏覽
BARE_K_OWNER_USER_ID=           # 未登入者顯示此 user 的自選股（唯讀）；需同步設定於 Vercel
```

---

## 重要文件索引

| 優先 | 檔案 | 說明 |
| :--- | :--- | :--- |
| 1 | `src/types/index.ts` | 全域核心型別（Case、Milestone、Financial、Holding 等） |
| 2 | `src/domain/case/types.ts` | 案件領域模型（Single Source of Truth） |
| 3 | `src/lib/constants/caseConstants.ts` | 案件狀態、待辦來源型別常數 |
| 4 | `src/lib/investment/etfRegistry.ts` | ETF 唯一清單（目前 26 支，含 A 類主動股票型與 D 類債券型；新增 ETF 只改此檔 + Python 端的 `ETF/config/etf_registry.py`） |
| 5 | `src/lib/investment/holdingsUtils.ts` | `getAllHoldings()`、`buildUnionHoldings()`（前端聚合邏輯核心） |
| 7 | `src/lib/investment/strategyUtils.ts` | 策略選股型別（`StrategySignalsResult`、`computeMovement()`）、與 `strategy_signals` 資料表對接 |
| 6 | `ETF/pipeline/context.py` | Pipeline 步驟間共享狀態，含 `date_str`、`secondary_stock_codes` |

---

## 規則文件索引（`.claude/rules/`）

每個規則檔涵蓋不同領域，修改對應功能前必須先讀：

| 檔案 | 涵蓋內容 |
| :--- | :--- |
| `components.md` | 元件大小上限、Supabase client 選擇（3種）、Server Action vs API Route、**台股色彩慣例（紅漲綠跌）**、useSearchParams 陷阱 |
| `database.md` | RLS 多租戶隔離、里程碑 vs 任務、E2EE 加密架構、Todo 雙軌同步、Schema 修改流程（禁用 Prisma migrate） |
| `etf-pipeline.md` | Pipeline 步驟錯誤處理（關鍵 vs 輔助步驟）、日期來源規則（`ctx.date_str` 優先）、SQL `CAST()` vs `::` 語法、自選股名稱查詢三表優先序、`diff_shares` 單位（股→張÷1000） |
| `ai.md` | Gemini fallback 鏈、`ALLOWED_EMAIL` 功能閘門、AI Server Action 限制 |
| `dark-mode.md` | `dark-theme.css !important` 覆蓋問題與正確的深色模式做法 |
| `workflow.md` | 功能變更流程（現行 Spectra，openspec 為歷史遺留）、登入重導向處理、套件管理禁令 |
| `indexes.md` | 路由、Services、Repositories、Hooks、工具庫完整索引 |
| `model-dispatch.md` | **調度守則**：指揮官不下場、派工三件套、真實 model enum（`sonnet\|opus\|haiku\|fable`）、升降級路徑、驗證不自驗 |
| `judgment-rubrics.md` | **判斷力 rubric**：何時升級模型/算完成/該問使用者/方向錯了；Windows shell 與編碼 checklist；同類工具選哪個 |

> ETF Pipeline 有獨立的 `ETF/CLAUDE.md`，涵蓋步驟架構、資料來源差異、常見錯誤等，修改 Python 端前必讀。

## Harness 治理（on-demand，`.claude/governance/`，用時才 Read）

主對話（指揮官）的運作制度。**大量讀取/掃 repo/查網頁/批次改檔一律派 subagent**，主對話只進結論（詳見 `.claude/rules/model-dispatch.md`）。

| 觸發時機 | Read 此檔 |
| :--- | :--- |
| 想了解本 harness 的 token/失焦/出錯弱點 | `.claude/governance/harness-diagnosis.md` |
| **要派 subagent** | `.claude/governance/delegation-templates.md`（搜尋/實作/重構/研究/審查範本） |
| **要新增/修改治理檔或 CLAUDE.md/rules** | `.claude/governance/maintenance-protocol.md`（可自改 vs 先問、精簡上限） |
| 新 session 想了解此環境的注意事項 | `.claude/governance/letter-to-future-session.md` |

---

## 三大核心原則

1. **資料優先**：先定義 Zod Schema / TypeScript interface，再實作 UI 與業務邏輯。
2. **單一事實來源**：同一概念只能有一個實作，在 `domain/` 或 `types/` 定義，不要複製型別。
3. **修改前先搜尋**：用 `Grep` / `Glob` 確認現有實作，能擴充就不新建。

---

## 關鍵架構陷阱

> Supabase Client 三選一（client/server/service，用錯 RLS 繞不過）與**台股色彩慣例（紅漲綠跌，`text-rose-600` 漲／`text-emerald-600` 跌，投資模組禁止違反）**的完整說明在 `.claude/rules/components.md`——此處不重複，改動投資模組色彩或查詢層前先讀該檔。

### `etf_diff_logs.diff_shares` 單位（當日加減碼）

`diff_shares` 是 **原始股數（股）**，不是張：

```ts
const 張 = Math.round(Math.abs(diff_shares) / 1000);          // 顯示用
const amount_亿 = Math.abs(diff_shares) * price / 1e8;         // 億元市值
```

`amount_亿` 在 DB 無此欄，需 Server 端用 holdings `price` 計算後傳入前端。  
查詢 `etf_diff_logs` 時需明確 select `diff_weight`、`is_significant`、`prev_shares`（舊程式碼只取了子集）。

### ETF 日期一致性

`getAllHoldings()` 先查全局最新 `canonicalDate`，再讓 `ETF_REGISTRY` 全部 ETF 並行使用同一日期。
Pipeline 各步驟日期統一使用 `ctx.date_str`，`date.today()` 只作 fallback。

### Supabase JOIN 回傳陣列

即使 1:1 關係，JOIN 回傳仍是陣列：`caseData.milestone?.[0]?.contract_date`，型別定義用 `Milestone[]`。

### 量化策略模組架構

`ETF/strategies/` 存放 5 種 FinLab 量化選股策略，所有策略繼承 `BaseStrategy`（實作 `strategy_id`、`description`、`get_positions(cache)`）。  
每日 CI 執行後結果寫入 `strategy_signals`（`strategy_id, stock_id, date, score, is_selected`）。  
前端透過 `getStrategySignals()` Server Action 讀取，並用 `computeMovement()` 標記 00981A 的增減碼狀態（`adding / reducing / holding / none`）。  
新增策略：繼承 `BaseStrategy`，在 `ETF/strategies/__init__.py` 註冊，並在 `strategyRegistry.ts` 新增 `strategy_id` → 描述對照。

### 案件列表排序（`/cases` 頁面）

`src/app/cases/page.tsx` 預設以里程碑優先順序排序：**印（seal_date）→ 稅（tax_payment_date）→ 過（transfer_date）→ 交（handover_date）**。  
排序邏輯：每個案件取第一個「尚未過期」的里程碑日期，最近者排最上方；無未來日期的案件沉底。  
Table 上方提供五個排序按鈕（`sort` URL param）：`milestone`（預設優先序）、`seal`、`tax`、`transfer`、`handover`。  
**禁止改動預設排序行為**，代書最常需要看下一個「用印」進度。

---

## 功能變更流程

**所有功能開發 / 修改必須走 Spectra（SDD）流程**，不使用 `/plan`。詳見本檔頂部「Spectra Instructions」與 `.claude/rules/workflow.md`。

```text
discuss?（可選）→ /spectra-propose → /spectra-apply ⇄ /spectra-ingest → /spectra-archive
```

Specs 在 `openspec/specs/`，change proposals 在 `openspec/changes/`，artifact 順序 `proposal → design → specs → tasks`。

> **Spectra CLI 陷阱**：
>
> - 無 `spectra sync` 子指令。`spectra archive <name>`（不加 `--skip-specs`）預設即把 delta specs 同步進主 `openspec/specs/`（ADDED/MODIFIED 一併套用），不需另外手動 sync。
> - `spectra task done <change> <id>` 的 `<id>` 是**數字流水號**（1, 2, 3…），不是 `tasks.md` 的 `1.1`/`2.1` 標籤。傳 `1.1` 會報 `Invalid task ID: must be a number`。先用 `spectra instructions apply --change <name> --json` 取得每個 task 的數字 `id`。

---

## 測試策略

測試框架：**Jest** + React Testing Library，設定檔 `jest.config.ts`。

```bash
yarn test                                        # 執行所有測試
yarn test --testPathPatterns useHoldings         # 執行含關鍵字的測試
yarn test -- --coverage                          # 產生覆蓋率報告
```

- 測試檔放在 `**/__tests__/` 或同目錄 `*.test.ts(x)`
- Setup 檔：`src/__tests__/setup.ts`（全域 mock 設定）
- 路徑別名 `@/` 在 Jest 中已對應 `src/`（`moduleNameMapper` 設定）
- 目前測試集中在投資 hooks（`useHoldingsFilter`、`useStockWeightAnalysis`）

---

## LINE Bot 架構

LINE Bot 提供雙向互動能力，架構分三層：

| 層 | 檔案 | 職責 |
| :--- | :--- | :--- |
| **公開 Webhook** | `src/app/api/line/webhook/route.ts` | 接收 LINE 平台事件，HMAC-SHA256 簽章驗證後分派 |
| **安全推播** | `src/app/api/line/secure/route.ts` | 管理員呼叫的推播端點（需驗證 session） |
| **Follower 管理** | `src/lib/lineFollowerService.ts` | `upsertFollower` / `deactivateFollower` / `listActiveFollowers`（`line_followers` 資料表） |

**Webhook 支援的使用者指令：**

- `/list` — 回覆目前 Bot 好友清單
- 一般文字訊息 — Bot 依設定回應

**ETF 通知去重機制：** `etf_notification_log` 資料表記錄每日已發送的 Carousel，防止同一天重複推播。

**注意事項：**

- `LINE_CHANNEL_SECRET` 用於 HMAC-SHA256 簽章驗證，若未設定會導致所有 Webhook 請求被拒
- `LINE_USER_ID` 是管理員推播目標，不是 Bot 的 Channel ID
- `/api/line/webhook` 為公開路由（不需 session），勿加 Auth middleware

---

## CI/CD 工作流

| Workflow | 排程 | 執行內容 |
| :--- | :--- | :--- |
| `etf_daily.yml` | 每日 UTC 14:00（台灣 22:00） | `main.py --days 30` → `sync_stock_financials.py --days 60 --skip-shareholder` → `daily_ai_report.py` |
| `equity_weekly.yml` | 每週六 UTC 14:00 | `sync_equity_distribution.py` → `sync_stock_financials.py --days 14`（含股東結構） |

Pipeline 需要的 GitHub Secrets：`SUPABASE_DB_URL`、`FINLAB_API_TOKEN`、`GOOGLE_GEMINI_API_KEY`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`。

## CI/CD 已知陷阱

- **Claude Code agent worktree 會變成 gitlink**：`.claude/worktrees/` 目錄若被 commit，git 會以 mode `160000` 記錄為 gitlink；CI 的 `git submodule` 步驟找不到對應 `.gitmodules` 記錄就報錯。已在 `.gitignore` 加入 `.claude/worktrees/`，未來 agent worktree 不會再被追蹤。
- **GitHub Actions 免費額度**：Private repo 每月 2,000 分鐘，月底重置。目前三個 workflow 月用量約 800 分鐘。額度用完當月 CI 會失敗，等下月重置即可。
- **Self-hosted Runner 已設定**：`C:\Users\user\actions-runner`（機器名稱 PCFIX8749），開機自動啟動。額度不足時將 workflow 的 `runs-on: ubuntu-latest` 改成 `runs-on: self-hosted` 即可切換到本機執行，不消耗 GitHub 額度。
