# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 專案本質

**Scrivener Flow** 是一套面向台灣代書（地政士）的不動產案件管理系統。核心命題：把簽約→用印→完稅→代償→交屋的整個作業流程，從 Excel + 便利貼轉移到一個具備即時同步、自動提醒、投資組合追蹤與 AI 輔助的 Web App。

選用 **Next.js App Router + Supabase** 的理由：Supabase RLS 可在資料庫層強制多租戶隔離，Realtime 訂閱可讓跨裝置即時同步零成本。部署目標：Vercel (`scrivener-flow.vercel.app`)。

---

## 技術堆疊（含版本號）

| 技術 | 版本 | 在此專案的用途 |
|------|------|--------------|
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

## 目錄結構

```
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
│   │   ├── cases/              # 案件詳情頁
│   │   ├── investment/         # 投資儀表板與分析
│   │   ├── knowledge/          # 團隊知識庫
│   │   ├── calculator/         # 稅費試算工具
│   │   └── auth/               # 登入 / OAuth callback
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
│   │   ├── investment/         # FinLab、技術指標
│   │   └── docx-parser/        # Word 文件解析
│   ├── domain/case/types.ts    # 案件領域模型（Single Source of Truth）
│   ├── types/                  # 全域 TypeScript 型別定義
│   ├── hooks/                  # React custom hooks
│   └── scripts/                # CLI 腳本（股票資料更新）
├── prisma/schema.prisma        # DB Schema（PostgreSQL）
├── .agent/                     # AI Agent 規則與記憶庫（MUST READ）
│   ├── rules.md                # 核心行為規則
│   ├── ANTIGRAVITY_INTELLIGENCE.md # 專案記憶
│   └── domain_expertise.md    # 技術選型細節指引
├── migrations/                 # SQL migration 腳本
├── .github/workflows/          # CI/CD Pipelines
└── pyproject.toml              # Python 依賴（uv 管理）
```

架構模式：**分層架構**（Pages → Services → Repositories → DB），投資模組採 Repository Pattern；案件模組以 `caseService.ts` 為中心做 Façade。

---

## 常用指令

### 開發

```bash
yarn dev              # 啟動 Next.js dev server（預設 port 3000，若被占用則為 3001）
yarn build            # Production 建置
yarn start            # 執行 production server
npx supabase status   # 查看本地 Supabase 狀態（npx 一次性指令可用，但禁止 npm install）
```

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

---

## 架構關鍵知識

### 1. 資料流

```
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

### 4. API 設計規則

**資料突變（Mutation）優先使用 Server Actions**，禁止建立傳統 REST API Route (`route.ts`)，除非用於：

- Webhooks（LINE、Google 等第三方回呼）
- 需要特定 HTTP Method 的第三方整合

**多表寫入（Multi-table writes）必須確保原子性**：

- 優先使用 Supabase RPC（PL/pgSQL Transaction）
- 若在 Server Action 處理，必須實作 `try/catch` 與補償機制清除失敗的髒資料

### 5. 投資模組

投資儀表板（`src/app/investment/`）採 Repository Pattern，`repositories/` 下有獨立的 `priceRepo`、`revenueRepo`、`stockRepo`。後端股票資料由 Python FinLab 腳本定期同步，存入 Supabase。

### 6. E2EE 敏感資料

`src/lib/crypto/` 實作 AES-256 用戶端加密，私密備註在傳入 DB 前已加密，Master Key 僅存於 `.env.local`。

### 7. UI 風格規範（強制）

所有容器使用 `.glass-card`（`backdrop-blur + bg-white/65 + border-white/50`）。
Input 使用 Glass Input Style：`bg-white/50 backdrop-blur-sm border-gray-200 focus:bg-white`。
頁面進場：`animate-fade-in`（0.6s）；列表卡片：`animate-slide-up`（staggered）。

---

## 重要文件索引

| 優先 | 檔案 | 說明 |
|------|------|------|
| 1 | `.agent/rules.md` | **MUST READ**：AI Agent 完整行為準則與 ECC 協議 |
| 2 | `.agent/ANTIGRAVITY_INTELLIGENCE.md` | **MUST READ**：專案特定記憶與過往修正紀錄 |
| 3 | `.agent/domain_expertise.md` | 各技術層（Next.js、Python、測試）的選型細節 |
| 4 | `src/types/index.ts` | 全域核心型別（Case、Milestone、Financial 等） |
| 5 | `src/domain/case/types.ts` | 案件領域模型（Single Source of Truth） |

---

## 容易踩坑的地方

| ❌ 錯誤 | ✅ 正確 |
|---------|--------|
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
| Component 超過 150 行不拆分 | 超過 150 行必須拆分；業務邏輯抽至 `use*.ts` hook |

---

## 三大核心原則

1. **資料優先**：先定義 Zod Schema / TypeScript interface，再實作 UI 與業務邏輯。
2. **單一事實來源**：同一概念只能有一個實作，在 `domain/` 或 `types/` 定義，不要複製型別。
3. **修改前先搜尋**：用 `Grep` / `Glob` 確認現有實作，能擴充就不新建。
