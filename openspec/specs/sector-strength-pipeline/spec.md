# sector-strength-pipeline Specification

## Purpose

TBD - created by archiving change 'sector-strength-dashboard'. Update Purpose after archive.

## Requirements

### Requirement: 每日計算族群漲幅並存入 DB
Pipeline 在每個交易日盤後 SHALL 計算全市場所有族群（家數 >= 5）的日/週/月平均漲幅，存入 `sector_strength` table，並同步儲存各族群成分股當日漲幅至 `sector_strength_stocks` table。

#### Scenario: 正常執行
- **WHEN** `SectorStrengthStep.run()` 被呼叫
- **THEN** 從 FinLab 取得 `security_industry_themes` 與 `price:收盤價`
- **THEN** 計算每個族群（家數 >= 5）的 ret_1d / ret_5d / ret_20d 平均漲幅
- **THEN** upsert 當日資料至 `sector_strength`（以 date + category 為唯一鍵）
- **THEN** upsert 成分股漲幅至 `sector_strength_stocks`

#### Scenario: 步驟失敗不中斷 pipeline
- **WHEN** FinLab API 或 DB 寫入失敗
- **THEN** 記錄 error log
- **THEN** 不 raise exception，pipeline 繼續執行後續步驟


<!-- @trace
source: sector-strength-dashboard
updated: 2026-05-16
code:
  - tsconfig.tsbuildinfo
  - ETF/CLAUDE.md
  - CLAUDE.md
-->

---
### Requirement: 計算族群品質指標並寫入 DB

Pipeline `SectorStrengthStep` SHALL compute three quality metrics per sector and store them in `sector_strength` table alongside existing return columns.

Metrics:

- `breadth`: ratio of constituent stocks with `ret_1d > 0` (0.0–1.0, 4 decimal places)
- `avg_amount_5d`: sum of constituent stocks 5-day average trading amount (NT dollars, integer)
- `strength_score`: `ret_1d × breadth` (signed float, represents both magnitude and breadth)

#### Scenario: 正常計算三項品質指標

- **WHEN** `SectorStrengthStep._run()` executes successfully
- **THEN** for each valid sector (stock_count >= 5), `breadth` SHALL be computed as count(ret_1d > 0) / stock_count
- **THEN** `avg_amount_5d` SHALL be computed as the sum of each constituent stock's 5-trading-day average amount (using `price:成交金額` iloc[-6:-1].mean())
- **THEN** `strength_score` SHALL be computed as `ret_1d × breadth`
- **THEN** all three values SHALL be upserted into `sector_strength` alongside existing columns

##### Example: breadth calculation

| Sector stocks ret_1d | breadth result |
|----------------------|----------------|
| [+2%, +1%, -0.5%, +0.3%, -1%] | 3/5 = 0.60 |
| [+0.1%, +0.2%, +0.5%, +1%, +0.8%] | 5/5 = 1.00 |
| [-1%, -2%, -0.5%, -0.1%, +0.1%] | 1/5 = 0.20 |

##### Example: strength_score calculation

| ret_1d | breadth | strength_score |
|--------|---------|----------------|
| 0.018  | 0.60    | 0.0108         |
| -0.005 | 0.20    | -0.0010        |
| 0.007  | 1.00    | 0.0070         |

#### Scenario: 成交金額資料不足時的處理

- **WHEN** a constituent stock has fewer than 5 trading days of `price:成交金額` data
- **THEN** that stock's avg_5d SHALL be NaN and SHALL be excluded from the sector `avg_amount_5d` sum
- **WHEN** all constituent stocks in a sector have NaN avg_5d
- **THEN** `avg_amount_5d` SHALL be stored as NULL in DB

#### Scenario: DB upsert 包含新欄位

- **WHEN** `_upsert_sectors()` is called
- **THEN** the INSERT statement SHALL include `breadth`, `avg_amount_5d`, `strength_score` columns
- **THEN** the ON CONFLICT DO UPDATE clause SHALL also update all three new columns


<!-- @trace
source: sector-strength-quality-filter
updated: 2026-05-17
code:
  - next-env.d.ts
  - src/app/actions/getSectorStrength.ts
  - ETF/run_strategies.py
  - ETF/daily_ai_report.py
  - src/app/investment/sectors/SectorDashboard.tsx
  - .github/workflows/etf_daily.yml
  - supabase/migrations/20260516160000_add_sector_quality_metrics.sql
  - ETF/pipeline/steps/sector_strength_step.py
-->

---
### Requirement: DB Schema - sector_strength
`sector_strength` table SHALL 包含欄位：`id`, `date`, `category`, `ret_1d`, `ret_5d`, `ret_20d`, `stock_count`, `created_at`。date + category 為 UNIQUE 複合鍵。

#### Scenario: Upsert 重複執行冪等
- **WHEN** 同一 date + category 已存在資料
- **THEN** 以新資料覆蓋（ON CONFLICT DO UPDATE）


<!-- @trace
source: sector-strength-dashboard
updated: 2026-05-16
code:
  - tsconfig.tsbuildinfo
  - ETF/CLAUDE.md
  - CLAUDE.md
-->

---
### Requirement: DB Schema - sector_strength_stocks
`sector_strength_stocks` table SHALL 包含欄位：`id`, `date`, `category`, `stock_id`, `stock_name`, `ret_1d`, `ret_5d`, `ret_20d`, `is_strategy_hit`, `momentum_score`, `created_at`。

#### Scenario: Upsert 包含策略欄位
- **WHEN** SectorStrengthStep 執行 upsert
- **THEN** `is_strategy_hit` 與 `momentum_score` 一併寫入
- **WHEN** 同一 date + category + stock_id 已存在
- **THEN** ON CONFLICT DO UPDATE 更新所有欄位含新欄位

<!-- @trace
source: sector-strategy-signal
updated: 2026-05-16
code:
  - ETF/CLAUDE.md
  - tsconfig.tsbuildinfo
  - CLAUDE.md
-->