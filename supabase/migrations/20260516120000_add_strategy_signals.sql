CREATE TABLE IF NOT EXISTS strategy_signals (
  id          BIGSERIAL PRIMARY KEY,
  strategy_id TEXT NOT NULL,
  date        DATE NOT NULL,
  stock_id    TEXT NOT NULL,
  score       FLOAT,
  is_selected BOOLEAN NOT NULL,
  conditions  JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (strategy_id, date, stock_id)
);

CREATE INDEX IF NOT EXISTS idx_strategy_signals_strategy_date
  ON strategy_signals (strategy_id, date);
