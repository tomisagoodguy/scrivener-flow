-- Add detail fields to etf_news table
-- These columns store data fetched from the MOPS detail API (t05st02_detail)
ALTER TABLE etf_news ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE etf_news ADD COLUMN IF NOT EXISTS speaker TEXT;
ALTER TABLE etf_news ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE etf_news ADD COLUMN IF NOT EXISTS company_name TEXT;
