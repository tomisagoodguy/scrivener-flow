-- Add mid-holder (200+張) and whale-holder (1000+張) columns to equity_distribution_stats
ALTER TABLE public.equity_distribution_stats
    ADD COLUMN IF NOT EXISTS mid_holder_pct NUMERIC(7,3),
    ADD COLUMN IF NOT EXISTS mid_holder_pct_change NUMERIC(7,3),
    ADD COLUMN IF NOT EXISTS whale_holder_pct NUMERIC(7,3),
    ADD COLUMN IF NOT EXISTS whale_holder_pct_change NUMERIC(7,3);

CREATE INDEX IF NOT EXISTS idx_equity_dist_mid_holder
    ON public.equity_distribution_stats (snapshot_date DESC, mid_holder_pct_change DESC);

CREATE INDEX IF NOT EXISTS idx_equity_dist_whale_holder
    ON public.equity_distribution_stats (snapshot_date DESC, whale_holder_pct_change DESC);
