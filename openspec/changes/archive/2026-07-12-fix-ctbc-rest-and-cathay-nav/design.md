## Context

`ETF/scrapers/official_api_scraper.py` 的 `_dispatch()` 依 CATALOG issuer 分派各投信爬蟲，回傳 `(holdings, fund_assets)`；`fund_assets` 附於 DataFrame `attrs` 由 MultiEtfStep 寫入 `ctx.etf_fund_assets`，`AumSyncStep` 消費後落 `etf_aum_series`。現況：

- `ctbc` issuer（00995A）的 `_fetch_ctbc()` 因 `StartDate: ""` 觸發 API `ResultCode: 1`、且解析 key 與實際回應不符，永遠回空持股 → MultiEtfStep 每日 fallback pocket_scraper（公告日才更新），且 fund_assets 恆為 None。
- `cathay` issuer（00400A）持股正常，但 fund_assets 恆為 None，前端 premium_pct 顯示「NAV 來源未接」。
- 2026-07-12 對兩家官方 API 實測完成，所有欄位名以真實回應為準（禁止臆測 key 原則）。

## Goals / Non-Goals

**Goals**
- 00995A 持股改走官方 REST（每日更新），並補 NAV/AUM。
- 00400A 補 NAV/AUM。
- 對應 spec 衝突收斂（`etf-fund-asset-sync` 的單一回應條款）。

**Non-Goals**
- 00983A 不切換到 REST：現行 `ctbc_html`（pcd.aspx）持股與資產摘要均正常，切換會引入持股 code 格式差異風險（美股代碼），無現實痛點不動。
- 00994A（第一金）NAV：實測 `Get_hd` 回應僅有 group=4 現金與 group=5 資產配置比例，無基金總資產欄位，維持未接。
- 00984D（聯博）端點故障，不在本次範圍。
- 不改 registry（兩支 source 已是 official_api）、不改 DB schema、不改前端。
- 不引入 requests/session 重構——沿用既有 `_post_json`/`_get` helper 與 `verify_ssl=False` 模式。

## Decisions

1. **`StartDate` 帶台北時區最近交易日而非 `date.today()`**：既有 `_last_weekday_dash()` helper 已實作 15:00 前回退前一交易日的邏輯，直接重用；外部傳入 `date_ymd` 時優先使用（轉 dash 格式）。理由：週末/盤前執行時 `date.today()` 是非交易日，API 對非交易日的行為未驗證，最近交易日語義最穩。
2. **中信資產摘要中文 key 直接引用**（`基金淨資產`/`基金每單位淨值`/`基金在外流通單位數`）：實測回應即為中文 key，加註解標明來源為實測，不做多層 or-fallback 猜測。`NAV_DT` 取 `T` 前段作 nav_date。
3. **國泰摘要用獨立函式 `_fetch_cathay_assets()`，失敗回 None 不影響持股**：與 taishin/yuanta 的「holdings + assets 兩段」既有模式一致（`_dispatch` 內已有先例），比塞進 `_fetch_cathay()` 單函式更利於單測與錯誤隔離。
4. **`fundNav` 命名陷阱以測試固定**：國泰 `fundNav` 是基金總淨資產（≈257 億）而非每單位淨值（`fundPerNav` 才是，≈14.2）。單元測試斷言 aum 與 nav 的數量級關係，防止未來誤對映回歸。
5. **spec 衝突解法——放寬而非例外清單**：`etf-fund-asset-sync` 的「同一回應、不得額外請求」條款改寫為兩層：持股回應含摘要者維持零額外請求；不含者允許至多一次補充請求且失敗不影響持股。不採 hardcode「cathay 除外」的寫法，未來同型來源可直接適用。
6. **沿用 `_check_aum_nav_units_consistency()`**：中信/國泰摘要皆過既有 aum ≈ nav × units 檢查（誤差 >5% 只留 nav），與其他 issuer 行為一致。
7. **（apply 階段實測補充）中信 token 必須同時帶於 URL query string**：兩段請求（AuthToken / ETFHoldingWeight）僅在 JSON body 帶 token 會回 `ResultCode: 1`「Token 無效或過期」；AuthToken 的 seed 為完整網域 `www.ctbcinvestments.com.tw`（含 `.tw`，舊碼漏了）。差異測試確認 query param 為必要條件、Referer/Origin header 非必要（2026-07-12 實測；參考實作 stock-data-ai/stock-data `etf_Crawler/fetch_active_etf_ctbc.py`）。

## Implementation Contract

**行為 A — 00995A 持股（修復）**
- `fetch_holdings("00995A")` 在交易日 SHALL 回傳非空 DataFrame（columns: code/name/weight/shares），持股來自 `ETFHoldingWeight` 回應中 `Code == "STOCK"` section 的 `Data` 清單，欄位對映 `code_→code`、`name_→name`、`weights_→weight`、`qty_→shares`（去千分位逗號）。
- 請求 SHALL 帶 `StartDate` 為 dash 格式日期（指定日期或最近交易日），不得為空字串。
- API 回 `ResultCode != 0` 或 STOCK section 為空時回空 DataFrame 不拋例外（維持 fallback 鏈語義）。

**行為 B — 00995A 資產摘要（新增）**
- 同一份 `ETFHoldingWeight` 回應的 `FundAssets[0]` SHALL 對映 `基金淨資產→aum`、`基金每單位淨值→nav`、`基金在外流通單位數→units`、`NAV_DT`（截 `T` 前）→`nav_date`，經 `_fund_assets_or_none` + 一致性檢查後由 `_dispatch` 回傳；`_dispatch` 中 `ctbc` 自「僅持股」分組移至回傳 fund_assets 的分組。
- `FundAssets` 缺漏或解析失敗時 fund_assets 為 None，持股解析不受影響。

**行為 C — 00400A 資產摘要（新增）**
- `_fetch_cathay_assets(fund_code)` SHALL GET `GetETFAssets?fundCode={fund_code}`，對映 `fundNav→aum`、`fundPerNav→nav`、`fundOutstandingShares→units`（三者皆含千分位逗號需清洗）、`preDate`（`YYYY/MM/DD`→`YYYY-MM-DD`）→`nav_date`。
- 該請求任何失敗（HTTP 錯誤、`success != true`、欄位缺漏）SHALL 只 log 並回 None，`fetch_holdings("00400A")` 的持股結果不受影響。

**驗收**
- `uv run pytest ETF/tests/test_new_scrapers.py` 綠燈：新增測試以 mock 回應 fixture 覆蓋行為 A/B/C 的成功解析、`ResultCode: 1`、`StartDate` 非空斷言、`fundNav` 數量級斷言、摘要失敗不影響持股。
- `uv run ruff check ETF/scrapers/official_api_scraper.py` 無錯誤。
- 實跑驗證（網路可用時）：`uv run python -c "from ETF.scrapers.official_api_scraper import fetch_holdings; df = fetch_holdings('00995A'); print(len(df), df.attrs.get('fund_assets'))"` 輸出非零筆數與非 None 摘要；00400A 同式輸出非 None 摘要。
- ETF/CLAUDE.md「NAV 覆蓋現況」表更新為 13 家已接，未接清單餘 first_financial 與 alliance_bernstein。

**範圍邊界**：只動 `official_api_scraper.py` 中 `_fetch_ctbc`、`_fetch_cathay`（或新增 `_fetch_cathay_assets`）、`_dispatch` 三處與對應測試/文件；MultiEtfStep、AumSyncStep、前端、registry、DB schema 一律不動。

## Risks / Trade-offs

- [中信 API 對「今日尚無資料」的行為未驗證（盤中/假日可能回 ResultCode 1）] → 空結果回空 DataFrame 走既有 pocket fallback，行為不劣於現況；`_last_weekday_dash()` 已處理 15:00 前回退。
- [國泰 `GetETFAssets` 的 `preDate` 可能與持股 `date` 不同日] → fund_assets 以 `preDate` 為 nav_date 自帶日期，AumSyncStep 依 nav_date 落列，不假設兩端點同日。
- [中信中文 key 若改版將靜默變 None] → `_fund_assets_or_none` 全 None 時回 None，AumSyncStep 該 ETF 當日不落列（既有優雅降級語義）；不加額外告警機制（與其他 issuer 一致）。
- [官方端點無 SLA，未來可能改版] → 單元測試用固定 fixture 不打真網路，CI 不因端點抖動而紅；線上失效由既有 fallback 鏈與 LINE 資料新鮮度巡檢承接。

## Migration Plan

單次部署，無 schema/資料遷移。合併後首個交易日 pipeline 自然開始寫入兩支 ETF 的 `etf_aum_series` 列；歷史 NAV 不回補（來源不提供歷史，維持前向累積）。回滾＝revert commit，fallback 鏈使持股行為回到現況。

## Open Questions

（無——兩個端點的請求格式與回應欄位均已於 2026-07-12 實測確認。）
