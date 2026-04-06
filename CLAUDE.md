# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

此檔案提供 Claude Code 在本專案中工作的指引。

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
| **Prisma** | **^7.2.0** | DB Schema 定義與查詢 |
| **next-auth** | **^4.24.13** | Google OAuth 整合 |
| **Tiptap** | **^3.17.0** | 知識庫的 Word 等級富文字編輯器 |
| **Zod** | **^4.3.5** | Schema 驗證（資料優先設計的核心） |
| **Framer Motion** | **^12.26.2** | 頁面 / 卡片動畫 |
| **Lightweight Charts** | **^5.1.0** | 投資儀表板 K 線圖 |
| **Python** | **3.13** | 背景爬蟲、FinLab 量化分析 |
| **uv** | — | Python 套件管理（取代 pip/poetry） |

---

### 目錄結構

```text
scrivener-flow/
├── src/
│   ├── app/                    # Next.js App Router 頁面與路由
│   │   ├── actions/            # Server Actions（AI、資料同步）
│   │   ├── api/                # API Routes（REST endpoints）
│   │   │   ├── cases/          # 案件 CRUD
│   │   │   ├── investment/     # 投資持股、營收、股價
│   │   │   ├── drive/          # Google Drive 整合
│   │   │   ├── line/           # LINE Messaging webhook
│   │   │   ├── sync/           # 跨裝置資料同步
│   │   │   └── migrations/     # DB migration endpoints
│   │   ├── cases/              # 案件詳情頁（含 [id] 動態路由）
│   │   ├── clauses/            # 特約條款管理（基本特約 + 自訂特約）
│   │   ├── investment/         # 投資儀表板與分析
│   │   ├── knowledge/          # 團隊知識庫（含 Tiptap 富文字編輯）
│   │   ├── calculator/         # 稅費試算工具
│   │   ├── banks/              # 銀行貸款管理
│   │   ├── notes/              # 備忘錄 / 案件筆記板
│   │   ├── redemptions/        # 代償管理
│   │   ├── guidelines/         # 作業指引
│   │   ├── identify/           # 標的物辨識
│   │   ├── admin/import/       # 管理員資料匯入
│   │   ├── login/              # 登入頁
│   │   │   └── components/     # 拆解的登入子元件（MfaTotpForm、PasswordLoginForm 等）
│   │   └── auth/               # OAuth callback
│   ├── components/             # React 元件
│   │   ├── features/           # 功能型元件（案件、投資、知識庫）
│   │   ├── layout/             # Header、SideNav、Footer
│   │   ├── shared/             # 通用元件（AuthGate、Modal）
│   │   ├── todo/               # 待辦事項（List / Matrix / Calendar）
│   │   └── ui/                 # 基礎 UI（Button、Dialog…）
│   ├── services/               # 業務邏輯服務層
│   │   ├── caseService.ts      # 案件 CRUD 與里程碑邏輯
│   │   ├── syncService.ts      # 同步協調
│   │   └── revenueLabService.ts # 投資資料服務
│   ├── repositories/           # 資料存取層（投資模組）
│   ├── lib/                    # 工具函式與第三方整合
│   │   ├── supabase/           # Supabase client（server / browser）
│   │   ├── crypto/             # E2EE（AES-256）
│   │   ├── ai/                 # Gemini API
│   │   ├── google/             # Sheets / Drive API
│   │   ├── investment/         # FinLab、技術指標、yearUtils.ts（年份常數）
│   │   ├── calculator/         # 稅費計算工具（taxConstants.ts）
│   │   ├── constants/          # 業務常數（caseConstants.ts、TODO_SOURCE_TYPES）
│   │   └── docx-parser/        # Word 文件解析
│   ├── domain/case/types.ts    # 案件領域模型（Single Source of Truth）
│   ├── types/                  # 全域 TypeScript 型別定義
│   ├── hooks/                  # React custom hooks
│   └── scripts/                # CLI 腳本（股票資料更新）
├── prisma/schema.prisma        # ⚠️ 僅含 generator/datasource 設定，實際 Schema 在 supabase/migrations/
├── supabase/migrations/        # 真正的 DB Schema（SQL 格式，20260111032050_recreate_full_schema.sql）
├── migrations/                 # SQL migration 腳本
├── .github/workflows/          # CI/CD Pipelines
└── pyproject.toml              # Python 依賴（uv 管理）
```

架構模式：**分層架構**（Pages → Services → Repositories → DB），投資模組採 Repository Pattern；案件模組以 `caseService.ts` 為中心做 Façade。

---

## 常用指令

### 開發

```bash
yarn dev              # 啟動 Next.js dev server（預設 port 3000，若被占用則 3001）
yarn build            # Production 建置
yarn start            # 執行 production server
npx supabase status   # 查看本地 Supabase 狀態（npx 一次性指令可用，但禁止 npm install）
```

> **本地開發常見狀況**：port 3000 被占用時自動使用 3001。根頁面 `/` 若無 session 會跳轉 `/login`；若 login 後仍 404，直接嘗試 `/cases` 或 `/dashboard`。

### 測試

```bash
yarn test                          # 執行所有 Jest 單元測試
yarn test -- --testPathPattern=<檔案路徑>  # 執行單一測試檔
```

### 程式碼品質

```bash
yarn lint                          # ESLint 靜態分析
```

### Python（量化分析）

```bash
uv run pytest                      # 執行 Python 測試
uv run ruff check --fix && uv run ruff format  # Lint + Format
uv run --with "finlab>=1.5.9" python <script>  # 含 FinLab 執行腳本
```

**無** TypeScript 建置或測試 CI。只有一個 workflow：

```yaml
.github/workflows/etf_daily.yml   # 每日 UTC 14:00（台灣時間 22:00）自動執行
                                   # Python ETF 資料同步 + FinLab 股票更新 + AI 報告產生
```

DB Schema 變更必須寫成 `.sql` 檔放入 `supabase/migrations/`，不能用 Supabase UI 手動操作。

---

## 環境變數（必要）

`.env.local` 需包含以下變數（無 `.env.example`，以此為準）：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 僅 Server 端，bypass RLS

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Google
GOOGLE_GEMINI_API_KEY=          # AI 功能（每日簡報、投資分析）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# LINE
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=

# 加密
ENCRYPTION_MASTER_KEY=          # AES-256-GCM，90 天輪替

# 投資
FINLAB_API_KEY=                 # Python FinLab 股票資料
DATABASE_URL=                   # Prisma connection string
```

---

## 架構關鍵知識

### 1. 資料流

```mermaid
React Component → Service（caseService/syncService）→ API Route → Supabase（RLS 隔離）
                                                                ↓
                                              Realtime Subscription → Component 即時更新
```

### 2. 多租戶隔離

Supabase **Row Level Security (RLS)** 在資料庫層強制 `user_id` 隔離，每位用戶只看到自己的案件、待辦、財務資料。知識庫例外，為全體成員共用。

### 3. 里程碑 vs 任務

這是核心領域概念：

- **里程碑（Milestone）**：合約事實（簽約日、完稅日），唯讀，不可刪除。

- **任務（Task）**：可執行的待辦，系統會在里程碑前 3–5 天自動生成提醒任務。

### 4. DB Schema 的真實位置

`prisma/schema.prisma` **幾乎是空的**（只有 generator + datasource 設定）。所有表格定義、RLS Policy、Index 都在：

```text
supabase/migrations/20260111032050_recreate_full_schema.sql
```

主要表格：`cases`、`milestones`（1:1）、`financials`（1:1）、`todos`、`bank_contacts`、`team_notes`、`contract_clauses`、`encryption_keys`、ETF 投資相關表。Cases 唯一鍵為 `(user_id, case_number)`。

修改 Schema 時：直接新增 `.sql` 到 `supabase/migrations/`，不能用 Prisma migrate。

### 5. API 設計規則

**資料突變（Mutation）優先使用 Server Actions**，禁止建立傳統 REST API Route (`route.ts`)，除非用於：

- Webhooks（LINE、Google 等第三方回呼）
- 需要特定 HTTP Method 的第三方整合

**多表寫入（Multi-table writes）必須確保原子性**：

- 優先使用 Supabase RPC（PL/pgSQL Transaction）
- 若在 Server Action 處理，必須實作 `try/catch` 與補償機制清除失敗的髒資料

### 5-2. 投資模組

投資儀表板（`src/app/investment/`）採 Repository Pattern，`repositories/` 下有獨立的 `priceRepo`、`revenueRepo`、`stockRepo`。後端股票資料由 Python FinLab 腳本定期同步，存入 Supabase。

### 6. E2EE 敏感資料

`src/lib/crypto/` 實作 AES-256-GCM（PBKDF2 100k iterations）加密，私密備註在傳入 DB 前已加密。

- **Key 來源優先序**：環境變數 `ENCRYPTION_MASTER_KEY` → DB `encryption_keys` 表 → Fallback
- **Key 輪替**：90 天週期，保留最近 3 個歷史 key 供舊資料解密（舊資料不會自動重新加密）
- `SecureApi` wrapper 額外加入隨機 padding（512–1536 bytes）與隨機延遲（50–300ms）防流量分析
- 解密失敗的常見原因：key 版本不符，需確認 `encryption_keys` 表有對應版本的 key

### 7. AI 功能（Gemini）

AI 功能（每日簡報、文字優化、投資分析）由 `src/lib/ai/geminiConfig.ts` 統一管理。

- **功能閘門**：`ALLOWED_EMAIL` 硬編碼限制，AI Server Actions 在執行前會驗證 session email，不符合者靜默返回
- **模型 Fallback 鏈**：依序嘗試 `gemini-2.5-flash` → `gemini-3-flash` → ... 共 9 個模型，失敗才往下一個，解釋 AI 回應有時較慢的原因
- Gemini API Key 存於環境變數 `GOOGLE_GEMINI_API_KEY`

### 8. Todo 同步架構

`src/components/todo/hooks/useTodoSync.ts` 採**雙軌同步**：

1. **Supabase Realtime**：訂閱 `todos`、`milestones`、`financials` 表的 `postgres_changes`，跨裝置即時更新
2. **Window 自訂事件**：`window.dispatchEvent(new Event('todo-updated'))` 用於同頁面跨元件通知

修改待辦相關邏輯時，兩軌都必須考慮。

- 待辦使用**軟刪除**（`is_deleted: true`），不會直接 DELETE，查詢時必須過濾 `is_deleted = false`
- 系統自動任務（案件里程碑前 3–5 天）透過 `source_key`（`case_id + milestone_type`）去重，防止重複產生

### 9. Supabase Client 三種用法

| 檔案 | 用途 | 注意 |
| :--- | :--- | :--- |
| `src/lib/supabase/client.ts` | Browser（Client Component） | 受 RLS 限制，使用登入 session |
| `src/lib/supabase/server.ts` | Server Component / Server Action | 受 RLS 限制，使用 session cookie |
| `src/lib/supabase/service.ts` | 管理員操作（bypass RLS） | **只能在 Server 端使用**，勿暴露於 Client |

### 10. UI 風格規範（強制）

所有容器使用 `.glass-card`（`backdrop-blur + bg-white/65 + border-white/50`）。
Input 使用 Glass Input Style：`bg-white/50 backdrop-blur-sm border-gray-200 focus:bg-white`。
頁面進場：`animate-fade-in`（0.6s）；列表卡片：`animate-slide-up`（staggered）。

---

## 重要文件索引

| 優先 | 檔案 | 說明 |
| :--- | :--- | :--- |
| 1 | `src/types/index.ts` | 全域核心型別（Case、Milestone、Financial 等） |
| 2 | `src/domain/case/types.ts` | 案件領域模型（Single Source of Truth） |
| 3 | `src/lib/constants/caseConstants.ts` | 案件狀態、待辦來源型別常數（DB 值必須與此一致） |
| 4 | `src/lib/investment/yearUtils.ts` | 投資模組年份常數（`generateAvailableYears`） |
| 5 | `src/lib/calculator/taxConstants.ts` | 稅費計算基準常數（印花稅率、地價稅層距） |

---

## 容易踩坑的地方

| ❌ 錯誤 | ✅ 正確 |
| :--- | :--- | :--- |
| 用 `npm install` | 嚴格使用 `yarn`，禁止 npm |
| 直接 `pip install` | 用 `uv add` 管理 Python 依賴 |
| 使用 `any` 型別 | 用 `unknown` + type guard |
| 在 Client Component 做 DB 查詢 | 優先 Server Component；複雜查詢走 API Route |
| 硬編碼 API Key | 所有機密僅放 `.env.local`，發現立即警告 |
| 新增 `_v2.ts` 備份檔 | 直接修改原檔，版本交給 git 管理 |
| 修改里程碑邏輯時忘記自動任務 | 里程碑與任務是連動的，確認 `caseService.ts` 中的自動任務生成邏輯 |
| Supabase JOIN 結果當 Object 存取 | JOIN 回傳**陣列**（1:many），必須用 `relation?.[0]`，並將型別定義為 `Relation[]` |
| `useSearchParams()` 放在 layout/header 全域元件 | 這會導致靜態 build 失敗，必須在 `layout.tsx` 用 `<Suspense>` 包裹 |
| Google Auth 在 Production 失敗 | Supabase Dashboard → Authentication → Redirect URLs 必須加入 `https://<your-domain>/**` |
| Component 超過 150 行不拆分 | 超過 150 行必須拆分；業務邏輯抽至 `use*.ts` hook；任何單一檔案不超過 800 行 |
| 深色模式用 `dark:bg-*` Tailwind 類別 | `dark-theme.css` 對 `.rounded-2xl`、`.shadow-sm`、`.bg-white` 等結構類別使用 `!important`，導致 Tailwind `dark:` variants 被蓋掉。需要深色模式特定樣式時，必須在元素加專用 CSS class（如 `.my-special-card`），並在 `dark-theme.css` 末端用 `html.dark .my-special-card { ... !important }` 覆蓋 |
| AI 功能除錯時找不到問題 | AI Server Actions 有 `ALLOWED_EMAIL` 閘門，session email 不符合會靜默返回空結果，不會拋出錯誤 |
| 查詢待辦事項漏掉已刪除筆 | 待辦使用軟刪除（`is_deleted` flag），必須在查詢條件加 `is_deleted = false` |
| `CaseStatus` 使用中文字串比對 | `CaseStatus` 型別混用中英文值（`'辦理中'` 和 `'Processing'` 並存），寫 filter 條件時注意資料來源實際儲存的是哪一種 |
| localhost 登入後無限重導向 `/login` | 根頁面 `/` 無 session 時自動跳轉登入。若已登入仍 404，直接訪問 `/cases` 或 `/dashboard`。遇到 `/login` 重導向時**停止重試**，告知使用者需在瀏覽器手動登入，不要盲目重試 |
| 新增系統自動任務時重複產生 | 系統任務（里程碑提醒）必須以 `source_key`（`caseId + milestone_type`）為複合唯一鍵去重；發現舊資料缺鍵時需清理 DB，不能只從 UI 過濾 |
| `catch (err: any)` | catch 變數使用 `unknown` 而非 `any`；存取 `err.message` 前必須加 `err instanceof Error ?` guard |
| 硬編碼年份陣列 `[2025]` | 使用 `src/lib/investment/yearUtils.ts` 的 `generateAvailableYears()` 或預定義常數 |
| 案件狀態字串散落各處 | 使用 `src/lib/constants/caseConstants.ts` 的 `CASE_STATUS_ACTIVE` 等常數，確保 DB 值一致 |
| 登入頁面直接在 `ModernLogin.tsx` 寫表單 | 表單元件已拆至 `src/app/login/components/`，修改對應子元件即可 |

---

## 三大核心原則

1. **資料優先**：先定義 Zod Schema / TypeScript interface，再實作 UI 與業務邏輯。
2. **單一事實來源**：同一概念只能有一個實作，在 `domain/` 或 `types/` 定義，不要複製型別。
3. **修改前先搜尋**：用 `Grep` / `Glob` 確認現有實作，能擴充就不新建。

---

## ETF Python Pipeline 架構

每日 UTC 14:00 自動執行（`ETF/main.py`），追蹤三支 ETF：

| ETF | 名稱 | 資料來源 |
| :--- | :--- | :--- |
| **00981A** | 半導體收益 ETF | `fhtrust_scraper.py`（復華投信） |
| **00980A** | 野村智慧優選 | `moneydj_scraper.py`（MoneyDJ） |
| **00991A** | 復華未來50 | `moneydj_scraper.py`（MoneyDJ） |

### Pipeline 步驟（00981A 主流程）

```text
ScrapeStep → PriceAttachStep → DiffComputeStep → SaveSnapshotStep
→ WeightHistoryStep → MultiEtfStep → SyncCompanyStep → SyncOHLCVStep
→ NotifyStep → CleanupStep
```

`MultiEtfStep` 在主流程中處理 00980A / 00991A（快照、AUM、產業分布）。

### 關鍵模組

| 路徑 | 說明 |
| :--- | :--- |
| `ETF/pipeline/context.py` | `PipelineContext`：步驟間共享狀態（df、date_str、diff_logs 等） |
| `ETF/pipeline/orchestrator.py` | 步驟執行順序 |
| `ETF/processors/diff_engine.py` | `compute_diff()`：計算持股 IN/OUT/BUY/SELL |
| `ETF/services/finlab/facade.py` | FinLab 股價 / OHLCV / 公司資料統一入口 |
| `ETF/database/sql_storage.py` | SQLAlchemy 直接操作 Supabase（繞過 RLS） |
| `ETF/daily_ai_report.py` | Gemini AI 報告產生 + LINE 發送 |
| `ETF/ai_report/fetcher.py` | 從 DB 取快照 / diff_logs 供 AI 分析 |

### ETF 常用指令

```bash
uv run python ETF/main.py --days 30        # 正常執行（同步最近 30 天）
uv run python ETF/main.py --dry-run        # 只跑 ScrapeStep，不寫 DB
uv run python ETF/daily_ai_report.py       # 單獨執行 AI 報告
uv run python ETF/sync_stock_financials.py --days 60  # 同步股票財務資料
```

---

## 功能變更流程（openspec）

**所有功能開發 / 修改必須走 openspec 流程**，不使用 `/plan`。

```bash
openspec new change "<name>"          # 建立新 change
openspec status --change "<name>"     # 查看 artifact 進度
openspec instructions <artifact> --change "<name>"  # 取得撰寫指引
openspec apply --change "<name>"      # 開始執行 tasks
```

Change 目錄：`openspec/changes/<name>/`，Artifact 順序：`proposal → design → specs → tasks`。

進行中的 change 可用 `openspec status --change "<name>"` 確認進度，tasks.md 用 checkbox 追蹤。
