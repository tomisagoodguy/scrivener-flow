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

> 本檔只當**索引**。領域規則在 `.claude/rules/`，多數已 **paths-scoped**（只在觸碰對應檔案時自動載入，見下表）；長參考資料在 `.claude/governance/`（用時才 Read）。**修改某領域前，對應規則檔必讀。**

## 專案本質

**Scrivener Flow**：面向台灣代書（地政士）的不動產案件管理系統（簽約→用印→完稅→代償→交屋），加上台股 ETF 投資監控模組。Next.js App Router + Supabase（RLS 多租戶隔離 + Realtime），部署 Vercel。

## 技術堆疊

| 技術 | 版本 | 備註 |
| :--- | :--- | :--- |
| Next.js / React | **16.1.1** / **19.2.3** | App Router、優先 Server Components |
| TypeScript | ^5 | 禁 `any`，用 `unknown` + type guards |
| Tailwind CSS | ^4 | 玻璃擬態，容器用 `.glass-card` |
| Supabase JS | ^2.89.0 | DB / Auth / Realtime / Storage |
| Zod | ^4.3.5 | 資料優先設計核心 |
| Prisma | ^7.2.0 | ⚠️ `schema.prisma` 幾乎為空，真 Schema 在 `supabase/migrations/` |
| Python + uv | 3.13 | ETF 爬蟲 / FinLab 量化（`ETF/` 有獨立 CLAUDE.md） |

其餘套件版本與選型理由 → `.claude/governance/project-reference.md`。

## 常用指令

```bash
yarn dev              # dev server（port 3000，被占用則 3001）
yarn build            # Production 建置
yarn test             # Jest 全部測試；單檔用 --testPathPatterns <關鍵字>（旗標為複數）
yarn lint             # ESLint
uv run python ETF/main.py --days 30   # ETF pipeline（本地需 .env 設 FORCE_RUN=true）
uv run python ETF/main.py --dry-run   # 只跑 ScrapeStep，不寫 DB
uv run ruff check --fix && uv run ruff format
uv run pytest ETF/                    # ETF 單元測試
```

路徑別名：`@/` → `src/`。測試檔在 `**/__tests__/` 或同目錄 `*.test.ts(x)`；setup 在 `src/__tests__/setup.ts`。

## 三大核心原則

1. **資料優先**：先定義 Zod Schema / TypeScript interface，再實作 UI 與業務邏輯。
2. **單一事實來源**：同一概念只能有一個實作，在 `domain/` 或 `types/` 定義，不要複製型別。
3. **修改前先搜尋**：用 `Grep` / `Glob` 確認現有實作，能擴充就不新建。

## 高頻陷阱（一句話版，完整說明在指向檔）

- Supabase client 三選一（client/server/service），用錯 RLS 繞不過 → `rules/components.md`
- **台股紅漲綠跌**（`text-rose-600` 漲 / `text-emerald-600` 跌），投資模組禁止違反 → `rules/components.md`
- Supabase JOIN 回傳**陣列**（即使 1:1）：`milestone?.[0]?.contract_date` → `rules/database.md`
- `etf_diff_logs.diff_shares` 單位是**股**不是張（÷1000 顯示）→ `rules/etf-pipeline.md`
- `/cases` 預設里程碑排序（印→稅→過→交）**禁止改動** → `rules/components.md`
- Schema 修改只走 `supabase/migrations/*.sql`，**禁** Prisma migrate → `rules/database.md`

## 重要檔案

| 檔案 | 說明 |
| :--- | :--- |
| `src/types/index.ts` | 全域核心型別（Case、Milestone、Financial、Holding） |
| `src/domain/case/types.ts` | 案件領域模型（Single Source of Truth） |
| `src/lib/constants/caseConstants.ts` | 案件狀態、待辦來源型別常數 |
| `src/lib/investment/etfRegistry.ts` | ETF 唯一清單（新增 ETF 只改此檔 + `ETF/config/etf_registry.py`） |
| `src/lib/investment/holdingsUtils.ts` | `getAllHoldings()`、`buildUnionHoldings()` 前端聚合核心 |
| `ETF/pipeline/context.py` | Pipeline 共享狀態（`date_str`、`secondary_stock_codes`） |

## 規則檔索引（`.claude/rules/`）

| 檔案 | 載入方式 | 涵蓋 |
| :--- | :--- | :--- |
| `model-dispatch.md` | **常載** | 調度守則：指揮官不下場、派工三件套、model enum、升降級、驗證不自驗 |
| `judgment-rubrics.md` | **常載** | 判斷力 rubric：何時升級/算完成/該問使用者/方向錯；Windows shell 與編碼 |
| `workflow.md` | **常載** | Spectra 流程與 CLI 陷阱、登入重導向、套件管理禁令（yarn/uv） |
| `components.md` | paths: `src/**`（ts/tsx） | 元件上限、Supabase client 三選一、紅漲綠跌、`/cases` 排序、UI 風格 |
| `database.md` | paths: `src/**`（ts/tsx）, `supabase/**` | RLS、里程碑 vs 任務、E2EE、Todo 雙軌同步、Schema 流程、軟刪除 |
| `etf-pipeline.md` | paths: `ETF/**`, 投資模組 | 步驟錯誤處理、日期規則、diff_shares、買進模式、量化策略架構 |
| `dark-mode.md` | paths: `src/**`（tsx/css） | `!important` 覆蓋問題與正確深色模式做法 |
| `ai.md` | paths: `src/lib/ai/**`, actions | Gemini fallback 鏈、`ALLOWED_EMAIL` 閘門 |
| `indexes.md` | paths: `src/**` | 路由 / Services / Repositories / Hooks / 工具庫完整索引 |
| `line-bot.md` | paths: LINE 相關檔 | Webhook 三層架構、簽章驗證、公開路由勿加 Auth |
| `ci-cd.md` | paths: `.github/workflows/**` | 排程、Secrets、gitlink 陷阱、self-hosted runner |

## 治理與參考（`.claude/governance/`，on-demand，用時才 Read）

| 觸發時機 | Read 此檔 |
| :--- | :--- |
| **要派 subagent** | `delegation-templates.md`（搜尋/實作/重構/研究/審查範本） |
| **要新增/修改治理檔或 CLAUDE.md/rules** | `maintenance-protocol.md`（可自改 vs 先問、行數上限） |
| 想了解本 harness 的 token/失焦/出錯弱點 | `harness-diagnosis.md` |
| 新 session 想了解此環境注意事項 | `letter-to-future-session.md` |
| 環境變數清單、完整目錄結構、套件細節 | `project-reference.md` |

## 功能變更流程

**所有功能開發 / 修改必須走 Spectra（SDD）**，不使用 `/plan`（見頂部 Spectra Instructions 與 `rules/workflow.md`，含 CLI 陷阱）。openspec 目錄名沿用但指令一律走 Spectra。
