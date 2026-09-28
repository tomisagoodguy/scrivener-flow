# sector-rrg-signal Specification

## Purpose

TBD - created by syncing change 'sector-strength-rrg'. Update Purpose after archive.

## Requirements

### Requirement: 計算族群相對大盤 RRG 訊號並寫入 DB

Pipeline `SectorRrgStep` SHALL 在每個交易日盤後，對每個有效族群（`stock_count >= 5`，與 `SectorStrengthStep` 相同門檻）計算相對 TAIEX 加權指數的 RS-Ratio 與 RS-Momentum，分類四象限，並寫入 `sector_strength` 表的 `rs_ratio`、`rs_momentum`、`rrg_quadrant` 欄位。

RS-Ratio 計算：族群成分股收盤價簡單平均序列除以其起始值，除以 TAIEX 收盤指數序列除以其起始值，取 EMA(span=14, min_periods=14) 最新值。
RS-Momentum 計算：RS-Ratio 序列的日變化率（`pct_change()`），取 EMA(span=10, min_periods=10) 最新值。

#### Scenario: 正常計算並寫入
- **WHEN** `SectorRrgStep.execute()` 被呼叫，且該族群歷史資料 >= 14 個交易日
- **THEN** 從 FinLab 取得 `price:收盤價` 與 `taiex_total_index:收盤指數`
- **THEN** 計算該族群的 rs_ratio 與 rs_momentum
- **THEN** UPDATE `sector_strength` 對應 `date + category` 列的 `rs_ratio`、`rs_momentum` 欄位

#### Scenario: 歷史資料不足時寫入 NULL
- **WHEN** 族群歷史資料 < 14 個交易日（EMA min_periods 未滿足）
- **THEN** `rs_ratio`、`rs_momentum`、`rrg_quadrant` 三欄 SHALL 皆寫入 NULL
- **THEN** 不得用 0 或任何估計值填補

#### Scenario: 步驟失敗不中斷 pipeline
- **WHEN** FinLab API 呼叫或 DB UPDATE 失敗
- **THEN** 記錄 error log
- **THEN** 不 raise exception，pipeline 繼續執行後續步驟

##### Example: FinLab 呼叫逾時
- **GIVEN** `fd.get("taiex_total_index:收盤指數")` 拋出 `ConnectionError`
- **WHEN** `SectorRrgStep.execute()` 執行到該呼叫
- **THEN** `self.logger.error()` 記錄含 "SectorRrgStep failed" 字樣的錯誤訊息
- **THEN** `execute()` 正常 return `ctx`（不拋出例外），下一個 pipeline 步驟（如 `SyncCompanyStep`）照常執行

### Requirement: 四象限分類邏輯

`SectorRrgStep` SHALL 依 `rs_ratio` 與 `rs_momentum` 的正負組合，將族群分類至四象限之一：`leading`、`weakening`、`improving`、`lagging`。

#### Scenario: 分類規則
- **WHEN** `rs_ratio >= 1.0` 且 `rs_momentum >= 0`
- **THEN** `rrg_quadrant` SHALL 為 `leading`
- **WHEN** `rs_ratio >= 1.0` 且 `rs_momentum < 0`
- **THEN** `rrg_quadrant` SHALL 為 `weakening`
- **WHEN** `rs_ratio < 1.0` 且 `rs_momentum >= 0`
- **THEN** `rrg_quadrant` SHALL 為 `improving`
- **WHEN** `rs_ratio < 1.0` 且 `rs_momentum < 0`
- **THEN** `rrg_quadrant` SHALL 為 `lagging`

##### Example: 四象限邊界值

| rs_ratio | rs_momentum | rrg_quadrant |
|----------|-------------|---------------|
| 1.05     | 0.002       | leading       |
| 1.02     | -0.001      | weakening     |
| 0.97     | 0.003       | improving     |
| 0.95     | -0.002      | lagging       |
| 1.00     | 0.000       | leading       |

#### Scenario: rs_ratio 或 rs_momentum 任一為 NULL
- **WHEN** `rs_ratio` 或 `rs_momentum` 為 NaN
- **THEN** `rrg_quadrant` SHALL 為 NULL

### Requirement: strength_score 依象限加權覆蓋

`SectorRrgStep` SHALL 在寫入 `rrg_quadrant` 非 NULL 的族群時，用象限對應權重乘上 `sector_strength.strength_score` 既有值並覆蓋寫回；`rrg_quadrant` 為 NULL 時 SHALL NOT 修改 `strength_score`。

象限權重：`leading=1.15`、`improving=1.05`、`weakening=0.95`、`lagging=0.85`。

#### Scenario: 有象限時加權覆蓋
- **WHEN** 族群 `rrg_quadrant` 計算為 `leading`，原 `strength_score = 0.02`
- **THEN** UPDATE 後 `strength_score` SHALL 為 `0.02 * 1.15 = 0.023`

#### Scenario: 無象限時不覆蓋
- **WHEN** 族群 `rrg_quadrant` 為 NULL（歷史資料不足）
- **THEN** `strength_score` SHALL 維持 `SectorStrengthStep` 原始寫入值不變

#### Scenario: 找不到對應列時不報錯
- **WHEN** UPDATE 條件 `date + category` 在 `sector_strength` 中不存在對應列（例如 `SectorStrengthStep` 該族群當日未達 `stock_count >= 5` 門檻）
- **THEN** UPDATE 影響 0 列
- **THEN** 記錄 warning log，不 raise exception

### Requirement: DB Schema - sector_strength RRG 欄位

`sector_strength` table SHALL 新增欄位：`rs_ratio`（NUMERIC(8,4)，可為 NULL）、`rs_momentum`（NUMERIC(8,4)，可為 NULL）、`rrg_quadrant`（TEXT，可為 NULL，合法值為 `leading`/`weakening`/`improving`/`lagging` 之一或 NULL）。

#### Scenario: Migration 冪等
- **WHEN** migration 重複執行
- **THEN** 使用 `ADD COLUMN IF NOT EXISTS`，不因欄位已存在而報錯
