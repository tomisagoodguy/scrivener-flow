-- 買進模式 vs 平常日基準統計：由 pipeline BuyingPatternStep 每日整批重算（交易內 DELETE + INSERT）
-- 每列＝某模式在某天期（日曆天）的樣本統計、同期平常日基準、週區塊重抽 5000 次的超額 95% 區間
-- 比率與報酬皆為小數（0.07 = 7%）；樣本 < 30 筆或 < 8 週時四個 excess 欄位為 NULL
CREATE TABLE IF NOT EXISTS public.etf_buying_pattern_stats (
  pattern_type        TEXT NOT NULL,
  horizon             INT NOT NULL,
  n                   INT NOT NULL,
  n_weeks             INT NOT NULL,
  win_rate            FLOAT,
  avg_return          FLOAT,
  baseline_n          INT NOT NULL,
  baseline_win_rate   FLOAT,
  baseline_avg_return FLOAT,
  excess_win_lo       FLOAT,
  excess_win_hi       FLOAT,
  excess_ret_lo       FLOAT,
  excess_ret_hi       FLOAT,
  period_start        DATE,
  period_end          DATE,
  computed_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pattern_type, horizon)
);

ALTER TABLE public.etf_buying_pattern_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'etf_buying_pattern_stats' AND policyname = '公開讀取'
  ) THEN
    CREATE POLICY "公開讀取" ON public.etf_buying_pattern_stats FOR SELECT USING (true);
  END IF;
END $$;
