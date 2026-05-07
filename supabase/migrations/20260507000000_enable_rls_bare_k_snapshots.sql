-- bare_k_snapshots 啟用 RLS：公開讀取，寫入限 service role
-- 此表無 user_id，為共享市場資料；ETF pipeline 以 service role 寫入可繞過 RLS

ALTER TABLE public.bare_k_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "公開讀取" ON public.bare_k_snapshots
    FOR SELECT USING (true);
