## Context

目前 ETF Pipeline 的 secondary ETF 爬蟲（29 支，由 `MultiEtfStep` 處理）採用「static source」策略：`etf_registry.py` 為每支 ETF 指定固定來源（`official_api` 或 `pocket`），失敗時不自動嘗試其他來源。`moneydj_scraper.py` 雖已存在，但僅在 `pocket` 爬取失敗後才在程式碼中硬式降級，尚未統一為可配置的 fallback 鏈。

`xlsx_parser.py` 目前使用固定欄位名稱比對，若投信更新 Excel header（如「股票代號」→「代號」），Parser 靜默回傳空資料。

Pipeline 每日 UTC 14:00 無條件執行，假日或資料未更新日（Pocket.tw ETF 可能數天一筆）仍全跑，浪費 FinLab API 配額。

## Goals / Non-Goals

**Goals:**
- 所有 secondary ETF 具備三層 fallback：`official_api → moneydj → pocket`
- `xlsx_parser.py` 對欄位名稱的語意變體具容錯能力
- Pipeline 在資料不需更新時可提前退出，節省 API 配額

**Non-Goals:**
- 不修改 `ScrapeStep`（00981A 主流程）
- 不新增官方 CSV URL（各投信 URL 尚未公開）
- 不修改資料庫 schema 或 RLS

## Decisions

### Fallback 鏈實作位置選在 MultiEtfStep 而非 Registry

**決策**：在 `multi_etf_step.py` 的每支 ETF 爬取迴圈中實作 fallback 邏輯，不修改 `etf_registry.py` 的 `source` 欄位語意。

**理由**：Registry 的 `source` 代表「首選來源」，改成陣列會破壞既有介面。Step 層處理 fallback 符合單一職責——Registry 宣告意圖，Step 決定執行策略。

**替代方案**：在 Registry 加 `fallback_sources: list[str]` → 拒絕，過度設計，fallback 順序對所有 ETF 相同。

### Fallback 順序：official_api → moneydj → pocket

**決策**：固定三層順序，不可配置。

**理由**：official_api 資料最準（直接來自投信），moneydj 為 HTML 解析（穩定但非官方），pocket 為 Selenium（最慢、最脆弱）。此順序最大化資料品質並最小化爬取成本。

### 欄位 alias mapping 放在 xlsx_parser.py 頂層常數

**決策**：在 `xlsx_parser.py` 定義 `COLUMN_ALIASES: dict[str, list[str]]`，key 為標準欄名，value 為所有已知別名。

**理由**：集中管理，單一更新點，新增投信格式只需擴展常數。

### CheckTradeDateStep 使用 DB 最新 `data_date` 比對

**決策**：查詢 `etf_holdings_snapshot` 最新 `data_date`，與 `_last_weekday()` 計算結果比對；一致則設 `ctx.skip_reason = "data_up_to_date"` 並 early-exit。

**理由**：`etf_holdings_snapshot` 是所有下游步驟的來源，此表有資料即代表該日已處理。

**替代方案**：查 `etf_diff_logs`（依賴 diff 完成）或查多表（過於複雜）→ 均拒絕。

## Risks / Trade-offs

- **[Risk] moneydj_scraper 在高並行時遭反爬**：Mitigation — 在 fallback 嘗試間加 1s delay，與現有 pocket 爬取 delay 一致
- **[Risk] CheckTradeDateStep 判定錯誤導致跳過有效更新**：Mitigation — 判定邏輯保守（只跳過當 DB 日期 == 預期交易日），不確定時繼續執行
- **[Trade-off] fallback 增加單支 ETF 最長等待時間**：三層全失敗時從 ~5s 增至 ~20s；可接受，整體 pipeline 仍在 CI timeout 限制內
