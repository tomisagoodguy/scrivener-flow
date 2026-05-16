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