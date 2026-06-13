## Context

`/investment` 頁目前以 `getAllHoldings()` 取得**全局** `canonicalDate`（所有 ETF 統一用最新一天），但各 ETF 的官方揭露頻率不同（00981A 每日、Pocket.tw 來源數天一次），總覽卡片若沿用全局日期，落後的 ETF 會顯示空資料。NAV/AUM 已存在 `etf_aum_series`（`nav`、`aum_100m`），異動已存在 `etf_diff_logs`（`change_type` ∈ IN/OUT/BUY/SELL）。頁面為 Server Component，`revalidate = 3600`。

## Goals / Non-Goals

**Goals:**

- 一眼掌握全部 26 支 ETF 的最新揭露狀態與當日異動規模
- 單次 Server 端聚合查詢，不增加 Client 端請求
- 落後揭露的 ETF 仍顯示其最後一次揭露的完整資料

**Non-Goals:**

- 不新增資料表、不改 Python pipeline（NAV/AUM/diff 既有資料已足夠）
- 不做卡片內的迷你走勢圖（TW_Active_Tracker 也沒有，留待後續）
- 不取代既有「深潛明細」pill 連結列（兩者並存，pill 列維持快速跳轉用途）
- 不處理 NAV 缺值的回補（`etf_aum_series` 無資料的 ETF 顯示「—」）

## Decisions

### 揭露日採用各 ETF 自己的最新 data_date

每支 ETF 各自取 `etf_holdings_snapshot` 中該 `etf_code` 的最新 `data_date` 作為揭露日，而非沿用 `getAllHoldings()` 的全局 canonicalDate。理由：總覽卡片的核心價值正是呈現「哪些 ETF 今天有更新、哪些落後」；用全局日期會讓落後的 ETF 持股檔數變 0。已落後（揭露日 < 全部 ETF 中最新日期）的卡片以灰階日期標示。替代方案（全局日期 + 隱藏落後 ETF）被否決，因為落後是 Pocket.tw 來源的正常行為（見 etf-pipeline 規則），不應隱藏。

### 新增 etfOverviewStats 聚合函式（單一入口、四段查詢）

新增 `src/lib/investment/etfOverviewStats.ts`，匯出 `getEtfOverviewStats(): Promise<EtfOverviewStat[]>`，內部以 `Promise.all` 併發查詢後在 Server 端 reduce：

1. 各 ETF 最新揭露日 + 持股檔數：**逐 ETF 小查詢**（最新日期 limit 1 + `count: 'exact', head: true` 計數，不傳輸資料列），沿用 `getAllHoldings()` 的逐 ETF 模式
2. NAV / 規模：查 `etf_aum_series` 各 `etf_code` 最新一筆的 `nav`、`aum_100m`（批次查詢，列數小）
3. 異動 badge：逐 ETF 查 `etf_diff_logs` 該 ETF **自身揭露日當日**的紀錄，按 `change_type` 計數（IN→新增、OUT→刪除、BUY→加碼、SELL→減碼）
4. ETF 中繼資料：直接讀 `ETF_REGISTRY`（名稱、投信、色彩），不查 DB

理由：沿用本頁既有模式（Server Component 內聚合、零 Client 請求）；不建 API Route（符合 components.md 規則）。替代方案（建 Supabase RPC 一次算完）被否決——純讀取聚合無原子性需求，TS 端 reduce 較易測試與調整。

**實作時發現的關鍵約束**：原設計的「批次撈 14 天原始列再分組」不可行——PostgREST 單次查詢預設上限 1000 列，而近 14 天 snapshot 約 8,000 列、diff 約 1,300 列，批次查詢會被**靜默截斷**（部分 ETF 顯示無資料、badge 全 0）。因此改為逐 ETF 小查詢（26 × 3 個輕量請求，`Promise.all` 併發），純函式 `buildOverviewStats()` 改吃逐 ETF 預聚合的 `EtfDailySummary`。

### 卡片元件拆分為 Grid 容器與單卡兩檔

`EtfOverviewGrid.tsx`（容器：排序＝今日有更新者在前、規模次之；響應式 grid `1/2/3` 欄）與 `EtfOverviewCard.tsx`（單卡：純展示、接收單筆 `EtfOverviewStat`）。理由：遵守單一元件 ≤ 150 行規則。卡片整體為 `Link` 導向 `/investment/[etf]`，使用 `.glass-card` 風格。異動 badge 遵循台股色彩慣例：加碼/新增用 `text-rose-600`，減碼/刪除用 `text-emerald-600`。

### 以新分頁整合進 InvestmentTabs

在 `InvestmentTabs.tsx` 新增 `overviewContent` prop 與「ETF 總覽」分頁（置於第一個分頁之前或之後依既有 tab 順序慣例），`page.tsx` 將 `getEtfOverviewStats()` 加入既有 `Promise.all` 批次。理由：不破壞現有頁面結構；替代方案（獨立路由 /investment/overview）被否決，因為入口頁已是彙整定位，多一層路由增加導覽成本。

## Risks / Trade-offs

- [`etf_holdings_snapshot` 全表掃 26 支 ETF 的最新日期可能較慢] → 查詢僅 select `etf_code, data_date` 並以近 N 天（如 14 天）為下界過濾，Server 端分組；頁面本身有 `revalidate = 3600` 快取
- [部分 ETF 在 `etf_aum_series` 無資料（NAV/規模缺值）] → 卡片顯示「—」，不阻擋渲染；不在本變更內回補資料
- [`etf_diff_logs` 當日無紀錄（持股零異動或來源未更新）] → 四個 badge 顯示 0，與 TW_Active_Tracker 行為一致
