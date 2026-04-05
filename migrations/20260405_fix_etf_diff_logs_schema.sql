-- Migration: Fix etf_diff_logs schema
-- Description: Add CLOSE/TRIM to change_type CHECK, add missing columns (prev/curr shares/weight, is_significant)

-- 1. Drop old CHECK constraint on change_type
ALTER TABLE public.etf_diff_logs
    DROP CONSTRAINT IF EXISTS etf_diff_logs_change_type_check;

-- 2. Add new CHECK constraint that includes CLOSE and TRIM
ALTER TABLE public.etf_diff_logs
    ADD CONSTRAINT etf_diff_logs_change_type_check
    CHECK (change_type IN ('IN', 'OUT', 'BUY', 'SELL', 'CLOSE', 'TRIM'));

-- 3. Add missing columns (idempotent via IF NOT EXISTS)
ALTER TABLE public.etf_diff_logs
    ADD COLUMN IF NOT EXISTS prev_shares BIGINT,
    ADD COLUMN IF NOT EXISTS curr_shares BIGINT,
    ADD COLUMN IF NOT EXISTS prev_weight NUMERIC(10, 4),
    ADD COLUMN IF NOT EXISTS curr_weight NUMERIC(10, 4),
    ADD COLUMN IF NOT EXISTS is_significant BOOLEAN DEFAULT true;

-- 4. Ensure index on change_type for filtering
CREATE INDEX IF NOT EXISTS idx_etf_diff_change_type ON public.etf_diff_logs(change_type);
