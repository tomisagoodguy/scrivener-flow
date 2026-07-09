## Context

本專案 ETF pipeline 每日抓取 26 支主動 ETF 完整持股（法規強制每日揭露），但同一經理人操盤的「共同基金」只有月揭露（Top 10）與季揭露（≥1%）。tw-active 專案已破解兩條 primary source：SITCA IN2629/IN2630（表單 POST，最新期可查，歷史期 server filter 失效）與 MOPS t78sb39_q3（POST body 帶民國年+月可查歷史，但只有 Top 5）。現有 `ETF/pipeline/steps/signal_detect_step.py` 的 `multi_fund_consensus`／`cross_product_accumulation` 訊號實際只用 ETF 資料近似，名稱與口徑不符。

限制條件：
- Schema 修改只走 `supabase/migrations/*.sql`（禁 Prisma migrate）
- SITCA/MOPS 為公開網站，無 API 金鑰，需 UA header 與禮貌性 sleep
- 基金月報每月約 10 日後公佈上月資料，屬月頻資料，不應進每日 pipeline

## Goals / Non-Goals

**Goals:**

- 建立基金月報/季報持股資料層（SITCA 為主、MOPS 補歷史），落地 Supabase
- 以 `fund_manager_map` 白名單串起「基金 ↔ ETF ↔ 經理人」，支撐真雙軌訊號
- 實作 6 種基金訊號寫入 `fund_signals`，供前端經理人視角頁使用
- 每月自動同步（GitHub Actions cron），失敗時走既有 CI 失敗通知機制

**Non-Goals:**

- 不修改現有 `etf_signals` 的 ETF-only 訊號邏輯與資料（僅前端加口徑註記）
- 不做基金淨值/規模同步（MOPS navhistory 於 tw-active 亦未實作）
- 不做全市場所有基金——只做觀測清單內投信的台股基金（初始以 tw-active CATALOG 的 19 檔為基準，可擴充）
- 不做 LINE 推播（訊號推播為後續 change）
- 不回溯修正 tw-active 未解的 SITCA 歷史期 bug——歷史期一律走 MOPS

## Decisions

1. **月頻獨立腳本，不進每日 pipeline**：新增 `ETF/run_fund_holdings_sync.py` + `.github/workflows/fund_holdings_monthly.yml`（每月 12 日與 15 日各跑一次，冪等 upsert），比照 `compute_factor_ic.py` + `factor_ic_monthly.yml` 既有模式。替代方案「加進每日 orchestrator 並在非月中日早退」被否決：35 個 steps 已夠長，月頻資料混進日頻流程徒增噪音。
2. **訊號存新表 `fund_signals`，不塞 `etf_signals`**：兩者粒度不同（月 vs 日）、主體不同（基金名 vs ETF 代號）。共用會汙染既有查詢。欄位對齊 `etf_signals` 風格（signal_type, stock_code, period, strength, fund_names jsonb, metadata jsonb, UNIQUE(signal_type, stock_code, period)）。
3. **經理人對照放 DB 表 `fund_manager_map`，不放 etfRegistry.ts**：對照關係是資料不是程式常數，經理人會換人（需 valid_from/valid_to 欄位）；etfRegistry.ts 維持純 ETF 清單職責。Python 端 `ETF/config/fund_manager_map.py` 只放初始 seed 資料，migration 寫入後以 DB 為準。
4. **基金名稱正規化**：SITCA 與 MOPS 對同一基金的全名不一致（例：「統一台股增長主動式ETF證券投資信託基金」vs 短名）。沿用 tw-active 的 whitelist 正規化策略：`fund_manager_map.fund_short` 為 canonical key，爬蟲層做 raw name → short name 對映，對不上的記 log 並跳過（不寫入垃圾資料）。
5. **6 種訊號的取捨**：tw-active 定義 9 種，其中「雙軌建倉/加碼」需 manager mapping（本 change 直接提供，因此可實作），「共識形成（跨月權重合計）」與「多基金共識」高度重疊，合併為一種輸出 metadata 區分。最終清單見 Implementation Contract。
6. **RLS**：四張新表皆為全域投資資料（非租戶資料），比照 `etf_signals` 等既有投資表的 RLS 設定（authenticated 可讀、僅 service role 可寫）。

## Implementation Contract

**資料表（4 張 migration）**

- `fund_holdings_monthly`: (ym text, fund_short text, comid text, rank int, stock_code text, stock_name text, amount numeric, pct numeric, source text check in ('sitca','mops'), ingested_at timestamptz, UNIQUE(ym, fund_short, stock_code, source))
- `fund_holdings_quarterly`: (yq text, fund_short text, comid text, stock_code text, stock_name text, amount numeric, pct numeric, ingested_at timestamptz, UNIQUE(yq, fund_short, stock_code))
- `fund_manager_map`: (fund_short text PK, comid text, fund_full_names jsonb, etf_code text nullable, manager text, type text check in ('etf','fund'), valid_from date, valid_to date nullable, note text)
- `fund_signals`: (id bigint identity, signal_type text, stock_code text, period text, strength int, fund_names jsonb, metadata jsonb, created_at timestamptz, UNIQUE(signal_type, stock_code, period))

**爬蟲行為**

- `ETF/scrapers/sitca_scraper.py`：`fetch_monthly(ym, comid) -> list[dict]`、`fetch_quarterly(yq, comid) -> list[dict]`；POST www.sitca.org.tw/ROC/Industry 對應表單；只請求最新一期（歷史期已知失效，函式收到非最新期參數時 raise ValueError）；HTTP 失敗重試 2 次後 raise，由呼叫端記錄
- `ETF/scrapers/mops_fund_scraper.py`：`fetch_monthly(ym) -> list[dict]`（民國年轉換在函式內處理），回傳含 fund_name_raw 與正規化後 fund_short；正規化失敗的基金收進回傳值的 `unmatched` 清單
- `ETF/run_fund_holdings_sync.py`：抓最新月報+季報 → upsert 兩張 holdings 表 → 呼叫 `ETF/analysis/fund_signals.py` 跑訊號 → upsert `fund_signals`；任一階段失敗以非零 exit code 結束（讓 CI 失敗通知生效），但單一投信抓取失敗不中斷其餘投信

**訊號（6 種，`ETF/analysis/fund_signals.py`）**

| signal_type | 邏輯 | 需要資料 |
|---|---|---|
| quarterly_promotion | 上季 ≥1% 名單中的股票首次進入本月 Top 10 | quarterly + monthly |
| quarterly_latent_etf | 季報有、月報 Top 10 無，但同經理人 ETF 每日持股出現 | quarterly + etf_holdings_snapshot + map |
| fund_consensus | 同月 ≥3 檔基金同持一股（metadata 記錄跨月權重合計趨勢） | monthly |
| consecutive_add | 單一基金同一股票 pct 連續 ≥3 個月遞增 | monthly 時序 |
| high_weight_cut | 曾 ≥10% 的持股降至 ≤5% | monthly 時序 |
| core_exit | 連續 ≥3 個月在 Top 10 後消失 | monthly 時序 |

**前端**

- `/investment/manager`（Server Component）：經理人卡片清單 → 點開顯示（a）其 ETF 最新持股 Top 20（讀既有 `etf_holdings_snapshot`）（b）其基金最新月報 Top 10（讀 `fund_holdings_monthly`）（c）雙軌落差表：基金有而 ETF 無（或反向）的股票清單（d）該經理人相關 `fund_signals` 最近 3 期
- 資料取得走 Server Action `getManagerDualTrack(manager: string)`，使用 server client（`@/lib/supabase/server`），回傳型別定義於 action 檔案內並 export
- 頁面標示口徑註記：「ETF 訊號（日頻近似）」與「基金訊號（月頻真雙軌）」

**驗收條件**

- `uv run pytest ETF/` 綠燈，新增測試覆蓋：SITCA/MOPS parser（用 fixture HTML）、6 種訊號各至少一個正例與一個反例
- `uv run python ETF/run_fund_holdings_sync.py --dry-run` 可跑通（抓取+解析，不寫 DB）
- `yarn tsc --noEmit` 綠燈；`/investment/manager` 本地實跑可見至少一位經理人的雙軌對照
- 對照驗證：任選一檔基金，比對 `fund_holdings_monthly` 與 SITCA 網站當期 Top 10 完全一致

**範圍邊界**

- In scope：上述 4 表、2 爬蟲、1 同步腳本、1 訊號模組、1 CI workflow、1 前端頁、1 Server Action
- Out of scope：LINE 推播、`etf_signals` 邏輯調整、基金淨值、全市場基金、SITCA 歷史期修復

## Risks / Trade-offs

- [SITCA/MOPS 改版] → parser 用 fixture 測試鎖住格式假設，CI 失敗即通知；爬蟲層拋明確錯誤不靜默
- [基金名稱對不上白名單] → unmatched 清單記 log 且同步結果摘要中呈現，人工補 `fund_manager_map` 後下次自動補上
- [MOPS 只有 Top 5，歷史深度不足] → 接受此限制，訊號的時序類（consecutive_add 等）在歷史回補區間只用可得資料，metadata 標記 source
- [經理人異動導致對照過期] → `valid_from/valid_to` 設計 + 每月同步摘要列出 map 中超過 180 天未更新的條目提醒檢查

## Migration Plan

1. 先跑 4 張 migration（依 Impact 清單順序，含 RLS policy）
2. seed `fund_manager_map`（初始 19 檔，來源 tw-active CATALOG，經理人欄位以現時資訊為準）
3. 手動執行 `run_fund_holdings_sync.py` 首次同步（最新月+季）
4. 執行 `backfill_fund_holdings_mops.py` 回補近 6 個月歷史月報（Top 5）
5. 部署前端頁；CI workflow 上線

## Open Questions

- 初始觀測清單是否要從 19 檔擴到所有 26 支 ETF 對應投信的台股基金？（預設：先 19 檔，跑穩一個月後另開 change 擴充）
