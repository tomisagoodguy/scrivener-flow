## Context

現有共識相關功能皆為「單日視角」：`/investment/consensus` 讀 `etf_stock_overlap` / `etf_stock_divergence`（OverlapComputeStep 每日預計算），`/investment/consensus-signal` 讀 FinLab 投信買賣超動能。`etf_diff_logs` 已保留每檔 ETF × 個股 × 日的異動事件（`change_type`、`diff_shares`、`diff_weight`，180 天），`stock_prices_daily` 保留 OHLCV 260 天，足以在查詢時做 N 日窗口聚合，無需新資料表。

## Goals / Non-Goals

**Goals:**

- 偵測「過去 N 個交易日內被 M 家以上主動式 ETF 同步加碼」的個股，以卡片牆呈現
- 每檔個股提供：窗口加碼股數、合計增幅、吸量比、吸量趨勢、近 N 日 mini K 線+量、各 ETF 加碼明細
- 零 Python pipeline 變更、零 DB schema 變更

**Non-Goals:**

- 不做「同步減碼」反向偵測（未來可延伸）
- 不做歷史回測 / 前瞻報酬統計（`/investment/buying-patterns` 已涵蓋）
- 不修改既有 `/investment/consensus` 與 `/investment/consensus-signal` 頁面
- 不引入新的 charting 套件

## Decisions

### 獨立頁面 /investment/momentum，而非 consensus 第三個 tab

consensus 頁已有「共識/分歧」兩個 tab，且語義是單日快照；窗口動能有自己的兩個篩選參數（觀察天數 × 最少家數），塞進第三 tab 會讓 URL 參數與快取 key 複雜化。獨立頁面語義清晰，並在投資模組側邊欄新增入口。

### 即時窗口聚合（Server Action + unstable_cache），而非新增 pipeline 步驟與預計算資料表

資料量小：窗口內 `etf_diff_logs` 約 16 ETF × 10 交易日 × 數十筆異動，Server 端 reduce 毫秒級完成。比照 `getBuyingPatternStats.ts` 模式：Server Action 聚合後只回傳聚合結果，不把原始事件送進瀏覽器。以 `unstable_cache`（revalidate 3600，cache key 含 windowDays 與 minEtfCount）避免重複查詢。捨棄預計算方案的原因：每多一組 (N, M) 參數組合就要多算一份，靈活度差且增加 pipeline 維護面。

純聚合邏輯抽至 `src/lib/investment/windowMomentumUtils.ts`（比照 `etfSectorActivityUtils.ts` 慣例）：`'use server'` 檔案的所有 export 必須是 async Server Action，無法 export 同步純函式供 Jest 直接測試，因此 Server Action 僅做查詢與組裝，聚合計算放 lib 層。超過 1000 列的查詢沿用 `getEtfSectorActivity.ts` 的 PAGE_SIZE + range 分頁模式。

### 窗口邊界以全市場交易日定義

從 `market_breadth_daily` 取 `date` 降冪前 N 筆作為窗口交易日集合（該表每交易日恰一列，是全市場交易日曆的天然來源），`etf_diff_logs.data_date` 落在集合內者納入聚合。不用曆日（週末會稀釋窗口），不用單一 ETF 的公告日（Pocket 來源公告稀疏），不用 `stock_prices_daily` distinct `data_date`（PostgREST 不支援 distinct，每日數千列股價會撞 1000 列分頁上限）。

### 同步加碼判定：各 ETF 窗口內淨增持 > 0

每檔 (etf_code, stock_code) 將窗口內所有事件的 `diff_shares` 加總（IN/BUY 為正、OUT/SELL 為負），淨值 > 0 才算該 ETF「加碼」；家數 = 淨增持 ETF 的 distinct count。比「只算 BUY/IN 事件」更穩健——避免同窗口內先買後賣的 ETF 被誤計為加碼。

### 衍生指標計算公式

- 窗口加碼股數 = 淨增持 ETF 的淨 `diff_shares` 加總（單位：股；顯示張時 ÷1000）
- 合計增幅 = 各加碼 ETF 窗口 `diff_weight` 淨加總（pp）；最大單筆 = 窗口內單筆事件 `diff_weight` 最大值
- 吸量比 = 窗口加碼股數 ÷ 該股窗口內 `stock_prices_daily.volume` 加總；顯著性分級：≥3% 顯著、1–3% 中等、<1% 輕微
- 吸量趨勢 = 窗口後半（依交易日切分，奇數窗口後半多一天）加碼股數 vs 前半：後半 > 前半×1.2 → 加速；後半 < 前半×0.8 → 衰退；其餘 → 持平

### Mini K 線+量採 SVG 自繪 Server Component，不用 Lightweight Charts

卡片牆一次渲染 30+ 檔個股、每檔兩張小圖；Lightweight Charts 每 instance 需 client-side canvas 與資料序列化，成本高。N 根 K 棒 + 量柱用純 SVG 在 Server Component 渲染即可，無互動需求。色彩遵循台股慣例：收漲 `fill-rose-500`、收跌 `fill-emerald-500`。

### 篩選參數走 URL searchParams，前端不重新 query

`window`（3/5/10，預設 5）與 `min_count`(2/3/5，預設 2) 放 URL query param，比照 consensus 頁的 `min_etf_count` 模式由 Server 端讀取。`minEtfCount` 過濾在 Server 端聚合後、抓取 OHLCV 前執行，避免為被過濾掉的個股抓股價。

## Risks / Trade-offs

- [Supabase NUMERIC 欄位經 REST 回傳可能為字串] → 聚合前一律 `Number()` 轉型（`diff_shares`、`diff_weight`、`volume`）
- [Pocket 來源 ETF 公告稀疏，窗口內可能完全無事件] → 屬資料來源特性，窗口聚合已是最佳緩解；頁面顯示資料涵蓋區間（窗口起迄日）讓使用者自行判讀
- [個股在窗口內剛上市或 `stock_prices_daily` 無資料，吸量比分母為 0] → 分母為 0 或查無 OHLCV 時吸量比顯示「—」，不顯示 0%
- [unstable_cache 需手動失效時] → 比照專案慣例在 cache key 加版本號
- [etf_diff_logs 僅保留 180 天] → 窗口上限 10 天，遠小於保留期，無風險

## Open Questions

(none)
