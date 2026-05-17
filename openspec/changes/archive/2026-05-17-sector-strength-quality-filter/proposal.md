## Why

目前族群強勢判斷只看「日報酬 > 0」，任何族群只要當日均線微幅翻正就列入，導致「正報酬」清單過多、訊號稀釋，代表性不足。需要加入趨勢一致性、成分股廣度與量能配合三個維度，篩出真正有資金輪動意義的強勢族群。

## What Changes

- **Pipeline**：`SectorStrengthStep` 新增計算三項品質指標：
  - `breadth`：族群內日漲幅 > 0 的成分股比例（0–1）
  - `avg_amount_5d`：族群過去 5 個交易日平均成交金額（元）
  - `strength_score`：綜合強勢分（ret_1d × breadth，加權後排序用）
- **DB Migration**：`sector_strength` 資料表新增 `breadth NUMERIC(5,4)`, `avg_amount_5d NUMERIC(20,0)`, `strength_score NUMERIC(8,4)` 三欄
- **前端**：新增「強勢」篩選模式（同時滿足：ret_1d > 0 AND ret_5d > 0 AND breadth ≥ 0.4 AND total_amount ≥ avg_amount_5d × 0.8），與現有「正報酬」、「全部」並列
- **LINE 通知**：`build_sector_summary()` 改以品質條件篩選（ret_1d > 0 AND ret_5d > 0 AND breadth ≥ 0.40），並依 `strength_score` 降序取 TOP 5，讓 LINE 報告反映與前端「強勢」模式一致的族群

## Non-Goals

- 不調整 `MIN_STOCK_COUNT = 5` 門檻
- 不改變族群分類來源（仍使用 FinLab `security_industry_themes`），不合併粗粒度父類別
- 不新增 Treemap / 熱力圖視覺化（另立 change）
- `avg_amount_5d` 使用 Pipeline 當日從 FinLab 取得的 5 日窗口，不從 DB 歷史回算

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `sector-strength-pipeline`：新增 breadth / avg_amount_5d / strength_score 三項指標計算，並寫入 DB
- `sector-strength-web`：新增「強勢」篩選模式，依三條件同時滿足篩選族群
- `sector-strength-line`：LINE 族群摘要改用品質條件篩選並依 strength_score 排序

## Impact

- Affected specs: sector-strength-pipeline, sector-strength-web, sector-strength-line
- Affected code:
  - Modified: ETF/pipeline/steps/sector_strength_step.py
  - Modified: ETF/daily_ai_report.py
  - Modified: src/app/actions/getSectorStrength.ts
  - Modified: src/app/investment/sectors/SectorDashboard.tsx
  - New: supabase/migrations/20260516160000_add_sector_quality_metrics.sql
