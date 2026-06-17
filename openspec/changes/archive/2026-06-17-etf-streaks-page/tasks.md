## 1. 型別與工具層

- [x] 1.1 [P] 在 src/lib/investment/streakUtils.ts 定義 `StreakRow`、`StreaksResult` 介面(欄位依 design 的 Implementation Contract),匯出常數 `MIN_STREAK_DAYS = 3`
- [x] 1.2 [P] 在 src/lib/investment/streakUtils.ts 實作 `computeAvgPace(netShares, streakDays)` 回傳平均每回報日推進股數,以及 `isSparseSource(etfCode)`(讀 etfRegistry.ts 的 `source === 'pocket'`)

## 2. Server Action 聚合

- [x] 2.1 實作「決策 1:連續定義以「etf 回報日序號」為軸,停手或反向即斷」與「決策 2:方向以 `diff_shares` 正負判定,不用 `change_type`」(Requirement: Trading-Day Consecutive Streak Computation):在 src/app/actions/getStreaks.ts 撰寫 gaps-and-islands SQL(CTE: days 編 dseq → ev 掛序號 → seq 以 `dseq - row_number()` 分群 → runs 聚合 → current 取 last_seq=該 ETF 最新序號),`WHERE diff_shares <> 0`,方向用 `diff_shares` 正負;依「決策 4:server action 一次查詢全聚合,前端純展示」透過 src/lib/supabase/server.ts client 執行
- [x] 2.2 實作「決策 3:「目前進行中」= streak 的最後序號等於該 etf 軸的最新序號」(Requirement: Current-Streak Selection):在 getStreaks.ts 將查詢結果組成四視角:`etfBuy`/`etfSell` 直接 per `(etf_code,stock_code)` 依 `streak_days` 排序;`stockBuy`/`stockSell` 以 `stock_code` 聚合取該股最長進行中 streak;每列填 `avg_shares_per_day`、`is_sparse_source`、`asOfDate`(全局最新 data_date),只回傳目前進行中且 `streak_days >= MIN_STREAK_DAYS`
- [x] 2.3 （Requirement: Empty and Failure Handling） 在 getStreaks.ts 包 try/catch:查詢失敗或無資料時回傳四個空陣列與空 `asOfDate`,不拋錯(catch 變數用 unknown + instanceof Error guard)

## 3. 頁面 UI

- [x] 3.1 （Requirement: Four-Perspective Streak Presentation） 在 src/app/investment/streaks/page.tsx 建立 Server Component,呼叫 getStreaks(),以四個 `.glass-card` 區塊渲染四視角榜單(個股被連買/連賣、ETF 連買/連賣個股)
- [x] 3.2 （Requirement: Taiwan Market Color Convention） 在 page.tsx 套用台股色彩:連買列數值用 `text-rose-600 dark:text-rose-400`,連賣列用 `text-emerald-600 dark:text-emerald-400`;每列顯示連續天數、淨張數(`net_shares/1000`)、起迄日、平均推進量
- [x] 3.3 （Requirement: Sparse-Source Frequency Annotation）（Requirement: Empty and Failure Handling） 在 page.tsx 對 `is_sparse_source` 為 true 的列加註「N 個回報日」提示;四視角皆空時顯示「目前無進行中的連續加減碼」空狀態;頁面加 `animate-fade-in`

## 4. 導覽整合

- [x] 4.1 [P] 在 src/app/investment/page.tsx 投資儀表板入口加入 `/investment/streaks` 連結卡片
- [x] 4.2 [P] 在 src/components/layout/SideNav.tsx 投資區段新增「連續加減碼」導覽項,指向 /investment/streaks

## 5. 驗證

- [x] 5.1 執行 `yarn build` 與 `yarn lint`,確認無新錯誤
- [x] 5.2 手動比對 getStreaks() 輸出與 design 中已驗證的基準(連減最長 00993A 頎邦 6 日、連加 00993A 凱基金控 4 日),並確認 00981A 3665 不再出現橫跨數月的「連 23 日」
