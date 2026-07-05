# 專案參考資料（on-demand）

> **on-demand**：設定環境、debug 環境變數、或想看完整目錄結構時才 Read。
> 內容自 CLAUDE.md 遷移（2026-07-05），CLAUDE.md 只留指向。

---

## 環境變數（`.env.local`）

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

## 完整目錄結構

```text
scrivener-flow/
├── src/
│   ├── app/                    # Next.js App Router 頁面與路由
│   │   ├── actions/            # Server Actions（AI、資料同步）
│   │   ├── api/                # API Routes（Webhooks、第三方整合）
│   │   ├── cases/              # 案件詳情頁（含 [id] 動態路由）
│   │   ├── investment/         # 投資儀表板（[etf]、stock/[code]、dashboard/[code]、bare-k、watch-list、compare、consensus、consensus-signal、fund-tracker、momentum、equity、revenue-lab、history、buying-patterns、sectors、frontrunning、strategy、breadth）
│   │   └── login/components/   # 拆解的登入子元件
│   ├── components/             # React 元件（features / layout / todo）
│   ├── hooks/                  # 自訂 React Hooks（投資分析 + 通用 App）
│   ├── services/               # 業務邏輯（caseService.ts、syncService.ts）
│   ├── repositories/           # 資料存取層（投資模組 Repository Pattern）
│   ├── lib/
│   │   ├── supabase/           # client / server / service 三種 client
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

## 技術堆疊補充說明

- **Next.js 16.1.1**：App Router、Server Components、API Routes、Server Actions
- **Prisma ^7.2.0**：⚠️ `schema.prisma` 幾乎為空，實際 Schema 在 `supabase/migrations/`
- **next-auth ^4.24.13**：Google OAuth 整合
- **Tiptap ^3.17.0**：知識庫富文字編輯器
- **Framer Motion ^12.26.2**：頁面 / 卡片動畫
- **Lightweight Charts ^5.1.0**：投資儀表板 K 線圖
- **選型理由**：Supabase RLS 可在資料庫層強制多租戶隔離，Realtime 訂閱讓跨裝置即時同步零成本。部署目標 Vercel（`scrivener-flow.vercel.app`）。
