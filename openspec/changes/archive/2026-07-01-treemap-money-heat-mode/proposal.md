## Why

`/investment/sectors` 的熱力圖目前只以「市值」決定方塊大小、以「漲跌幅」上色，能看出漲跌分佈，但看不出「今天資金往哪裡集中」。市面上（如 aistockmap.com）常見以「漲幅 × 成交量/成交值」估算個股當日資金熱度，可補足這個視角。

我們已用 finlab 實測驗證此 proxy 與既有 `etf_flow_daily`（法人實際持股異動）的相關性：pooled Spearman ≈ +0.11、逐日方向同向率 ≈ 50%。結論是兩者**幾乎不相關、量測的是不同東西**——proxy 反映的是全市場當日量能/情緒，法人 flow 反映的是主動 ETF 經理人籌碼。因此此 proxy 不可當作法人 flow 的替代，但作為**全市場覆蓋（含非 ETF 成分股）的當日資金熱度**是有價值且互補的獨立視角。

finlab 資料庫已提供 `price:成交金額`（成交值），可直接餵給既有的 `SyncTreemapStep`，成本低。

## What Changes

- `market_treemap_daily` 新增 `turnover`（成交值，元）欄位。
- `SyncTreemapStep` 額外抓取 `price:成交金額`，寫入 `turnover`。
- `getTreemapData` server action 於查詢與 `TreemapStock` 型別中帶出 `turnover`。
- `SectorTreemap` 元件新增「顯示維度」切換：`市值`（現況預設）與 `資金熱度`。選 `資金熱度` 時方塊大小 = `|change_pct| × turnover`，顏色維持台股慣例（紅漲綠跌），並顯示明確標示文字說明此為「量能估算，非法人資金流向」。

## Non-Goals

- 不改動 `etf_flow_daily` / `DailyFlowPanel`（真實法人 flow），兩者語意刻意區隔。
- 不把 proxy 當作法人 flow 的替代或校正來源。
- 不新增獨立頁面或路由；只在既有 `/investment/sectors` 熱力圖內加模式切換。
- 不做歷史回補（backfill）；`turnover` 從此步驟上線後往前自然累積，舊列 `turnover` 為 null 時「資金熱度」模式回退為現有市值排序不報錯。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `sector-treemap-view`: 新增「資金熱度」顯示維度，並讓 pipeline 與資料表帶出成交值 `turnover`。

## Impact

- Affected specs: sector-treemap-view
- Affected code:
  - New:
    - supabase/migrations/20260701120000_add_treemap_turnover.sql
  - Modified:
    - ETF/pipeline/steps/sync_treemap_step.py
    - src/app/actions/getTreemapData.ts
    - src/app/investment/sectors/components/SectorTreemap.tsx
  - Removed: (none)
