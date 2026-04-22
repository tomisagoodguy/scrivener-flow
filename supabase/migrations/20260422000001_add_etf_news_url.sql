-- etf_news 新增 url 欄位，存 MOPS 公告連結
ALTER TABLE etf_news ADD COLUMN IF NOT EXISTS url TEXT;
