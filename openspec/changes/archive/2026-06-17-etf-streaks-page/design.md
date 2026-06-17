## Context

投資模組已有當日異動(`etf_diff_logs`)、跨 ETF 共識(`etf_stock_overlap`)、5 日趨勢等視角,但缺少「連續同向加減碼天數」。`etf_diff_logs` 每筆記錄一次持股異動,欄位含 `etf_code`、`stock_code`、`stock_name`、`data_date`、`diff_shares`(原始股數,可正可負)、`diff_weight`、`curr_weight`、`change_type`。真實資料覆蓋 22 支 ETF;00981A 每交易日更新(63 個交易日),pocket 來源 ETF 僅公告日更新。

本設計不新增資料表、不動 Python pipeline,純粹在 Next.js Server 端即時聚合既有 `etf_diff_logs`。

## Goals / Non-Goals

**Goals:**

- 計算每個 `(etf_code, stock_code)` 目前進行中的連續同向(全買進 / 全賣出)天數。
- 提供四視角:個股被連買、個股被連賣、ETF 連買的個股、ETF 連賣的個股。
- 在 Server 端聚合,瀏覽器只收到聚合後的榜單,不收原始事件。
- 對 pocket 稀疏來源做資料頻率標註,避免誤導。

**Non-Goals:**

- 不做歷史 streak 回放 / 動畫。
- 不做前瞻報酬回測(屬 `etf_buying_patterns`)。
- 不做國外持股中文名稱 backfill。
- 不新增 DB 資料表或 pipeline 步驟。

## Decisions

### 決策 1:連續定義以「ETF 回報日序號」為軸,停手或反向即斷

**選用**:對每支 ETF 取其所有 `DISTINCT data_date` 排序成軸並編序號(dseq);個股的每筆異動掛上該軸序號;用 gaps-and-islands(`dseq - row_number()` 分群)計算連續同向段。某回報日該股無異動(未出現)或方向相反 → 序號不連續 → streak 斷。

**否決**:直接數「連續同向的 diff 筆數」。實測 00981A 3665 在此法下被算成「連 23 日」卻橫跨 2026-02-03~2026-06-12(約 90 個交易日),因為中間數十個無異動日被忽略。此法會嚴重灌水,不可採用。

### 決策 2:方向以 `diff_shares` 正負判定,不用 `change_type`

`change_type` 有 BUY/IN/SELL/TRIM/OUT/CLOSE 六種,語意分散且買賣歸類易錯。`diff_shares > 0` 即買進、`< 0` 即賣出,單一可靠來源。`diff_shares = 0` 的列排除。

### 決策 3:「目前進行中」= streak 的最後序號等於該 ETF 軸的最新序號

只有當某 `(etf_code, stock_code)` 的最近一段 streak 結束在該 ETF 最新回報日,才算「仍在進行」。歷史上已斷的長 streak 不列入進行中榜(可另列「最近結束」次要榜,屬選配)。

### 決策 4:Server Action 一次查詢全聚合,前端純展示

沿用 `getBuyingPatternStats.ts` 模式:單一 SQL(CTE: days → ev → seq → runs → current)在 Server 端跑完,回傳結構化榜單。避免把原始事件送到瀏覽器。Supabase client 用 `src/lib/supabase/server.ts`(受 RLS;投資資料為公開讀)。

## Implementation Contract

**Behavior:**
使用者開啟 `/investment/streaks` 看到四個榜單區塊。每列顯示:ETF 代碼、股票代碼/名稱、連續天數、淨股數(轉張:`diff_shares/1000`)、起迄日、平均每回報日推進量。連買區塊用紅色(`text-rose-600 dark:text-rose-400`),連賣用綠色(`text-emerald-600 dark:text-emerald-400`)。pocket 來源 ETF 的列標註「N 個回報日」字樣。

**Interface / data shape:**

- `getStreaks()` Server Action(`src/app/actions/getStreaks.ts`)回傳:
  ```ts
  interface StreakRow {
    etf_code: string;
    stock_code: string;
    stock_name: string | null;
    direction: 'buy' | 'sell';
    streak_days: number;        // 連續回報日數
    net_shares: number;          // 區間淨股數(原始股,正負)
    start_date: string;          // YYYY-MM-DD
    end_date: string;
    avg_shares_per_day: number;  // net_shares / streak_days,推進速度
    is_sparse_source: boolean;   // pocket 來源 → true
  }
  interface StreaksResult {
    stockBuy: StreakRow[];    // 個股被連買(可跨 ETF,取該股最長進行中)
    stockSell: StreakRow[];
    etfBuy: StreakRow[];      // ETF 連買個股(per etf_code,streak_days 排序)
    etfSell: StreakRow[];
    asOfDate: string;         // 全局最新 data_date
  }
  ```
- `src/lib/investment/streakUtils.ts` 匯出 `StreakRow`、`StreaksResult` 型別與 `MIN_STREAK_DAYS = 3` 常數、`computeAvgPace()` 與 pocket 來源判定(讀 `etfRegistry.ts` 的 `source` 欄位)。
- SQL 以決策 1 的 gaps-and-islands CTE 為準,`WHERE diff_shares <> 0`,只取 `streak_days >= MIN_STREAK_DAYS` 且為進行中段。

**Failure modes:**

- 無資料 / 查詢失敗 → Server Action 回傳空榜單(各陣列為 `[]`)與 `asOfDate` 空字串,頁面顯示「目前無進行中的連續加減碼」,不拋錯。
- `stock_name` 為 null 或亂碼(國外持股)→ 顯示 `stock_code` 為主,名稱原樣顯示,不額外處理。
- `diff_shares` 為 PostgreSQL bigint → JS 端以 Number 處理(台股股數遠小於 2^53,安全)。

**Acceptance criteria:**

- 進行中連買/連賣榜的 `streak_days` 與手動 gaps-and-islands SQL 結果一致(已用 `/tmp/streaks4.py` 驗證:連減最長 00993A 頎邦 6 日、連加 00993A 凱基金控 4 日)。
- 對 00981A 3665 不會出現橫跨數月的「連 23 日」(驗證決策 1 生效)。
- 連買列為紅、連賣列為綠(台股慣例)。
- pocket 來源列帶 `is_sparse_source = true` 並在 UI 標註。
- `yarn build` 通過、`yarn lint` 無新錯誤。

**Scope boundaries:**

- 範圍內:新增 streaks 頁面、`getStreaks` Server Action、`streakUtils` 型別/工具、投資入口與 SideNav 連結。
- 範圍外:Python pipeline、新資料表、前瞻報酬、名稱 backfill、歷史回放。

## Risks / Trade-offs

- **單一大 SQL 效能**:`etf_diff_logs` 目前數千列,窗口函數聚合在 Server 端可接受;若未來資料量大增,可加 `data_date` 範圍下限(如近 120 日)。本期不預先優化。
- **pocket 稀疏來源語意**:即使用回報日軸,pocket ETF 的「連 N 日」實為「連 N 個回報日」,以 `is_sparse_source` 旗標 + UI 文案緩解,不在演算法層特殊處理。
- **跨 ETF 個股視角的取捨**:個股被連買視角下,同一股可能被多支 ETF 同時連買;本期每股取「最長的進行中 streak」代表,並可附帶同向 ETF 數。更複雜的多 ETF 合併推進留待後續。
