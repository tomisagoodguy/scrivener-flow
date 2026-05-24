## Context

策略選股頁 (`/investment/strategy`) 目前只有 Server Component + `StrategySignalCard` 卡片網格。族群分析相關資料已在 `sector_strength` / `sector_strength_stocks` 兩張 Supabase 視圖中，且 `getSectorStrength.ts` 的 `getAllStrategyHitStocks()` 已能回傳帶有 `ret_1d/5d/20d, amount, category` 的策略命中股清單。`SectorHeatmap.tsx` 已實作完整 Treemap 演算法與台股色彩慣例，可直接複用核心邏輯。

## Goals / Non-Goals

**Goals:**
- 在策略頁 上方加入可折疊的分析面板（預設展開）
- 熱力圖：所有策略股按族群分組，大小=成交金額，色=漲跌幅，支援日/周/月切換
- 族群排行：策略股涉及的族群漲跌幅橫向 Bar（日/周/月切換）
- 成交金額排行：Top 15 策略股成交金額列表（日/周/月切換）

**Non-Goals:**
- 不新增 DB Migration（現有資料已足夠）
- 不做跨日歷史趨勢圖（只用現有 ret_1d/5d/20d 快照）
- 不做個股詳情 drill-down（點擊跳 `/investment/stock/[code]`，不在此頁展開）

## Decisions

### D1：Server Action 整合 vs 分開呼叫
**選擇**：新增 `getStrategyAnalytics.ts`，在 Server 端一次整合 `getAllStrategyHitStocks` + `getSectorStrength`，回傳給 `strategy/page.tsx`。  
**理由**：避免 Client Component 多次往返，維持 Server Component 資料取得模式；且兩個資料來源都已有 cache，再包一層不增加 DB 壓力。

### D2：熱力圖元件複用策略
**選擇**：不直接 import `SectorHeatmap.tsx`（它的 props 綁定族群資料結構），而是把 `blockColor`、`textColor`、`computeTreemap` 等核心函式抽到 `src/lib/investment/treemapUtils.ts`，讓兩個熱力圖元件共用。  
**理由**：避免 SectorHeatmap 被改造成過度通用的元件（違反單一責任），也避免重複實作色彩計算。

### D3：Client Component 邊界
**選擇**：`StrategyAnalyticsPanel.tsx` 為 Client Component（需要 tab 切換狀態），接收 server 傳下的 props。內部三個子元件也是 Client Component（canvas/SVG 操作）。  
**理由**：strategy/page.tsx 保持 Server Component，只額外傳一個 `analyticsData` prop 給面板，不改動現有 `StrategySignalCard` 渲染邏輯。

### D4：族群排行資料來源
**選擇**：用策略股的 `category` 欄位分組，計算各族群的加權平均漲跌幅（以成交金額為權重），而非直接用 `sector_strength` 的 `ret_1d`。  
**理由**：`sector_strength` 含全市場所有股票，而分析面板應聚焦「策略命中股所在的族群表現」，語義更精準。若族群無成交金額資料，退回簡單平均。

## Risks / Trade-offs

- **[Risk] `sector_strength_stocks` 資料量大**：全市場約 1700+ 股，但 `getAllStrategyHitStocks` 只取 `is_strategy_hit=true`，預期 50–150 筆，無效能問題。
- **[Risk] Canvas 熱力圖在小螢幕擠壓**：設定最小高度 240px，小於此時改顯示純列表 fallback。
- **[Trade-off] 不用 Recharts**：Treemap 用自製 Canvas 演算法（與 SectorHeatmap 一致），避免引入新依賴；Bar Chart 用純 CSS（已有 `sectors` 頁先例），保持套件一致性。

## Migration Plan

1. 抽取 `treemapUtils.ts` 共用函式
2. 新增 `getStrategyAnalytics.ts` Server Action
3. 實作三個子元件
4. 整合進 `strategy/page.tsx`
5. 本地驗證後 commit + push
