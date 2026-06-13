## 1. 資料層：窗口聚合 Server Action（TDD）

- [x] 1.1 先寫測試 `src/__tests__/actions/getWindowMomentum.test.ts`，覆蓋 spec「Window aggregation of multi-ETF accumulation」與「Derived momentum metrics per stock」的核心邏輯：依 design「同步加碼判定：各 ETF 窗口內淨增持 > 0」驗證同窗口先買後賣淨額 ≤ 0 不計入家數（+50000/-60000 → 不計；+70000 淨額 → 計入）；依「衍生指標計算公式」驗證吸量比分母為 0 或無 OHLCV 時回傳 null、吸量趨勢 1.2×/0.8× 邊界（130000/100000 → accelerating、120000/100000 → steady、79000/100000 → decaying）、奇數窗口後半多一天的切分；驗證排序為家數降冪、加碼股數降冪；測試對象為 `src/lib/investment/windowMomentumUtils.ts` 的純函式，比照既有 `getFundMomentumSignals.test.ts` 純函式測試模式
- [x] 1.2 建立 `src/lib/investment/windowMomentumUtils.ts`（純聚合函式）與 `src/app/actions/getWindowMomentum.ts`：採 design「即時窗口聚合（Server Action + unstable_cache），而非新增 pipeline 步驟與預計算資料表」——以「窗口邊界以全市場交易日定義」取 `market_breadth_daily.date` 降冪前 N 筆為窗口；查 `etf_diff_logs` 落在窗口內的事件並依 `(etf_code, stock_code)` 加總淨 `diff_shares`；`minEtfCount` 過濾後才為入選個股抓取窗口 OHLCV；所有 NUMERIC 欄位（`diff_shares`、`diff_weight`、`volume`）以 `Number()` 轉型；`unstable_cache` revalidate 3600、cache key 含 `windowDays` 與 `minEtfCount`；只回傳聚合結果不回傳原始事件；超過 1000 列查詢用 PAGE_SIZE+range 分頁
- [x] 1.3 執行 yarn test -- --testPathPattern=getWindowMomentum 確認 1.1 測試全綠

## 2. UI 元件

- [x] 2.1 [P] 建立 `src/app/investment/momentum/components/MiniKChart.tsx`：實作 spec「Mini candlestick and volume chart per card」，依 design「Mini K 線+量採 SVG 自繪 Server Component，不用 Lightweight Charts」以純 SVG 渲染窗口內日 K（開高低收）與成交量柱；收漲 rose 色系、收跌 emerald 色系（台股紅漲綠跌）；OHLCV 列數少於窗口長度時只畫可用天數不報錯
- [x] 2.2 建立 `src/app/investment/momentum/components/MomentumCard.tsx`：卡片顯示股票代號/名稱（連結 `/investment/stock/<code>`）、家數 badge、窗口漲跌幅（`text-rose-600` 漲 / `text-emerald-600` 跌）、加碼張數（股 ÷1000 四捨五入）、合計增幅、最大單筆增幅、吸量比與顯著性標籤（≥3% 顯著、1–3% 中等、<1% 輕微、null 顯示「—」）、吸量趨勢標籤、各 ETF 加碼 bar（顏色取自 `etfRegistry` getEtfMeta）、窗口起迄日；內嵌 2.1 的 MiniKChart；容器用 `.glass-card`
- [x] 2.3 [P] 建立 `src/app/investment/momentum/components/MomentumFilter.tsx`：依 design「篩選參數走 URL searchParams，前端不重新 query」實作觀察天數（3/5/10）與最少家數（2/3/5）兩組選單，切換時更新 URL query param（比照 consensus 頁 `ConsensusFilter.tsx` 模式，Client Component 以 `<Suspense>` 包裹）

## 3. 頁面與導覽

- [x] 3.1 建立 `src/app/investment/momentum/page.tsx`：實作 spec「Momentum page with URL-driven filters」，依 design「獨立頁面 /investment/momentum，而非 consensus 第三個 tab」建立 Server Component 頁面；從 searchParams 讀 `window`（預設 5）與 `min_count`（預設 2），非法值 fallback 預設；呼叫 `getWindowMomentum` 渲染卡片牆；頁首顯示入選檔數與當前篩選值；空結果時顯示窗口內無同步加碼的空狀態；頁面進場 `animate-fade-in`
- [x] 3.2 在 `src/app/investment/layout.tsx` 側邊欄新增「同步加碼」導覽連結指向 `/investment/momentum`

## 4. 驗證

- [x] 4.1 執行 yarn lint 與 yarn build 確認無 ESLint / TypeScript 錯誤（含 useSearchParams 必須包 Suspense 的靜態 build 檢查）
- [x] 4.2 執行 yarn test 確認全部測試通過（含既有測試不被破壞）
- [x] 4.3 啟動 yarn dev 實際瀏覽 `/investment/momentum`：驗證預設 5 天 × ≥2 家有資料渲染、切換 `?window=10&min_count=3` 重新聚合、mini K 線紅漲綠跌方向正確、個股連結可導向個股頁
