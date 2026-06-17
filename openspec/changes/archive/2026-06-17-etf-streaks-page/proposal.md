## Why

代書投資模組已能看「當日異動」「跨 ETF 共識」「5 日趨勢」,但缺少「同一檔被連續加碼/減碼了幾個交易日」這個維度。連續同向是判斷主動 ETF 持續性買賣意圖的關鍵訊號(類似 etfedge.xyz 的「連續加減碼」分析)。經真實 `etf_diff_logs` 資料驗證,該維度完全可算,且資料品質足以支撐(00981A 達 63 個交易日、每日更新)。

## What Changes

- 新增 `/investment/streaks` 頁面,呈現四個視角:個股被連買、個股被連賣、ETF 連買的個股、ETF 連賣的個股。
- 新增 Server Action `getStreaks`,在 Server 端以「ETF 回報日序號」做 gaps-and-islands 聚合,計算每個 `(etf_code, stock_code)` 目前進行中的連續同向天數、淨股數、起迄日。
- 連續定義以**交易日軸**為準:停手(該回報日無異動)或反向即斷,**不可**數連續 diff 筆數(實測會把橫跨 4 個月的稀疏異動灌水成「連 23 日」)。
- 方向以 `diff_shares` 正負判定,避開 BUY/IN/SELL/TRIM/OUT/CLOSE 六種 label 的歧義。
- 每筆 streak 附帶推進速度(平均每回報日 `diff_shares`)與資料頻率標註(pocket 來源回報日稀疏,需提示「連 N 個回報日」而非交易日)。
- 漲跌色彩遵循台股慣例(連買=紅 `text-rose-600`、連賣=綠 `text-emerald-600`)。
- 在投資儀表板入口 `src/app/investment/page.tsx` 與側邊導覽加入 streaks 頁面連結。

## Non-Goals

- 不做歷史 streak 回放或時間軸動畫,只呈現「目前進行中」與最近結束的 streak 榜。
- 不新增 Python pipeline 步驟或資料表;完全以現有 `etf_diff_logs` 為來源,於 Server 端即時聚合。
- 不做國外持股(00983A 等)的中文名稱 backfill(已知 Pocket 不收錄,屬另一既有問題),僅在 UI 容忍亂碼/英文名顯示。
- 不做 streak 的前瞻報酬回測(那是 `etf_buying_patterns` 的職責)。

## Capabilities

### New Capabilities

- `etf-streak-analysis`: 以交易日軸計算 ETF 對個股的連續同向加減碼,並於前端四視角呈現。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `etf-streak-analysis`
- Affected code:
  - New:
    - src/app/investment/streaks/page.tsx
    - src/app/actions/getStreaks.ts
    - src/lib/investment/streakUtils.ts
  - Modified:
    - src/app/investment/page.tsx
    - src/components/layout/SideNav.tsx
  - Removed: (none)
