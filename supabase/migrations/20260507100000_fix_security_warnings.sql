-- 修復 Security Advisor 警告（2026-05-07）

-- 1. 修復 update_redemption_steps_updated_at search_path 未固定
CREATE OR REPLACE FUNCTION public.update_redemption_steps_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 2. 移除 etf_news 過度開放的 INSERT / DELETE 政策
--    service_role 繞過 RLS，不需要 USING(true) 政策；anon/authenticated 不應能寫入
DROP POLICY IF EXISTS "etf_news_insert" ON public.etf_news;
DROP POLICY IF EXISTS "etf_news_delete" ON public.etf_news;

-- 3. 撤銷 cleanup_old_encryption_keys 對 anon / authenticated 的執行權限
--    此函數為 SECURITY DEFINER，只應由 service_role 於後端觸發
REVOKE EXECUTE ON FUNCTION public.cleanup_old_encryption_keys() FROM anon, authenticated;
