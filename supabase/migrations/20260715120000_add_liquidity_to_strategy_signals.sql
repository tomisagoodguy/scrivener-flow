ALTER TABLE strategy_signals
  ADD COLUMN IF NOT EXISTS avg_turnover NUMERIC,
  ADD COLUMN IF NOT EXISTS liquidity_flag BOOLEAN;
