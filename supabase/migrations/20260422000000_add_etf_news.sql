-- ETF 重大公告新聞表（來源：MOPS 公開資訊觀測站）
-- 自動保留 5 天，由 CleanupStep 每日清除

CREATE TABLE IF NOT EXISTS etf_news (
    id          BIGSERIAL PRIMARY KEY,
    etf_code    TEXT        NOT NULL,
    stock_code  TEXT        NOT NULL,
    pub_date    DATE        NOT NULL,
    pub_time    TEXT,
    title       TEXT        NOT NULL,
    source      TEXT        NOT NULL DEFAULT '公開資訊觀測站',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task 1.2: 唯一約束防重複 upsert
CREATE UNIQUE INDEX IF NOT EXISTS etf_news_unique
    ON etf_news (etf_code, stock_code, pub_date, title);

-- Task 1.3: RLS
ALTER TABLE etf_news ENABLE ROW LEVEL SECURITY;

-- authenticated 與 anon 皆可讀（公開行情資料）
CREATE POLICY "etf_news_read" ON etf_news
    FOR SELECT USING (true);

-- 僅 service_role（pipeline）可寫入與刪除
CREATE POLICY "etf_news_insert" ON etf_news
    FOR INSERT WITH CHECK (true);

CREATE POLICY "etf_news_delete" ON etf_news
    FOR DELETE USING (true);
