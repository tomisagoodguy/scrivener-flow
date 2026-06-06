-- Add retail sentiment columns to market_breadth_daily
-- Uses ADD COLUMN IF NOT EXISTS for idempotency

ALTER TABLE market_breadth_daily
  ADD COLUMN IF NOT EXISTS small_holder_chg_12w NUMERIC,
  ADD COLUMN IF NOT EXISTS small_holder_z_score NUMERIC,
  ADD COLUMN IF NOT EXISTS is_retail_accelerating BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_odd_lot_fragmented BOOLEAN;
