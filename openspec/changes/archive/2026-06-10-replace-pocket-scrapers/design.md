## Context

`ETF/scrapers/official_api_scraper.py` 已支援 14 支 ETF 的直接 API 爬蟲，所有爬蟲統一透過 `fetch_holdings(etf_code)` 對外提供，`multi_etf_step.py` 在 `source='official_api'` 時呼叫此介面，失敗才 fallback `pocket_scraper.py`。

目前仍有 5 支 ETF 標記 `source='pocket'`（00400A、00401A、00983A、00989A）或 `fund_id=None` fallback（00996A）。TW_Active_Tracker 已驗證三種爬蟲技術可直接 port 成 Python：
1. 摩根（JPM）：固定 XLSX URL，openpyxl 解析兩段式結構
2. 國泰（Cathay）：`cwapi.cathaysite.com.tw` REST GET，回傳 JSON
3. 中信 HTML（CTBC 舊頁面）：`www.ctbcinvestments.com.tw/CTWEB/Content/ETF/pcd.aspx?ETF_ID=XXXXX`，解析 `id="Label_AUM0x"` 及 `<tr><td>` 表格

## Goals / Non-Goals

**Goals:**
- 在 `official_api_scraper.py` 的 `CATALOG` 新增 00400A、00401A、00983A、00989A 四支 ETF
- 實作 `_fetch_jpm()`、`_fetch_cathay()`、`_fetch_ctbc_html()` 三個函式並接入 `_dispatch()`
- 修正 `CATALOG["00996A"]["fund_id"] = "23"` 讓兆豐爬蟲直接成功
- `etf_registry.py` 與 `etfRegistry.ts` 同步改為 `official_api`

**Non-Goals:**
- 不修改 `multi_etf_step.py`、`unified_scraper.py` 或任何 pipeline 步驟
- 不處理 00998A（復華第二檔）
- 不新增新的爬蟲檔案，全部邏輯加入現有 `official_api_scraper.py`

## Decisions

### 摩根 XLSX 爬蟲使用固定 URL + openpyxl 解析

摩根投信每日更新同一固定 XLSX URL（含 ETF 代碼），無需 auth 或 cookie。以 `requests` 下載後 `openpyxl.load_workbook(io.BytesIO(raw))` 解析。
- 找到 `Record Type` 列為 `D`（明細行）的 section，對應欄位 `Constituent Ticker`、`Constituent Description`、`Shares or PAR Amount`、`Market Value Base`
- weight 由 `Market Value Base / Estimated Total Market Value * 100` 計算
- 00401A xlsxUrl：`https://am.jpmorgan.com/content/dam/jpm-am-aem/asiapacific/tw/zh/regulatory/etf-supplement/jpm_apac_tw_etf_pcf_updates_00401A_TW00000401A1.xlsx`
- 00989A xlsxUrl：`https://am.jpmorgan.com/content/dam/jpm-am-aem/asiapacific/tw/zh/regulatory/etf-supplement/jpm_apac_tw_etf_pcf_updates_00989A_TW00000989A5.xlsx`
- 替代方案（Pocket.tw）被排除：僅公告日更新，頻率不足。

### 國泰 REST API 使用雙 GET 取得 assets + weights

國泰提供兩個公開端點：
- `https://cwapi.cathaysite.com.tw/api/ETF/GetETFAssets?fundCode=EA`（取 NAV/AUM）
- `https://cwapi.cathaysite.com.tw/api/ETF/GetIndexStockWeights?fundCode=EA`（取持股權重）
兩者均為無 auth 的 GET，回傳 JSON。shares 欄位為 null（官方不揭露），設為 0。
- 替代方案：Pocket.tw 無法每日更新。

### 中信 ARK 使用 HTML 爬蟲（與 00995A 使用不同端點）

00983A 仍使用舊版 ASP.NET 頁面 `/CTWEB/Content/ETF/pcd.aspx`，持股表格為標準 `<tr><td>` HTML，不需要 auth token。現有 `_fetch_ctbc()` 是給 00995A 的新版 REST API（`/API/etf/ETFHoldingWeight`），兩者共存於 `official_api_scraper.py`。
- 解析 `id="Label_AUM01"` 取日期、`id="Label_AUM02"` 取 AUM，再用 BeautifulSoup 解析 `<tr><td>` 4 欄持股表格（代號、名稱、股數、比重）
- 替代方案：00995A 的 auth token API 不能複用，`pcd.aspx` 頁面無 auth 門檻。

### 兆豐 00996A 直接補 fund_id=23

`_fetch_mega()` 已實作完成，只差 `CATALOG["00996A"]["fund_id"]` 為 `None`。TW_Active_Tracker 確認 `id=23` 對應 00996A。直接補值即可，無需新增任何程式碼。

## Risks / Trade-offs

- [Risk] 摩根 XLSX URL 中的 shareClassId 若官方更改會 404 → Mitigation: `_fetch_jpm()` 失敗時回傳空 DataFrame 不 raise，`multi_etf_step` 已有 fallback pocket 機制
- [Risk] 國泰 `fundCode=EA` 若對應關係變更 → Mitigation: 同上，失敗時 fallback
- [Risk] 中信舊頁面改版或下線 → Mitigation: 同上，需持續監控
- [Risk] BeautifulSoup + lxml 已是 `_fetch_taishin()` 的既有依賴，無需新增 → 無風險
