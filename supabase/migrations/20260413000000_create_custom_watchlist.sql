CREATE TABLE IF NOT EXISTS custom_watchlist (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stock_code  TEXT        NOT NULL,
    label       TEXT        NOT NULL DEFAULT '自選',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT custom_watchlist_user_stock_unique UNIQUE (user_id, stock_code)
);

ALTER TABLE custom_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_watchlist_select" ON custom_watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "custom_watchlist_insert" ON custom_watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "custom_watchlist_delete" ON custom_watchlist FOR DELETE USING (auth.uid() = user_id);
