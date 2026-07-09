-- 基金 ↔ ETF ↔ 經理人對照白名單
-- manager-fund-dual-track change：雙軌訊號與基金名稱正規化的 canonical 來源
-- seed 來源：tw-active tools/managerwatch.py CATALOG（19 檔 = 6 ETF + 13 基金）

CREATE TABLE IF NOT EXISTS fund_manager_map (
    fund_short      TEXT        PRIMARY KEY,             -- canonical 短名
    comid           TEXT        NOT NULL,                -- SITCA 投信代碼
    fund_full_names JSONB       NOT NULL DEFAULT '[]',   -- 已知全名變體（正規化對照用）
    etf_code        TEXT,                                -- type='etf' 時對應 etfRegistry code
    manager         TEXT        NOT NULL,
    type            TEXT        NOT NULL CHECK (type IN ('etf', 'fund')),
    valid_from      DATE        NOT NULL,
    valid_to        DATE,                                -- NULL = 現行有效
    note            TEXT
);

-- RLS：authenticated 讀、service role 寫
ALTER TABLE fund_manager_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fund_manager_map_auth_read"
    ON fund_manager_map FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "fund_manager_map_service_write"
    ON fund_manager_map FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_fund_manager_map_manager
    ON fund_manager_map (manager) WHERE valid_to IS NULL;

-- ── Seed：19 檔觀測清單（經理人以 2026-07 現時資訊為準）──────────────
INSERT INTO fund_manager_map (fund_short, comid, fund_full_names, etf_code, manager, type, valid_from, note) VALUES
    -- 6 檔主動 ETF
    ('統一台股增長',   'A0009', '["統一台股增長主動式ETF基金", "統一台股增長主動式ETF證券投資信託基金"]',     '00981A', '陳釧瑤', 'etf', '2026-07-06', NULL),
    ('統一全球創新',   'A0009', '["統一全球創新主動式ETF基金", "統一全球創新主動式ETF證券投資信託基金"]',     '00988A', '陳意婷', 'etf', '2026-07-06', NULL),
    ('復華台灣未來50', 'A0022', '["復華台灣未來50主動式ETF基金", "復華台灣未來50主動式ETF證券投資信託基金"]', '00991A', '呂宏宇', 'etf', '2026-07-06', NULL),
    ('野村臺灣智慧優選', 'A0032', '["野村臺灣智慧優選主動式ETF基金", "野村臺灣智慧優選主動式ETF證券投資信託基金"]', '00980A', '謝文雄', 'etf', '2026-07-06', NULL),
    ('安聯台灣主動式', 'A0036', '["安聯台灣主動式ETF基金", "安聯台灣主動式ETF證券投資信託基金"]',             '00993A', '蕭惠中', 'etf', '2026-07-06', NULL),
    ('群益台灣精選強棒', 'A0016', '["群益台灣精選強棒主動式ETF基金", "群益台灣精選強棒主動式ETF證券投資信託基金"]', '00982A', '待查', 'etf', '2026-07-06', '00982A 經理人待查（tw-active CATALOG 標 TODO），確認後更新本列'),
    -- 13 檔主動基金
    ('統一全天候',     'A0009', '["統一全天候基金", "統一全天候證券投資信託基金"]',         NULL, '陳意婷', 'fund', '2026-07-06', NULL),
    ('統一奔騰',       'A0009', '["統一奔騰基金", "統一奔騰證券投資信託基金"]',             NULL, '陳釧瑤', 'fund', '2026-07-06', NULL),
    ('統一黑馬',       'A0009', '["統一黑馬基金", "統一黑馬證券投資信託基金"]',             NULL, '尤文毅', 'fund', '2026-07-06', NULL),
    ('統一中小',       'A0009', '["統一中小基金", "統一中小證券投資信託基金"]',             NULL, '莊承憲', 'fund', '2026-07-06', NULL),
    ('統一大中華中小', 'A0009', '["統一大中華中小基金", "統一大中華中小證券投資信託基金"]', NULL, '林叡廷', 'fund', '2026-07-06', NULL),
    ('復華高成長',     'A0022', '["復華高成長基金", "復華高成長證券投資信託基金"]',         NULL, '呂宏宇', 'fund', '2026-07-06', NULL),
    ('復華全方位',     'A0022', '["復華全方位基金", "復華全方位證券投資信託基金"]',         NULL, '呂宏宇', 'fund', '2026-07-06', NULL),
    ('野村優質',       'A0032', '["野村優質基金", "野村優質證券投資信託基金"]',             NULL, '陳茹婷', 'fund', '2026-07-06', NULL),
    ('野村高科技',     'A0032', '["野村高科技基金", "野村高科技證券投資信託基金"]',         NULL, '謝文雄', 'fund', '2026-07-06', NULL),
    ('安聯台灣大壩',   'A0036', '["安聯台灣大壩基金", "安聯台灣大壩證券投資信託基金"]',     NULL, '蕭惠中', 'fund', '2026-07-06', NULL),
    ('安聯台灣科技',   'A0036', '["安聯台灣科技基金", "安聯台灣科技證券投資信託基金"]',     NULL, '周敬烈', 'fund', '2026-07-06', NULL),
    ('台新主流',       'A0047', '["台新主流基金", "台新主流證券投資信託基金"]',             NULL, '黃千雲', 'fund', '2026-07-06', NULL),
    ('元大新主流',     'A0005', '["元大新主流基金", "元大新主流證券投資信託基金"]',         NULL, '葉信良', 'fund', '2026-07-06', NULL)
ON CONFLICT (fund_short) DO NOTHING;
