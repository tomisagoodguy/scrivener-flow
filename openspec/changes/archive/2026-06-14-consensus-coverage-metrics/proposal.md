## Why

`/investment/consensus` 共識頁目前只顯示「持有 ETF 數」與「合計權重」。原始 ETF 數的分母會隨當日爬取成功的 ETF 數浮動（22 vs 18 意義不同），無法跨日比較；合計權重則把不同 AUM 基數的 weight 直接加總，數學上無物理意義卻未向使用者揭露。競品（active-etf-tracker）以「覆蓋率 %」正規化、補「平均 weight」並附計算說明，可信度較高。本變更補齊這三點，且全部用現有資料即時計算，不需新增欄位或改動 pipeline。

## What Changes

- 共識頁表格新增 **覆蓋率 %** 欄：`持有 ETF 數 ÷ 當日有持股資料的 ETF 數 × 100`。分母由當日 `etf_holdings_snapshot` 的 distinct `etf_code` 即時查得，不寫死。
- 新增 **平均 weight** 欄：`合計權重 ÷ 持有 ETF 數`，置於合計權重欄左側，代表「對持有它的 ETF 是否為大部位」。
- 「合計權重」欄標題或頁面加註誠實警語：各 ETF AUM 基數不同，加總僅供排序、無實際比例意義。
- 頁面頂部新增 `.glass-card` 衍生欄位說明框，列出覆蓋率 %、平均 weight、合計權重三者的計算方式與限制。

## Non-Goals

- 不做 AUM 加權的真實綜合權重（`Σ(weight × AUM) / Σ(AUM)`）。`etf_aum_series` 資料停更約 7 週且僅覆蓋 14/22 支，硬算會比現況更誤導；待 AUM pipeline 修復後另開 change。
- 不改動 `etf_stock_overlap` schema、不新增 migration、不改動 ETF pipeline。
- 不改動「分歧（divergence）」tab 的既有行為。

## Capabilities

### New Capabilities

- `consensus-coverage-metrics`: 共識頁衍生指標（覆蓋率 %、平均 weight）的即時計算與顯示，以及衍生欄位計算說明與合計權重警語。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `consensus-coverage-metrics`
- Affected code:
  - Modified: src/app/investment/consensus/page.tsx
  - New: (none)
  - Removed: (none)
