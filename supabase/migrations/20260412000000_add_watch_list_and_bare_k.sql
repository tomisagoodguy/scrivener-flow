-- =====================================================================
-- 裸K看盤雲端化：新增 watch_list 和 bare_k_snapshots 資料表
-- watch_list: 使用者自選股清單（RLS 隔離）
-- bare_k_snapshots: 裸K六面板指標快照（每日更新，無 RLS）
-- =====================================================================

-- ── watch_list ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS watch_list (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stock_id     TEXT        NOT NULL,
    name         TEXT        NOT NULL DEFAULT '',   -- 公司簡稱（快取避免每次 JOIN）
    strategies   TEXT[]      NOT NULL DEFAULT '{}', -- 策略標籤
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_list_user_stock
    ON watch_list (user_id, stock_id);

CREATE INDEX IF NOT EXISTS idx_watch_list_user_created
    ON watch_list (user_id, created_at ASC);

-- RLS
ALTER TABLE watch_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY watch_list_select ON watch_list
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY watch_list_insert ON watch_list
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY watch_list_update ON watch_list
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY watch_list_delete ON watch_list
    FOR DELETE USING (auth.uid() = user_id);

-- ── bare_k_snapshots ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bare_k_snapshots (
    stock_id     TEXT        NOT NULL,
    date         DATE        NOT NULL,
    ohlcv        JSONB       NOT NULL DEFAULT '[]', -- [{date,o,h,l,c,v}, ...]
    mas          JSONB       NOT NULL DEFAULT '{}', -- {ma5:[...], ma20:[...], ma60:[...], ma120:[...], h260:[...]}
    signals      JSONB       NOT NULL DEFAULT '[]', -- [{date,hit260,low_vol,margin_ok,rev_9max,trust_ok}, ...]
    margin       JSONB       NOT NULL DEFAULT '[]', -- [{date,rate}, ...]
    revenue      JSONB       NOT NULL DEFAULT '[]', -- [{date,yoy,mom}, ...]
    inv_chips    JSONB       NOT NULL DEFAULT '[]', -- [{date,big_chg,small_chg,pr_rank}, ...]
    summary      JSONB       NOT NULL DEFAULT '{}', -- {last_price,change_pct,dist_260_pct,signals:{...}}
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (stock_id, date)
);

CREATE INDEX IF NOT EXISTS idx_bare_k_snapshots_stock_date
    ON bare_k_snapshots (stock_id, date DESC);
