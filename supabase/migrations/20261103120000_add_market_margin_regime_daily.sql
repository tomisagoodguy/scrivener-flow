-- 融資創一年新高狀態（margin-regime-card）：由 pipeline MarginRegimeStep 每日寫入一列
-- margin_balance：上市＋上櫃融資金額（億元，FinLab margin_balance:融資券總餘額）
-- margin_1y_high：融資 ≥ 含當日 250 個交易日最大值；index_near_high：加權指數收盤 ≥ 250 日最高 × 0.97
-- stats：融資創高／平常日／指數創高但融資沒創高三組的之後 60 日跌一成比例、差距 95% 區間、影子比例（每日全歷史重算）
CREATE TABLE IF NOT EXISTS public.market_margin_regime_daily (
  date             DATE PRIMARY KEY,
  margin_balance   FLOAT NOT NULL,
  margin_1y_high   BOOLEAN NOT NULL,
  index_near_high  BOOLEAN NOT NULL,
  stats            JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.market_margin_regime_daily ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'market_margin_regime_daily' AND policyname = '公開讀取'
  ) THEN
    CREATE POLICY "公開讀取" ON public.market_margin_regime_daily FOR SELECT USING (true);
  END IF;
END $$;
