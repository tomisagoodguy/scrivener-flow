CREATE INDEX IF NOT EXISTS idx_sector_strength_stocks_date_hit
  ON sector_strength_stocks(date DESC, is_strategy_hit)
  WHERE is_strategy_hit = true;
