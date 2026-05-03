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
│   │   ├── investment/         # 投資儀表板（[etf]、stock/[code]、bare-k、watch-list、compare、consensus、equity、revenue-lab、history）
│   │   └── login/components/   # 拆解的登入子元件
│   ├── components/             # React 元件
│   │   ├── features/           # 功能型元件
│   │   ├── layout/             # Header、SideNav、Footer
│   │   └── todo/               # 待辦事項（List / Matrix / Calendar）
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
├── openspec/changes/           # 功能變更的 proposal / design / specs / tasks
└── pyproject.toml              # Python 依賴（uv 管理）
```

架構模式：**分層架構**（Pages → Services → Repositories → DB），投資模組採 Repository Pattern。

---

## 常用指令

### 前端開發

```bash
yarn dev              # 啟動 Next.js dev server（port 3000，被占用則 3001）
yarn build            # Production 建置
yarn test             # 執行所有 Jest 單元測試
yarn test -- --testPathPattern=src/path/to/test  # 執行單一測試檔
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
LINE_CHANNEL_SECRET=

# 加密
ENCRYPTION_MASTER_KEY=          # AES-256-GCM，90 天輪替

# 投資
FINLAB_API_KEY=
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
| 4 | `src/lib/investment/etfRegistry.ts` | 15 支 ETF 唯一清單（新增 ETF 只改此檔 + Python 端的 `ETF/config/etf_registry.py`） |
| 5 | `src/lib/investment/holdingsUtils.ts` | `getAllHoldings()`、`buildUnionHoldings()`（前端聚合邏輯核心） |
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
| `workflow.md` | openspec 流程、登入重導向處理、套件管理禁令 |

> ETF Pipeline 有獨立的 `ETF/CLAUDE.md`，涵蓋步驟架構、資料來源差異、常見錯誤等，修改 Python 端前必讀。

---

## 三大核心原則

1. **資料優先**：先定義 Zod Schema / TypeScript interface，再實作 UI 與業務邏輯。
2. **單一事實來源**：同一概念只能有一個實作，在 `domain/` 或 `types/` 定義，不要複製型別。
3. **修改前先搜尋**：用 `Grep` / `Glob` 確認現有實作，能擴充就不新建。

---

## 關鍵架構陷阱

### Supabase Client 選擇

三種 client 用途不同，用錯會導致 RLS 繞不過或 Server/Client 邊界錯誤：

- `src/lib/supabase/client.ts` — Client Component（受 RLS）
- `src/lib/supabase/server.ts` — Server Component / Server Action（受 RLS）
- `src/lib/supabase/service.ts` — 管理員，bypass RLS（**僅 Server 端**）

### 台股色彩慣例（投資模組禁止違反）

台股與歐美**相反**：**紅色 = 上漲**，**綠色 = 下跌**。
所有漲跌顯示使用 `text-rose-600`（漲）和 `text-emerald-600`（跌）。

### `etf_diff_logs.diff_shares` 單位（當日加減碼）

`diff_shares` 是 **原始股數（股）**，不是張：

```ts
const 張 = Math.round(Math.abs(diff_shares) / 1000);          // 顯示用
const amount_亿 = Math.abs(diff_shares) * price / 1e8;         // 億元市值
```

`amount_亿` 在 DB 無此欄，需 Server 端用 holdings `price` 計算後傳入前端。  
查詢 `etf_diff_logs` 時需明確 select `diff_weight`、`is_significant`、`prev_shares`（舊程式碼只取了子集）。

### ETF 日期一致性

`getAllHoldings()` 先查全局最新 `canonicalDate`，再讓 15 支 ETF 並行使用同一日期。
Pipeline 各步驟日期統一使用 `ctx.date_str`，`date.today()` 只作 fallback。

### Supabase JOIN 回傳陣列

即使 1:1 關係，JOIN 回傳仍是陣列：`caseData.milestone?.[0]?.contract_date`，型別定義用 `Milestone[]`。

### 案件列表排序（`/cases` 頁面）

`src/app/cases/page.tsx` 預設以里程碑優先順序排序：**印（seal_date）→ 稅（tax_payment_date）→ 過（transfer_date）→ 交（handover_date）**。  
排序邏輯：每個案件取第一個「尚未過期」的里程碑日期，最近者排最上方；無未來日期的案件沉底。  
Table 上方提供五個排序按鈕（`sort` URL param）：`milestone`（預設優先序）、`seal`、`tax`、`transfer`、`handover`。  
**禁止改動預設排序行為**，代書最常需要看下一個「用印」進度。

---

## 功能變更流程

**所有功能開發 / 修改必須走 openspec 流程**，不使用 `/plan`。詳見 `.claude/rules/workflow.md`。

```bash
openspec new change "<name>"          # 建立新 change
openspec apply --change "<name>"      # 開始執行 tasks
```

---

## App Router 路由模組

| 路由 | 說明 |
| :--- | :--- |
| `/cases` | 案件列表（里程碑排序）+ `/cases/[id]` 案件詳情 |
| `/investment` | 投資儀表板入口，子路由見目錄結構 |
| `/banks` | 代償銀行管理 |
| `/calculator` | 稅費試算工具（利用 `src/lib/calculator/`） |
| `/clauses` | 契約條款範本管理 |
| `/notes` | 備忘錄板（支援 `view=list` 緊湊模式） |
| `/redemptions` | 代償案件管理 |
| `/knowledge` | 知識庫（Tiptap 富文字，全員共用，不做 user_id 隔離） |
| `/admin` | 管理員功能（import、用戶管理） |
| `/identify` | 文件辨識（DOCX 解析） |
| `/login` | 登入頁（Google OAuth + 密碼 + MFA TOTP） |

---

## 服務層與 Repository 索引

### Services（`src/services/`）

| 檔案 | 職責 |
| :--- | :--- |
| `caseService.ts` | 案件 CRUD、里程碑更新、自動任務生成（3–5天前） |
| `todoService.ts` | 待辦事項新增/完成/刪除，含 `source_key` 去重 |
| `noteService.ts` | 備忘錄 CRUD + E2EE 加密備註 |
| `dashboardNotesService.ts` | 首頁備忘錄摘要（跨案件） |
| `revenueLabService.ts` | 營收分析資料查詢 |

### Repositories（`src/repositories/`）— 僅投資模組使用

| 檔案 | 職責 |
| :--- | :--- |
| `priceRepo.ts` | 個股每日收盤價查詢 |
| `revenueRepo.ts` | 月營收資料查詢 |
| `stockRepo.ts` | 個股基本資料、法人持股 |

Repository Pattern 僅限投資模組，案件模組使用 Service 層直接呼叫 Supabase。

---

## 工具庫索引（`src/lib/`）

| 路徑 | 說明 |
| :--- | :--- |
| `calculator/` | 稅費計算：`taxConstants.ts`（稅率）、`landTaxUtils.ts`、`houseTaxUtils.ts`、`feeUtils.ts`、`calculatorUtils.ts` |
| `docx-parser/` | DOCX 文件解析：extractors 拆分 basicInfo、payments、personnel、redemptions |
| `crypto/` | E2EE：`encryption.ts`（AES-256-GCM）、`keyManagement.ts`（90 天輪替）、`secureApi.ts`（防流量分析） |
| `auth/` | `client.ts`（Client 端 session）、`server.ts`（Server 端 session） |
| `google/drive.ts` | Google Drive 整合（文件上傳/存取） |
| `emailService.ts` | Email 通知 |
| `lineService.ts` | LINE Messaging API（通知、Flex Message） |
| `constants/` | `caseConstants.ts`（案件狀態）、`milestoneConstants.ts` |

---

## 測試策略

測試框架：**Jest** + React Testing Library，設定檔 `jest.config.ts`。

```bash
yarn test                                        # 執行所有測試
yarn test -- --testPathPattern=useHoldings       # 執行含關鍵字的測試
yarn test -- --coverage                          # 產生覆蓋率報告
```

- 測試檔放在 `**/__tests__/` 或同目錄 `*.test.ts(x)`
- Setup 檔：`src/__tests__/setup.ts`（全域 mock 設定）
- 路徑別名 `@/` 在 Jest 中已對應 `src/`（`moduleNameMapper` 設定）
- 目前測試集中在投資 hooks（`useHoldingsFilter`、`useStockWeightAnalysis`）

---

## CI/CD 工作流

| Workflow | 排程 | 執行內容 |
| :--- | :--- | :--- |
| `etf_daily.yml` | 每日 UTC 14:00（台灣 22:00） | `main.py --days 30` → `sync_stock_financials.py --days 60 --skip-shareholder` → `daily_ai_report.py` |
| `equity_weekly.yml` | 每週六 UTC 14:00 | `sync_equity_distribution.py` → `sync_stock_financials.py --days 14`（含股東結構） |

Pipeline 需要的 GitHub Secrets：`SUPABASE_DB_URL`、`FINLAB_API_TOKEN`、`GOOGLE_GEMINI_API_KEY`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`。
