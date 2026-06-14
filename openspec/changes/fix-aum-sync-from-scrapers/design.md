## Context

`AumSyncStep`（輔助步驟）原設計從 FinLab `fund_price:收盤價` × `已發行受益權單位數` 推算 AUM。實測 FinLab 不收錄主動 ETF 基金規模資料（`data.get('fund_price:收盤價')` → `Cannot find data`），因此 `_fetch_finlab_etf_data` 永遠回 `None`，`_sync_all` 在 [aum_sync_step.py:69-71](ETF/pipeline/steps/aum_sync_step.py#L69-L71) 靜默 return。`etf_aum_series` 的最後資料來自一次性的 backfill（scale.json，14 支），日常 pipeline 從未寫入。

參考專案 TW_Active_Tracker 證明：各投信官方端點在回持股的**同一份回應**中即帶有基金資產摘要（基金淨資產價值／已發行受益權單位總數／每受益權單位淨資產價值），無需額外請求。scrivener 的 `official_api_scraper.py` 目前只讀了揭露日期 `Label_AUM01`，把 aum/nav/units 數值丟棄。

約束：本變更不得改 `etf_aum_series` schema、不得新增 HTTP 請求、輔助步驟仍不可 re-raise。

## Goals / Non-Goals

**Goals**
- 讓 22 支 ETF 每個交易日都有 AUM 寫入 `etf_aum_series`。
- AUM 資料來源改為持股爬取回應，與持股同一份資料、同一揭露日對齊。
- 移除確定失效的 FinLab `fund_price:*` 死路。

**Non-Goals**
- 不改 `etf_aum_series` schema。
- 不重做 `_sync_aum_series`（累積流入／成長佔比）。
- 不新增 AUM 專用爬蟲請求。
- 不處理歷史 backfill。

## Decisions

### 由 scraper 在持股解析時一併擷取基金資產摘要

各家解析函式在既有回應上額外解析 `aum`／`nav`／`units`／`nav_date`，回傳結構由「holdings list」擴充為 `{ holdings, aum, nav, units, nav_date }`。對照 TW_Active_Tracker 已驗證的欄位來源：

| 來源型態 | aum | nav | units | 揭露日 |
| :--- | :--- | :--- | :--- | :--- |
| 復華等 JSON API | `fundAsset.Aum` | `fundAsset.Nav` | `fundAsset.Units` | `fundAsset.NavDate` |
| 中信 CTBC HTML | `#Label_AUM02` | `#Label_AUM04` | `#Label_AUM03` | `#Label_AUM01` |
| 台新 HTML（th/td map） | `基金淨資產價值(元)` | `每受益權單位淨資產價值(元)` | `已發行受益權單位總數(單位)` | `PUB_DATE` |
| 野村 HTML（th/td map） | `基金淨資產價值(元)` | `每受益權單位淨資產價值(元)-台幣交易` | `已發行受益權單位總數-台幣交易` | — |
| 群益 capital HTML | `.td.cell.auto` 第 1 值 | 第 2 值 | 第 3 值 | `#condition-date` |
| 元大 NUXT pcf | `pcf.totalav` | — | — | — |

任一欄位解析失敗時以 `None` 帶過，不讓持股解析中斷。

**替代方案（否決）**：保留 FinLab fallback。否決理由：來源確認不存在，保留只是死碼。

### 以 PipelineContext.etf_fund_assets 傳遞，比照 secondary_stock_codes

新增 `ctx.etf_fund_assets: dict[str, dict]`，key 為 ETF code，value 為 `{aum, nav, units, nav_date}`。scraper 分派層（`official_api_scraper` 及 `multi_etf_step` 處理各 ETF 處）寫入；`AumSyncStep` 讀取。沿用既有「scraper 填、step 消費」的 ctx 慣例，不引入新傳遞機制。

**替代方案（否決）**：scraper 直接寫 DB。否決理由：違反步驟分層，且 AUM 的 inflow 增量計算集中在 `AumSyncStep`，來源與寫入分離才能維持單一寫入點。

### AumSyncStep 改讀 ctx、移除 FinLab 路徑、修正 _upsert 簽章

`_sync_all` 改為：對 `get_all_etf_codes()` 逐一從 `ctx.etf_fund_assets` 取摘要，換算 `aum_100m = aum / 1e8`、`units(億份) = units / 1e8`、`nav` 保持元/份，組 records 後 upsert。刪除 `_fetch_finlab_etf_data`、`_try_tables`、`_NAV_TABLE_CANDIDATES`、`_UNITS_TABLE_CANDIDATES`。

同時修正 [aum_sync_step.py:83](ETF/pipeline/steps/aum_sync_step.py#L83) 的 `self._upsert(services, records, services)`（三引數）為 `self._upsert(services, records)`，對齊 `_upsert(services, records)` 定義。`_sync_aum_series`（增量欄位）保持不變。

## Risks / Trade-offs

- [部分來源缺 nav/units（如元大只給 totalav）] → 該欄位寫 `None`，`aum_100m` 仍可直接由 `aum` 取得，不阻擋寫入；`_build_row` 需容許 `nav`/`units` 為 `None`。
- [某家投信改版導致 aum 欄位解析失敗] → 該支當日 `etf_fund_assets` 缺項，`AumSyncStep` 跳過該支不中斷，與持股爬取既有的容錯一致。
- [pocket 來源 ETF 無基金資產摘要] → 這些支當日無 AUM 寫入屬預期；覆蓋率取決於官方 API 來源支數，本變更已將 official_api 來源全數納入。

## Migration Plan

1. 部署後首個交易日 CI 執行即開始寫入；無需資料遷移。
2. 回滾：還原三個檔案即可，`etf_aum_series` 既有資料不受影響（純 append/upsert）。

## Open Questions

- 無。pocket 來源是否補 AUM 留待後續 change，不在本範圍。
