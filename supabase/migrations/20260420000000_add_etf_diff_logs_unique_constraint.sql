-- etf_diff_logs 補上 (etf_code, stock_code, data_date) 唯一約束
-- 供 ON CONFLICT upsert 使用
-- 步驟 1：刪除重複列，保留最新 id

DELETE FROM public.etf_diff_logs
WHERE id NOT IN (
    SELECT DISTINCT ON (etf_code, stock_code, data_date) id
    FROM public.etf_diff_logs
    ORDER BY etf_code, stock_code, data_date, id DESC
);

-- 步驟 2：加唯一約束

ALTER TABLE public.etf_diff_logs
    ADD CONSTRAINT etf_diff_logs_etf_code_stock_code_data_date_key
    UNIQUE (etf_code, stock_code, data_date);
