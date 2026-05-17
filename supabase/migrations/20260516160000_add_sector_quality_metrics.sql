ALTER TABLE sector_strength
    ADD COLUMN IF NOT EXISTS breadth       NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS avg_amount_5d NUMERIC(20,0),
    ADD COLUMN IF NOT EXISTS strength_score NUMERIC(8,4);
