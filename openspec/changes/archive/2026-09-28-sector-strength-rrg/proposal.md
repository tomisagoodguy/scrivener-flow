## Why

族群強弱功能（`/investment/sectors`）目前只用「族群平均漲幅 × 廣度 × 策略命中率」評分，完全沒有納入「相對大盤強弱」的維度——強勢族群可能只是跟著大盤漲，弱勢族群可能其實正在轉強。參考外部專案 finlab-sector-radar 的 RRG（Relative Rotation Graph）方法論，用族群平均股價相對 TAIEX 加權指數的 RS-Ratio / RS-Momentum，可以補上「領先/轉弱/改善/落後」四象限分類，讓使用者更早發現正在轉強（improving）但尚未反映在單日漲幅的族群。

## What Changes

- 新增獨立 pipeline step `SectorRrgStep`（比照現有輔助步驟架構，失敗只 log 不中斷），緊接在 `SectorStrengthStep` 之後執行
- 對每個有效族群（stock_count >= 5），用族群成分股收盤價均值 vs `taiex_total_index:收盤指數`，計算 RS-Ratio（EMA 14）與 RS-Momentum（RS-Ratio 日變化的 EMA 10），並依兩者正負分類四象限：`leading`（RS-Ratio>=1 且 Momentum>=0）、`weakening`（RS-Ratio>=1 且 Momentum<0）、`improving`（RS-Ratio<1 且 Momentum>=0）、`lagging`（RS-Ratio<1 且 Momentum<0）
- `sector_strength` table 新增三欄：`rs_ratio`、`rs_momentum`、`rrg_quadrant`（皆可為 NULL，歷史資料 < 14 個交易日時無法計算）
- `SectorRrgStep` 算完 RRG 後，用同一筆 UPDATE 把 `strength_score` 乘上象限權重（leading ×1.15 / improving ×1.05 / weakening ×0.95 / lagging ×0.85）覆蓋回 `sector_strength`；`rrg_quadrant` 為 NULL 時不覆蓋，保留 `SectorStrengthStep` 寫入的原始 `strength_score`（`sector_strength_step.py` 本身不需修改，維持輔助步驟各自獨立職責）
- `getSectorStrength.ts` 查詢欄位補上 `rs_ratio`、`rs_momentum`、`rrg_quadrant`
- `SectorDashboard.tsx` 族群列新增象限徽章（四色標示，遵循台股色彩慣例：leading/improving 用紅色系表示正向、weakening/lagging 用綠色系表示負向，而非 RRG 原始配色）

## Non-Goals

- 不做外部專案的「法人籌碼共振」「庫存循環改善」「籌碼集中度」等其他因子（本次只做 RRG 一項，其餘留待後續 change 個別評估）
- 不引入外部專案的架構（GitHub Actions + JSON 落地 + Vercel），資料流全程走現有 Supabase upsert 模式
- 不新增前端獨立的 RRG 四象限散佈圖頁面（僅在既有族群列表加徽章），視覺化圖表留待後續需求明確再做
- 不回補歷史 `rs_ratio`/`rs_momentum`（僅從部署日起算，歷史 NULL 屬正常）

## Capabilities

### New Capabilities

- `sector-rrg-signal`: 族群相對大盤強弱（RRG）訊號計算 pipeline step，含 RS-Ratio/RS-Momentum 計算與四象限分類，寫入 `sector_strength` 新欄位

### Modified Capabilities

- `sector-strength-web`: `/investment/sectors` 頁面查詢與顯示新增 RRG 象限欄位

## Impact

- Affected specs: `sector-rrg-signal`（new）, `sector-strength-web`（modified）
- Affected code:
  - New:
    - ETF/pipeline/steps/sector_rrg_step.py
    - supabase/migrations/20260928000000_add_sector_rrg_columns.sql
  - Modified:
    - ETF/pipeline/orchestrator.py
    - src/app/actions/getSectorStrength.ts
    - src/app/investment/sectors/SectorDashboard.tsx
    - openspec/specs/sector-strength-web/spec.md
