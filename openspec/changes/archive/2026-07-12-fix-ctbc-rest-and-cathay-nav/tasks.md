## 1. 修復 `_fetch_ctbc()`（00995A 持股）

- [x] 1.1 在 ETF/scrapers/official_api_scraper.py 的 `_fetch_ctbc()` 修正 `ETFHoldingWeight` 請求：`StartDate` 改帶 dash 格式日期（呼叫端有 `date_ymd` 用 `_ymd_to_dash()` 轉換，否則用既有 `_last_weekday_dash()`），並將 `date_ymd` 參數自 `_dispatch` 傳入 `_fetch_ctbc(fid, date_ymd)`。完成時行為：送出的請求 body 中 `StartDate` 永不為空字串。驗證：新增單元測試斷言 mock 呼叫收到的 payload `StartDate` 符合 `\d{4}-\d{2}-\d{2}`。（滿足 spec requirement: CTBC REST scraper fetches 00995A holdings with a non-empty trade date）
- [x] 1.2 修正 `_fetch_ctbc()` 回應解析：改為選取 `Data.FundAssetsDetail` 中 `Code == "STOCK"` 的 section，迭代其 `Data` 清單，欄位對映 `code_→code`、`name_→name`、`weights_→weight_pct`、`qty_→shares`（先去千分位逗號再轉數值）；`ResultCode != 0` 或無 STOCK section 時回空清單不拋例外。完成時行為：以 2026-07-12 實測回應結構為 fixture 可解析出全部持股；ResultCode 1 回空清單。驗證：`uv run pytest ETF/tests/test_new_scrapers.py -k ctbc` 綠燈（含成功解析與 ResultCode 1 兩個 case）

## 2. `_fetch_ctbc()` 資產摘要（00995A NAV/AUM）

- [x] 2.1 在 `_fetch_ctbc()` 內解析同一回應的 `Data.FundAssets[0]`：`基金淨資產→aum`、`基金每單位淨值→nav`、`基金在外流通單位數→units`（皆去逗號）、`NAV_DT` 截 `T` 前段 `→nav_date`，經 `_fund_assets_or_none()` 與 `_check_aum_nav_units_consistency()` 建構；回傳型別改為 `tuple[list[dict], dict | None]`，並將 `_dispatch` 中 `issuer == "ctbc"` 分支自「僅持股」分組移至直接回傳 `(holdings, fund_assets)` 的分組。完成時行為：`fetch_holdings("00995A")` 的 DataFrame `attrs["fund_assets"]` 含數值 aum/nav/units 與 `YYYY-MM-DD` 格式 nav_date；`FundAssets` 缺漏時 fund_assets 為 None 且持股不受影響。驗證：單元測試以 fixture 斷言摘要欄位值與「FundAssets 缺漏仍回持股」case。（滿足 spec requirement: CTBC REST scraper extracts fund asset summary from the same response；同時滿足 etf-fund-asset-sync 的 Fund asset summary extraction during holdings scrape「同一回應零額外請求」分支）

## 3. 國泰 `GetETFAssets` 資產摘要（00400A NAV/AUM）

- [x] 3.1 新增 `_fetch_cathay_assets(fund_code)`：GET `https://cwapi.cathaysite.com.tw/api/ETF/GetETFAssets?fundCode={fund_code}`，對映 `result.fundNav→aum`（命名陷阱：此欄是基金總淨資產）、`result.fundPerNav→nav`、`result.fundOutstandingShares→units`（皆去逗號）、`result.preDate`（`YYYY/MM/DD`→`YYYY-MM-DD`）`→nav_date`，經 `_fund_assets_or_none()` 與一致性檢查；任何失敗（HTTP 錯誤、`success != true`、欄位缺漏）只 `logger.error` 回 None。`_dispatch` 中 `issuer == "cathay"` 改回傳 `(_fetch_cathay(fund_code), _fetch_cathay_assets(fund_code))`。完成時行為：`fetch_holdings("00400A")` 的 `attrs["fund_assets"]` 有值；`GetETFAssets` 失敗時持股結果不變、無例外傳播。驗證：單元測試斷言 aum=25748701845 與 nav=14.2 的對映方向（fundNav 陷阱 case）＋摘要端點失敗仍回持股 case。（滿足 spec requirement: Cathay scraper fetches holdings from REST API 的 GetETFAssets 對映；同時滿足 etf-fund-asset-sync 的 Fund asset summary extraction during holdings scrape「持股回應無摘要允許一次補充請求」分支）

## 4. 測試與品質

- [x] 4.1 在 ETF/tests/test_new_scrapers.py 新增上述所有 mock fixture 測試（不打真網路），fixture 內容取自 2026-07-12 實測回應結構。完成時行為：涵蓋行為 A/B/C 的成功、失敗、fallback 全部 scenario。驗證：`uv run pytest ETF/tests/test_new_scrapers.py` 全綠
- [x] 4.2 執行 `uv run ruff check --fix ETF/scrapers/official_api_scraper.py ETF/tests/test_new_scrapers.py && uv run ruff format ETF/scrapers/official_api_scraper.py ETF/tests/test_new_scrapers.py`。驗證：ruff 無錯誤輸出
- [x] 4.3 實跑冒煙驗證（本機網路可用時）：執行 `uv run python -c "from ETF.scrapers.official_api_scraper import fetch_holdings; df = fetch_holdings('00995A'); print(len(df), df.attrs.get('fund_assets'))"` 與 00400A 同式指令。完成時行為：00995A 輸出非零筆數＋非 None 摘要；00400A 輸出非 None 摘要。驗證：貼上兩段實跑輸出

## 5. 文件

- [x] 5.1 [P] 更新 ETF/CLAUDE.md「NAV 覆蓋現況」：ctbc（REST）與 cathay 自「NAV 未接清單」移入已接清單（更新為 13 家，附欄位對映一句摘要）；刪除「cathay REST 無 NAV；Angular SPA 需 Playwright 另行探查」與「ctbc token 驗證本機失敗」的過時敘述；未接清單餘 first_financial（實測 Get_hd 無基金總資產欄位）與 alliance_bernstein。驗證：read-back 確認表格與正文無殘留過時敘述
