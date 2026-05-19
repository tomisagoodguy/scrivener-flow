-- stock_basic_info.industry: 産業分類欄位（由 SyncCompanyStep 寫入 FinLab 産業別）
ALTER TABLE public.stock_basic_info
    ADD COLUMN IF NOT EXISTS industry TEXT;
