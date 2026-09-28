## ADDED Requirements

### Requirement: 族群列顯示 RRG 四象限徽章

族群強弱排行列表 SHALL 在每個族群列顯示其 RRG 四象限徽章（當 `rrg_quadrant` 非 NULL 時），文字對照：`leading`→「領先」、`improving`→「改善」、`weakening`→「轉弱」、`lagging`→「落後」。

#### Scenario: 顯示徽章
- **WHEN** 族群的 `rrg_quadrant` 為 `leading`
- **THEN** 該族群列 SHALL 顯示「領先」徽章
- **THEN** 徽章顏色 SHALL 遵循台股色彩慣例（`leading`/`improving` 為正向用紅色系，`weakening`/`lagging` 為負向用綠色系）

#### Scenario: 無 RRG 資料時不顯示徽章
- **WHEN** 族群的 `rrg_quadrant` 為 NULL（歷史資料不足 14 個交易日）
- **THEN** 該族群列 SHALL NOT 顯示徽章或任何「無資料」佔位文字
