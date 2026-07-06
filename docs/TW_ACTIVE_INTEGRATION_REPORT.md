# TW_Active_Tracker × tw-active 整合狀態報告

> 產出日期：2026-07-06
> 比對對象：`C:\Users\user\Documents\GitHub\TW_Active_Tracker`（Vue 靜態站＋24 支主動 ETF 追蹤）、`C:\Users\user\Documents\GitHub\tw-active`（主動 ETF 機制研究知識庫＋資料工具鏈）
> 比對基準：本專案 `ETF/` pipeline（35 steps）＋ `src/app/investment/`（19 頁）＋ LINE 訊號站

---

## TL;DR

1. **tw-active 的核心已整合完畢**：`openspec/changes/etf-upgrade-tw-active`（72/77 任務）與 `integrate-tw-active-research-tools`（38/38 任務）兩個 change 已把官網 API 爬蟲、AUM 序列、資金流、frontrunning、Active Share、隱成本、配對實證等全部落地，**只差收尾驗證與歸檔**。
2. **TW_Active_Tracker 的 ETF 主線也已整合**（且本專案 26 支 > 它的 24 支），但它的「**市場籌碼層**」（期貨籌碼、融資融券、雙法人同買）與「**推播互動層**」（LINE 關鍵字問答、圖文選單、Telegram/Discord、事件提醒）**大多未整合**。
3. 最有價值的未整合缺口是 **SITCA 經理人共同基金月報/季報資料**——本專案現有的「跨產品加碼」訊號只是用 ETF 資料近似（[signal_detect_step.py:164](../ETF/pipeline/steps/signal_detect_step.py#L164)），tw-active 原版的「經理人雙軌落差」（同一經理人的共同基金 vs ETF 持股比對）需要這份資料才成立。

---

## 一、本專案現況（比對基準）

- **Pipeline**：35 steps — 爬蟲（official_api 22 支 + pocket + 復華 Excel）→ diff → 快照 → 大戶籌碼 → 比重史 → AUM → 族群強弱 → 8 種量化策略 → 共識/分歧 → 資金流 → 進階訊號 → 7 種買進模式 → 損益 → frontrunning → 隱成本 → 配對 → Active Share → 新聞 → 投信買超 → treemap → 騰落 → 散戶籌碼（集保）→ LINE 通知
- **ETF 覆蓋**：26 支（前端 `etfRegistry.ts` 與 Python `etf_registry.py` 完全一致，含 3 支 D 類債券型）
- **前端**：19 條 `/investment/*` 路由、13 個 API routes、8 個 Server Actions
- **LINE**：訊號站 Bot（每日 Carousel、AI 報告、雙向聊天轉發、`/list`）
- **CI**：5 個排程 workflow（daily/financials/equity/weekly/factor-ic）

---

## 二、TW_Active_Tracker 功能比對

| # | 功能 | 狀態 | 說明 |
| --- | --- | --- | --- |
| 1 | 24 支主動 ETF 爬蟲（13 家發行商適配層） | ✅ 已整合 | 本專案 26 支、`official_api_scraper.py` 覆蓋更廣 |
| 2 | 持股 Diff 引擎（增/減/加碼/減碼） | ✅ 已整合 | `diff_compute_step`（IN/OUT/BUY/SELL） |
| 3 | ETF 重疊持股分析 | ✅ 已整合 | `overlap_compute_step` + `/investment/consensus` |
| 3b | **ETF 曝險風控門檻**（單股 10%、警戒 8%、總曝險 20%/25%） | ❌ 未整合 | 小而美的 quick win，可加進 signal 層 |
| 4 | **高股息 ETF 換股雷達**（TWSE ETFWeekly 動態清單、雙視角） | ❌ 未整合 | 擴 universe 到非主動 ETF，屬定位延伸 |
| 5 | 大盤總覽/個股行情/技術分析 | 🔶 部分 | treemap/breadth/bare-K/OHLCV 已有；**K 線型態偵測、量能品質、流動性分級、同業評價、外資目標價、訊號信心**未整合 |
| 6 | **期貨籌碼**（TAIFEX 三大法人期貨部位、小台/微台） | ❌ 未整合 | 本專案的 `retail_sentiment_step` 是集保股權分散，非期貨 |
| 7 | 三大法人籌碼（連買、**雙法人同買**、法人分歧） | 🔶 部分 | 投信買超（`fund_momentum_step`）已有；外資、雙法人同買/分歧未整合 |
| 8 | 集保股權分散／**融資融券** | 🔶 部分 | 集保已整合（`shareholder_signal`、equity 頁）；融資融券（TWSE MI_MARGN）未整合 |
| 9 | 財報/月營收/處置注意股 | ✅ 已整合 | revenue-lab、`disposal_detect_step`、financials CI |
| 10 | 新聞/題材雷達＋輪動歷史 | ✅ 大致整合 | news steps、topics、sector_strength 覆蓋 |
| 11 | 選股雷達/起漲卡位/隔日觀察清單/**券商分點勝率雷達** | 🔶 部分 | 8 種策略訊號 + watch-list + broker 資料已有；「起漲卡位」「分點勝率統計」「隔日觀察清單自動產生」未整合 |
| 12 | Vue 前端 18+ 頁 | N/A | 本專案有自己的 Next.js 頁面，不搬 |
| 13 | **LINE 關鍵字問答**（4 碼查個股、盤勢/選股/題材路由、Flex 卡片） | 🔶 部分 | 已有雙向聊天轉發＋`/list`；關鍵字查詢路由與 Flex 卡片未整合 |
| 14 | **LINE 圖文選單** | ❌ 未整合 | |
| 15 | **Telegram/Discord 多通路推播＋收盤摘要＋財報/法說事件提醒** | ❌ 未整合 | 本專案有 LINE AI 報告，但無多通路、無事件提醒 |
| 16 | GitHub Pages/Cloudflare Workers 部署 | N/A | 架構不同（Vercel + GitHub Actions） |

## 三、tw-active 功能比對

| # | 功能 | 狀態 | 說明 |
| --- | --- | --- | --- |
| 1 | etfdaily 官網直取爬蟲（6 家投信） | ✅ 已整合 | 即 `etf-upgrade-tw-active` 的 `official_api_scraper.py` 來源 |
| 2 | 持股共識圈（site/preview/etf） | ✅ 已整合 | `/investment/consensus` |
| 3 | 跨 ETF 資金流（preview_flow） | ✅ 已整合 | `flow_compute_step` + `etf_flow_daily` |
| 4 | frontrunning／Active Share／隱成本／配對實證 | ✅ 已整合 | `integrate-tw-active-research-tools`（38/38 完成，待歸檔） |
| 5 | AUM 序列＋申購占成長比 | ✅ 已整合 | `aum_sync_step` + `etf_aum_series` |
| 5b | **AUM 成長三分解**（selection / timing / scale，preview_scale「自肥」儀表板） | 🔶 部分 | inflow_share_of_growth 已有；三分解未做 |
| 6 | **SITCA 經理人月報 Top10／季報 ≥1%**（managerwatch） | ❌ 未整合 | 經理人「雙軌」比對的唯一真資料來源 |
| 7 | **MOPS 歷史月報 Top5**（mopsetf，補 SITCA bug） | ❌ 未整合 | 同上配套 |
| 8 | 9 種經理人策略訊號 | 🔶 部分 | 3–5 種已用 **ETF-only 資料近似**（`signal_detect_step`）；需要基金資料的「真雙軌落差、季報→月報晉升、季度出場」未整合 |
| 9 | **配息記錄／折溢價（NAV vs 收盤）日序列** | ❌ 未整合 | 主動 ETF 監控的基本面板缺塊 |
| 10 | twquote（定期定額排行、外資持股 Top20） | 🔶 部分 | 行情/法人另有來源；定期定額排行、外資 Top20 未整合 |
| 11 | FundClear 公開說明書 PDF 工具 | ❌ 未整合 | 研究性質，建議**不整合**（用時手動查即可） |
| 12 | wiki 知識庫／Threads 發文／agent memory | N/A | 內容型資產，非系統功能，**不整合** |
| 13 | 經理人頁自動渲染（peoplefuse） | ❌ 未整合 | 依賴 #6 的資料，可併入經理人維度規劃 |

---

## 四、股票模組改進建議（不分整合，現況就該做）

1. **收尾並歸檔兩個幾乎完成的 change**：`etf-upgrade-tw-active` 剩 5 個任務（backfill 數字驗證、上線三頁驗證、submodule pin、ETF/CLAUDE.md 補述、FinLab 配額確認）；`integrate-tw-active-research-tools` 已 38/38，直接走 `/spectra-archive`。**這是第一優先**——不歸檔，delta specs 就進不了主 spec。
2. **openspec/changes 積壓清理**：目前 60+ 個 change 目錄，大量已完成未歸檔，會讓 `spectra list` 與 spec 真實狀態脫節。
3. **文件過時**：`ETF/CLAUDE.md` 仍寫「16 支」，實際 26 支。
4. **已知資料缺口**：00998A/00983A 國外持股 Pocket 不收錄（待官方 API）；D 類債券型 3 支的 AUM 欄位僅 3 家投信有驗證來源。
5. **訊號誠實度**：`multi_fund_consensus`/`cross_product_accumulation` 名稱暗示「基金」維度，實際只有 ETF 資料——若不補 SITCA 資料（見規格 A），建議至少在前端註明口徑，避免誤導自己。

---

## 五、未整合部分：規格路線圖（建議優先序）

| 代號 | 主題 | 內容摘要 | 價值 | 工程量 |
| --- | --- | --- | --- | --- |
| **A** | 經理人雙軌資料（tw-active #6/#7/#8/#13） | SITCA IN2629/IN2630 + MOPS t78sb39_q3 爬蟲 → `fund_holdings_monthly/quarterly` 表 → 升級訊號為真雙軌（雙軌落差、季報→月報晉升、季度出場）→ 經理人視角前端 | ★★★ 唯一能回答「經理人私房菜」的資料 | 中 |
| **B** | ETF 市場機制面板（tw-active #5b/#9） | 折溢價/NAV 日序列、配息記錄、AUM 成長三分解（selection/timing/scale） | ★★☆ 監控完整度 | 小–中 |
| **C** | 市場籌碼儀表板（Tracker #6/#7/#8） | TAIFEX 期貨三大法人＋小台/微台散戶多空、融資融券（MI_MARGN）、雙法人同買/分歧個股清單 | ★★☆ 大盤擇時輔助 | 中 |
| **D** | LINE Bot 互動升級（Tracker #13/#14/#15） | 4 碼查個股 Flex 卡片、關鍵字路由（盤勢/ETF/訊號）、圖文選單；（選配）Telegram/Discord 收盤摘要與財報/法說事件提醒 | ★★☆ 使用體驗 | 中 |
| **E** | 高股息 ETF 換股雷達（Tracker #4） | TWSE ETFWeekly 動態清單＋換股雷達雙視角 | ★☆☆ 定位延伸 | 中 |
| **F** | 個股技術增強包（Tracker #5） | K 線型態偵測、量能品質、流動性分級、訊號信心 | ★☆☆ 錦上添花 | 中 |
| — | 曝險風控門檻（Tracker #3b） | 4 個常數門檻的告警訊號 | quick win | 極小 |
| ✗ | 不整合 | wiki 知識庫、Threads、FundClear PDF、Vue 前端、Cloudflare 部署、國際盤儀表板 | 性質不合或已有等價 | — |

> 每一項規格化後走 `/spectra-propose` 建立獨立 change（符合「小 chunk 累積」工作哲學），不做大一統 change。

### 已建立的規格（2026-07-06，均已 park）

- **A → `manager-fund-dual-track`**：SITCA/MOPS 基金持股同步（4 表）＋ 6 種真雙軌訊號 ＋ `/investment/manager` 經理人視角頁；月頻獨立 CI，不進每日 pipeline
- **B → `etf-market-mechanics`**：折溢價日序列（NAV 缺不估計）＋ 配息記錄（含來源驗證 spike）＋ AUM 成長拆解（申購 vs 市值貢獻）；深潛頁新增「市場機制」Tab
- **C → `market-chips-dashboard`**：TAIFEX 期貨籌碼＋小台/微台散戶多空比、融資融券、雙法人同買/連買/分歧訊號（與 ETF 加碼交叉標記）＋ `/investment/market-chips` 頁；全走免費公開端點不吃 FinLab 配額

執行方式：`/spectra-apply <change-name>`（會自動 unpark）。D（LINE 互動）、E（高股息雷達）、F（技術增強包）尚未規格化，需要時再提。
