## ADDED Requirements

### Requirement: 官網 API scraper 模組

系統 SHALL 提供 `ETF/scrapers/official_api_scraper.py`，整合 6 家投信官方 API endpoint，實作與 `unified_scraper.py` 相同的回傳介面（DataFrame with code, name, weight, shares 欄位）。

CATALOG 來源：`reference/tw-active/tools/etfdaily.py`

| 投信 | ETF | 認證方式 |
|------|-----|---------|
| 統一 ezmoney | 00981A, 00988A | GET XLSX + cookie jar |
| 野村 nomurafunds | 00980A, 00985A | POST JSON |
| 復華 fhtrust | 00991A | GET XLSX |
| 安聯 etf.allianzgi | 00993A, 00984A | POST JSON + ASP.NET antiforgery |
| 群益 capitalfund | 00982A, 00992A, 00997A | POST JSON |

#### Scenario: 正常抓取持股
- **WHEN** 呼叫 `fetch_holdings(etf_code, date_str)` 且投信 API 回應正常
- **THEN** 回傳 DataFrame，欄位含 `code`, `name`, `weight`, `shares`，每列為一支持股

#### Scenario: API 回應異常
- **WHEN** 投信 API 回傳非 200 或格式不符
- **THEN** 記錄 ERROR log，回傳空 DataFrame，不拋出例外

#### Scenario: 不支援的 ETF
- **WHEN** 傳入 CATALOG 未定義的 ETF 代號（如 00994A）
- **THEN** 回傳空 DataFrame 並記錄 WARNING

---

### Requirement: Pipeline 備援觸發機制

`ScrapeStep` SHALL 在 FinLab 資料 `price` 欄位空缺率超過 30% 時，自動觸發 `official_api_scraper` 補充持股資料；官網 API 為備援，不替代 FinLab 主流程。

#### Scenario: FinLab 資料完整
- **WHEN** `ScrapeStep` 執行後 `ctx.df` 的 `price` 欄位空缺率 ≤ 30%
- **THEN** 跳過官網 API，繼續正常 pipeline 流程

#### Scenario: FinLab 資料缺失觸發備援
- **WHEN** `ScrapeStep` 執行後 `price` 空缺率 > 30%
- **THEN** 自動呼叫 `official_api_scraper.fetch_holdings()`，以官網資料補充 `ctx.df` 缺失欄位，並於 log 標記 `[FALLBACK]`

#### Scenario: 備援也失敗
- **WHEN** 官網 API 備援也回傳空資料
- **THEN** 記錄 WARNING，繼續執行後續步驟（備援失敗不中斷 pipeline）
