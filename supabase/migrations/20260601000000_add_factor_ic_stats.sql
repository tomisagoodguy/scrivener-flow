CREATE TABLE IF NOT EXISTS factor_ic_stats (
  month        date        NOT NULL,
  factor_name  text        NOT NULL,
  ic_1d        float,
  ic_5d        float,
  ic_20d       float,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (month, factor_name)
);

ALTER TABLE factor_ic_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read factor_ic_stats"
  ON factor_ic_stats FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role write factor_ic_stats"
  ON factor_ic_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
