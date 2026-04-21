# CLAUDE.md

此檔案提供 Claude Code 在本專案中工作的指引。詳細規則請見 `.claude/rules/`。

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
│   │   ├── investment/         # 投資儀表板（[etf] 與 stock/[code]）
│   │   ├── knowledge/          # 團隊知識庫（Tiptap 富文字）
│   │   ├── calculator/         # 稅費試算工具
│   │   └── login/components/   # 拆解的登入子元件
│   ├── components/             # React 元件
│   │   ├── features/           # 功能型元件
│   │   ├── layout/             # Header、SideNav、Footer
│   │   ├── todo/               # 待辦事項（List / Matrix / Calendar）
│   │   └── ui/                 # 基礎 UI 元件
│   ├── services/               # 業務邏輯（caseService.ts、syncService.ts）
│   ├── repositories/           # 資料存取層（投資模組 Repository Pattern）
│   ├── lib/                    # 工具函式與第三方整合
│   │   ├── supabase/           # client / server / service 三種 client
│   │   ├── crypto/             # E2EE（AES-256-GCM）
│   │   ├── ai/                 # Gemini API（geminiConfig.ts）
│   │   ├── investment/         # FinLab、yearUtils.ts
│   │   └── constants/          # caseConstants.ts、TODO_SOURCE_TYPES
│   ├── domain/case/types.ts    # 案件領域模型（Single Source of Truth）
│   └── types/                  # 全域 TypeScript 型別定義
├── prisma/schema.prisma        # ⚠️ 僅含 generator/datasource，不定義 model
├── supabase/migrations/        # 真正的 DB Schema（SQL 格式）
├── ETF/                        # Python ETF Pipeline
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
yarn lint             # ESLint 靜態分析
```

### ETF Pipeline（Python）

```bash
uv run python ETF/main.py --days 30        # 正常執行（同步最近 30 天）
uv run python ETF/main.py --dry-run        # 只跑 ScrapeStep，不寫 DB
uv run python ETF/daily_ai_report.py       # 單獨執行 AI 報告
uv run ruff check --fix && uv run ruff format  # Lint + Format
```

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
DATABASE_URL=                   # Prisma connection string

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
| 4 | `src/lib/investment/yearUtils.ts` | 投資模組年份常數（`generateAvailableYears`） |
| 5 | `src/lib/calculator/taxConstants.ts` | 稅費計算基準常數 |
| 6 | `ETF/pipeline/context.py` | Pipeline 步驟間共享狀態，含 `secondary_stock_codes` |

---

## 三大核心原則

1. **資料優先**：先定義 Zod Schema / TypeScript interface，再實作 UI 與業務邏輯。
2. **單一事實來源**：同一概念只能有一個實作，在 `domain/` 或 `types/` 定義，不要複製型別。
3. **修改前先搜尋**：用 `Grep` / `Glob` 確認現有實作，能擴充就不新建。

---

## 功能變更流程

**所有功能開發 / 修改必須走 openspec 流程**，不使用 `/plan`。詳見 `.claude/rules/workflow.md`。

```bash
openspec new change "<name>"          # 建立新 change
openspec apply --change "<name>"      # 開始執行 tasks
```
