## ADDED Requirements

### Requirement: strategy_signals score column semantics

The `score` column in `strategy_signals` SHALL support strategy-specific value ranges. Consumers of `strategy_signals` SHALL NOT apply a universal threshold to `score` across all strategy types; they MUST filter by `strategy_id` first and interpret `score` according to the strategy definition.

For `strategy_id = 'fund_momentum'`: `score` is a 0–100 integer representing the market-wide percentile rank of 20-day cumulative investment trust net-buy shares (higher = stronger relative buying pressure).

For all other existing strategy types: `score` semantics are unchanged (0/1 boolean-equivalent).

#### Scenario: Front-end reads fund_momentum score

- **WHEN** `getStrategySignals()` or `getFundMomentumSignals()` returns rows with `strategy_id = 'fund_momentum'`
- **THEN** the caller SHALL interpret `score` as a 0–100 percentile rank
- **THEN** the caller SHALL NOT compare `score > 0.5` or any threshold intended for boolean strategies

#### Scenario: Existing strategy scores unaffected

- **WHEN** rows have `strategy_id` other than `fund_momentum`
- **THEN** the `score` values SHALL remain in their original boolean-equivalent format
- **THEN** no migration of existing rows is required
