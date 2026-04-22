## Why

目前 ETF 系統以 Pocket.tw Selenium 爬蟲作為 10 支 ETF 的主要資料來源，存在網站改版即斷線的風險，且缺乏 AUM 規模分析、持股比重疊圖、進階訊號偵測等功能。參考 [tw-active](https://github.com/marvin-69-jpg/tw-active) 專案，台灣主動 ETF 受法規強制每日揭露完整持股，各投信官方 API 已可直接取用；同時該專案已驗證 AUM 申購占成長比、持股比重 + 股價疊圖、多基金共識等功能在投資決策上具備實質洞察力。

## What Changes

- **資料來源升級**：新增投信官網直打 API（統一、野村、復華、安聯、群益共 6 家），FinLab 維持主力，官網 API 作備援；移除對 Pocket.tw Selenium 的單點依賴
- **ETF 擴增**：從 11 支擴增至 21 支，新增 00988A、00990A、00992A、00993A、00984A、00985A、00986A、00987A、00994A、00995A、00996A、00997A 等
- **AUM 規模儀表板**：新增「申購占成長比」核心指標、AUM 時序 sparkline、申購 vs 資本增值拆解面板
- **持股比重 + 股價雙軸疊圖**：單一 ETF 深潛頁加入持股比重折線（左軸）+ 股價走勢（右軸）疊加圖
- **進階訊號偵測**：新增 5 種自動化訊號（多基金共識、單檔重壓、跨產品加碼、雙軌落差、季度出場），補強現有 OverlapComputeStep

## Capabilities

### New Capabilities

- `etf-official-api-backup`: 投信官網直打 API scraper（統一/野村/復華/安聯/群益），作為 FinLab 的備援資料來源；含 CATALOG 路由、各家 HTTP 認證處理、回傳格式正規化
- `etf-expansion`: 將 etfRegistry.ts 與 etf_registry.py 從 11 支擴充到 21 支；補充各 ETF 的 issuer、fund_code、資料來源映射；Pipeline MultiEtfStep 同步擴充
- `aum-scale-dashboard`: 新增 AUM 規模分析面板於 `/investment/compare` 或獨立頁面；核心指標為「申購占成長比」（inflow_share_of_growth）；資料來自 `etf_aum` 表擴充或新增 `etf_aum_series` 時序表；Python side 新增 `AumSyncStep` 定期抓 NAV × units
- `holdings-price-overlay-chart`: 單一 ETF 深潛頁（`/investment/[etf]`）新增雙軸折線圖，左軸為持股比重歷史，右軸為個股股價走勢；資料來自 `etf_weight_history` + `stock_prices_daily`
- `advanced-signal-detection`: 新增 5 種策略訊號偵測，寫入 `etf_signals` 新表；Python side 新增 `SignalDetectStep`；前端在選股池加入訊號欄位顯示

### Modified Capabilities

（無現有 spec 需要變更）

## Impact

**Python Pipeline（ETF/）**
- `ETF/config/etf_registry.py`：新增 10 支 ETF 定義
- `ETF/scrapers/`：新增 `official_api_scraper.py`（整合 etfdaily.py 的 6 家投信 HTTP client）
- `ETF/pipeline/steps/`：新增 `aum_sync_step.py`、`signal_detect_step.py`；修改 `multi_etf_step.py` 以支援 21 支
- `ETF/pipeline/orchestrator.py`：調整步驟順序，加入新步驟

**前端（src/）**
- `src/lib/investment/etfRegistry.ts`：新增 10 支 ETF
- `src/app/investment/compare/`：新增 AUM 規模面板
- `src/app/investment/[etf]/`：新增雙軸疊圖元件
- `src/components/features/investment/`：新增 `AumScalePanel`、`HoldingsPriceOverlayChart`、`SignalBadge`

**資料庫**
- 新增 migration：`etf_aum_series`（AUM 日時序）、`etf_signals`（訊號記錄）
- 修改：`etf_holdings_snapshot` 相容 21 支 ETF（無 schema 變更，僅資料擴充）

**依賴**
- Python：無新增（官網 API 只需 `urllib` + `openpyxl`，均已有）
- TypeScript：無新增
