-- 加權指數季線狀態（taiex-ma60-regime）：由 pipeline TaiexMa60RegimeStep 每日寫入一列
-- break_type：當日跌破分類 first_break / rebreak_rising / break_falling（非跌破日為 NULL）
-- state：above / below_after_first_break / below_after_rebreak / below_ma_falling
-- stats：first_break / rebreak_rising / break_falling / down_day 四組 20 日後歷史統計（每日全歷史重算）
CREATE TABLE IF NOT EXISTS public.taiex_ma60_regime_daily (
  date                 DATE PRIMARY KEY,
  close                FLOAT NOT NULL,
  ma60                 FLOAT,
  ma60_slope20         FLOAT,
  ma_rising            BOOLEAN,
  days_above           INT,
  break_type           TEXT,
  state                TEXT NOT NULL,
  wave_break_count     INT,
  next_break_threshold FLOAT,
  next_break_type      TEXT,
  stats                JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.taiex_ma60_regime_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "公開讀取" ON public.taiex_ma60_regime_daily FOR SELECT USING (true);
