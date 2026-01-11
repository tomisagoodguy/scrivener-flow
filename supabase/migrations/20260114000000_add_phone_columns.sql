-- Migration to add buyer_phone and seller_phone columns to cases table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;
