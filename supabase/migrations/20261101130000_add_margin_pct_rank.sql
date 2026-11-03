-- 個股當日全市場融資使用率百分位（0–100，小數 1 位）：由 pipeline OHLCVService 以 FinLab 全市場資料計算
-- 合格母體：四碼普通股（首碼非 0）、含當日 20 日均成交金額 ≥ 5,000 萬、收盤 ≥ 10 元、當日有融資使用率
-- 不合格或當日合格數 < 50 檔為 NULL；不回補歷史
ALTER TABLE public.stock_prices_daily
  ADD COLUMN IF NOT EXISTS margin_pct_rank NUMERIC;

COMMENT ON COLUMN public.stock_prices_daily.margin_pct_rank IS
  '當日全市場融資使用率百分位 0–100；不合格（非四碼普通股、20日均額<5千萬、收盤<10、無融資資料）或母體<50檔為 NULL';
