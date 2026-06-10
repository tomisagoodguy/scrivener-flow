-- Add change_category semantic label to etf_diff_logs
-- Maps change_type to: added / removed / increased / decreased
ALTER TABLE etf_diff_logs
    ADD COLUMN IF NOT EXISTS change_category VARCHAR(20);
