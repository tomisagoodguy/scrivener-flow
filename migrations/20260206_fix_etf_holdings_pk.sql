
-- Fix etf_holdings_snapshot Primary Key to include data_date
-- Date: 2026-02-06
-- Reason: To allow storing historical snapshots properly

BEGIN;

ALTER TABLE etf_holdings_snapshot 
DROP CONSTRAINT IF EXISTS etf_holdings_snapshot_pkey;

ALTER TABLE etf_holdings_snapshot 
ADD CONSTRAINT etf_holdings_snapshot_pkey PRIMARY KEY (etf_code, stock_code, data_date);

COMMIT;
