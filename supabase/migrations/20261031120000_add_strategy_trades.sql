-- 策略持有期間（換股後表現）：由 pipeline StrategyTradeStep 從 FinLab positions 歷史推導
-- 每列＝某策略持有某股票的一段期間；進出場價為訊號日隔一個交易日的開盤價
-- 報酬以還原股價計算（小數，0.07 = 7%），原始價格另存供顯示
CREATE TABLE IF NOT EXISTS public.strategy_trades (
  id                BIGSERIAL PRIMARY KEY,
  strategy_id       TEXT NOT NULL,
  stock_id          TEXT NOT NULL,
  entry_signal_date DATE NOT NULL,
  entry_date        DATE,
  entry_price       FLOAT,
  exit_signal_date  DATE,
  exit_date         DATE,
  exit_price        FLOAT,
  latest_date       DATE,
  latest_close      FLOAT,
  holding_return    FLOAT,
  post_exit_return  FLOAT,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (strategy_id, stock_id, entry_signal_date)
);

CREATE INDEX IF NOT EXISTS idx_strategy_trades_strategy_exit
  ON public.strategy_trades (strategy_id, exit_date);

ALTER TABLE public.strategy_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "公開讀取" ON public.strategy_trades FOR SELECT USING (true);
