-- Migration: ETF Tracker Tables (Idempotent Version)
-- Description: Create tables for etf_holdings_snapshot, etf_diff_logs, etf_holding_periods with RLS policies

-- 1. Snapshot Table
CREATE TABLE IF NOT EXISTS public.etf_holdings_snapshot (
    id UUID DEFAULT gen_random_uuid(),
    etf_code TEXT NOT NULL,
    stock_code TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    shares BIGINT NOT NULL,
    weight NUMERIC(10, 4),
    data_date DATE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    PRIMARY KEY (etf_code, stock_code) 
);

-- 2. Diff Logs
CREATE TABLE IF NOT EXISTS public.etf_diff_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etf_code TEXT NOT NULL,
    data_date DATE NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('IN', 'OUT', 'BUY', 'SELL')),
    stock_code TEXT NOT NULL,
    stock_name TEXT,
    diff_shares BIGINT,
    diff_weight NUMERIC(10, 4),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Holding Periods
CREATE TABLE IF NOT EXISTS public.etf_holding_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etf_code TEXT NOT NULL,
    stock_code TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes (Idempotent via IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_etf_snapshot_code ON public.etf_holdings_snapshot(etf_code);
CREATE INDEX IF NOT EXISTS idx_etf_diff_date ON public.etf_diff_logs(data_date);
CREATE INDEX IF NOT EXISTS idx_etf_period_active ON public.etf_holding_periods(etf_code, is_active);

-- Enable RLS
ALTER TABLE public.etf_holdings_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etf_diff_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etf_holding_periods ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation using DO blocks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etf_holdings_snapshot' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.etf_holdings_snapshot FOR SELECT USING (true);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etf_diff_logs' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.etf_diff_logs FOR SELECT USING (true);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etf_holding_periods' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.etf_holding_periods FOR SELECT USING (true);
    END IF;
END
$$;
