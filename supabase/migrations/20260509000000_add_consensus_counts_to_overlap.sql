-- Migration: 在 etf_stock_overlap 加入共識加減碼計數欄位
-- 設計決策：DB 欄位加在 etf_stock_overlap 而非另建表
-- 既有資料保留 DEFAULT 0，不需回填
ALTER TABLE etf_stock_overlap
  ADD COLUMN IF NOT EXISTS consensus_buy_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consensus_sell_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN etf_stock_overlap.consensus_buy_count
  IS '最近 7 個自然日內，以 diff_weight >= 0.05pp 加碼此股票的 ETF 支數（COUNT DISTINCT etf_code）';

COMMENT ON COLUMN etf_stock_overlap.consensus_sell_count
  IS '最近 7 個自然日內，以 abs(diff_weight) >= 0.05pp 減碼此股票的 ETF 支數（COUNT DISTINCT etf_code）';
