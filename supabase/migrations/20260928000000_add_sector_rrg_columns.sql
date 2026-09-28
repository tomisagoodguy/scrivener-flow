ALTER TABLE sector_strength
    ADD COLUMN IF NOT EXISTS rs_ratio      NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS rs_momentum   NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS rrg_quadrant  TEXT;
