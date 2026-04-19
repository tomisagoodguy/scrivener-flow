-- 股東分散統計表：ETF 成分股每週籌碼排行榜
-- 由 ETF/sync_equity_distribution.py 每週一更新
-- 欄位說明：
--   big_holder_pct      = 持股 400 張以上（tier >= 12）的持股比例加總
--   big_holder_pct_change = 本期 - 前期（percentage point）
--   shareholders_change_rate = (本期 - 前期) / 前期 × 100

CREATE TABLE IF NOT EXISTS public.equity_distribution_stats (
    stock_code               TEXT        NOT NULL,
    snapshot_date            DATE        NOT NULL,
    total_shareholders       INTEGER,
    big_holder_pct           NUMERIC(7, 3),
    shareholders_change_rate NUMERIC(8, 4),
    big_holder_pct_change    NUMERIC(7, 3),
    stock_name               TEXT,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (stock_code, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_equity_dist_date
    ON public.equity_distribution_stats (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_equity_dist_big_holder
    ON public.equity_distribution_stats (snapshot_date DESC, big_holder_pct_change DESC);

CREATE INDEX IF NOT EXISTS idx_equity_dist_shareholders
    ON public.equity_distribution_stats (snapshot_date DESC, shareholders_change_rate ASC);

-- 公開讀取（未登入訪客亦可瀏覽排行榜）
ALTER TABLE public.equity_distribution_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "公開讀取" ON public.equity_distribution_stats;
CREATE POLICY "公開讀取" ON public.equity_distribution_stats FOR SELECT USING (true);
