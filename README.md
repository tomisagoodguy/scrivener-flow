# Scrivener Flow - 專業代書案件管理系統

Scrivener Flow 是一套面向台灣代書（地政士）的不動產案件管理系統。核心命題：把簽約→用印→完稅→代償→交屋的整個作業流程，從 Excel + 便利貼轉移到一個具備即時同步、自動提醒、投資組合追蹤與 AI 輔助的 Web App。

部署目標：Vercel (`scrivener-flow.vercel.app`)

---

## 核心功能

### 案件管理

- **五階段 Pipeline 戰情室**：簽、印、稅、過、交，動態圓餅圖一鍵篩選
- **里程碑 vs 任務**：里程碑為合約法定事實（唯讀），系統在里程碑前 3–5 天自動生成提醒任務
- **財務自動化**：土地增值稅、契稅限繳日期監控；支援專業輸入縮寫（`5` → `50,000`）
- **Excel 匯出 / Word 產表**：一鍵報表或填入合約模板

### 時程總覽

- **今日焦點**：逾期警示、近期推播、今日任務、明日預告
- **智能推播**：約客提前 3 天、稅單限繳提前 5 天
- **跨裝置即時同步**：Supabase Realtime 訂閱，免手動重整

### 投資儀表板

追蹤三支主動式 ETF（00980A 野村智慧優選 / 00981A 主動統一台股增長 / 00991A 復華未來50）：

- 持股明細：現價、漲跌、成交額、波動率、YoY/MoM 營收、量化篩選（M·T·R）
- Diff 異動紀錄：IN/OUT/BUY/SELL 變化追蹤
- 三 ETF 對比分析、選股中心（StockPickerHub）
- 個股詳情頁：K 線圖、法人籌碼、Revenue Heatmap
- Python FinLab 每日 22:00（UTC 14:00）自動同步，Gemini AI 產生報告並透過 LINE 發送

### 其他

- **知識庫**：Tiptap 富文字編輯器，團隊共用
- **特約條款**：基本特約 + 自訂特約管理
- **稅費試算**：內建印花稅率、地價稅層距計算
- **代償管理**：銀行聯絡、代償步驟追蹤
- **E2EE 私密備註**：AES-256-GCM 加密，90 天 Key 輪替

---

## 技術堆疊

| 技術 | 版本 | 用途 |
| :--- | :--- | :--- |
| Next.js | 16.1.1 | App Router、Server Components、Server Actions |
| React | 19.2.3 | UI 元件樹 |
| TypeScript | ^5 | 嚴格型別 |
| Tailwind CSS | ^4 | Glassmorphism 視覺風格 |
| Supabase JS | ^2.89.0 | PostgreSQL、Auth、Realtime |
| Zod | ^4.3.5 | Schema 驗證 |
| Framer Motion | ^12.26.2 | 動畫 |
| Lightweight Charts | ^5.1.0 | K 線圖 |
| Tiptap | ^3.17.0 | 富文字編輯器 |
| Python | 3.13 | ETF 爬蟲、FinLab 量化分析 |
| uv | — | Python 套件管理 |

---

## 快速啟動

```bash
# 安裝依賴
yarn install

# 設定環境變數（建立 .env.local，參考下方說明）

# 開發模式
yarn dev

# 建置
yarn build
```

### 必要環境變數（.env.local）

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_GEMINI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
ENCRYPTION_MASTER_KEY=
FINLAB_API_KEY=
DATABASE_URL=
```

### Python ETF Pipeline

```bash
uv run python ETF/main.py --days 30   # 手動執行（同步最近 30 天）
uv run python ETF/main.py --dry-run   # 僅爬取，不寫 DB
uv run python ETF/daily_ai_report.py  # 單獨產生 AI 報告
```

---

## 開發規範

- **套件管理**：前端嚴格使用 `yarn`（禁止 `npm install`）；Python 使用 `uv`
- **DB Schema 變更**：新增 `.sql` 至 `supabase/migrations/`，不使用 Prisma migrate 或 Supabase UI 手動操作
- **功能開發流程**：所有功能變更走 OpenSpec 流程（`openspec/changes/<name>/`），artifact 順序為 proposal → design → specs → tasks
- **資料突變**：優先使用 Server Actions，REST API Route 僅用於 Webhooks 與第三方整合

---

**Scrivener Flow** - 讓代書作業更精確、更優雅。
