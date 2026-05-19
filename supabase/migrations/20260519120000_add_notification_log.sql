-- ETF 通知冪等性記錄表
-- 防止同一天 pipeline 跑多次時重複送出相同 LINE 通知
CREATE TABLE IF NOT EXISTS etf_notification_log (
    date  TEXT        NOT NULL,
    type  TEXT        NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (date, type)
);
