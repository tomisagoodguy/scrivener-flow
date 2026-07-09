"""基金/ETF 經理人對照白名單 — 初始 seed 資料。

此檔案只放 seed 資料，供 dry-run 與離線測試 fallback 使用。
正式環境以 DB `fund_manager_map` 表為準（seed 內容須與
`supabase/migrations/20260706000003_fund_manager_map.sql` 完全一致）。

seed 來源：tw-active tools/managerwatch.py CATALOG（19 檔 = 6 ETF + 13 基金）。
"""

FUND_MANAGER_SEED: list[dict] = [
    # ── 6 檔主動 ETF ──
    {
        "fund_short": "統一台股增長",
        "comid": "A0009",
        "fund_full_names": [
            "統一台股增長主動式ETF基金",
            "統一台股增長主動式ETF證券投資信託基金",
        ],
        "etf_code": "00981A",
        "manager": "陳釧瑤",
        "type": "etf",
    },
    {
        "fund_short": "統一全球創新",
        "comid": "A0009",
        "fund_full_names": [
            "統一全球創新主動式ETF基金",
            "統一全球創新主動式ETF證券投資信託基金",
        ],
        "etf_code": "00988A",
        "manager": "陳意婷",
        "type": "etf",
    },
    {
        "fund_short": "復華台灣未來50",
        "comid": "A0022",
        "fund_full_names": [
            "復華台灣未來50主動式ETF基金",
            "復華台灣未來50主動式ETF證券投資信託基金",
        ],
        "etf_code": "00991A",
        "manager": "呂宏宇",
        "type": "etf",
    },
    {
        "fund_short": "野村臺灣智慧優選",
        "comid": "A0032",
        "fund_full_names": [
            "野村臺灣智慧優選主動式ETF基金",
            "野村臺灣智慧優選主動式ETF證券投資信託基金",
        ],
        "etf_code": "00980A",
        "manager": "謝文雄",
        "type": "etf",
    },
    {
        "fund_short": "安聯台灣主動式",
        "comid": "A0036",
        "fund_full_names": [
            "安聯台灣主動式ETF基金",
            "安聯台灣主動式ETF證券投資信託基金",
        ],
        "etf_code": "00993A",
        "manager": "蕭惠中",
        "type": "etf",
    },
    {
        "fund_short": "群益台灣精選強棒",
        "comid": "A0016",
        "fund_full_names": [
            "群益台灣精選強棒主動式ETF基金",
            "群益台灣精選強棒主動式ETF證券投資信託基金",
        ],
        "etf_code": "00982A",
        "manager": "待查",
        "type": "etf",
    },
    # ── 13 檔主動基金 ──
    {
        "fund_short": "統一全天候",
        "comid": "A0009",
        "fund_full_names": ["統一全天候基金", "統一全天候證券投資信託基金"],
        "etf_code": None,
        "manager": "陳意婷",
        "type": "fund",
    },
    {
        "fund_short": "統一奔騰",
        "comid": "A0009",
        "fund_full_names": ["統一奔騰基金", "統一奔騰證券投資信託基金"],
        "etf_code": None,
        "manager": "陳釧瑤",
        "type": "fund",
    },
    {
        "fund_short": "統一黑馬",
        "comid": "A0009",
        "fund_full_names": ["統一黑馬基金", "統一黑馬證券投資信託基金"],
        "etf_code": None,
        "manager": "尤文毅",
        "type": "fund",
    },
    {
        "fund_short": "統一中小",
        "comid": "A0009",
        "fund_full_names": ["統一中小基金", "統一中小證券投資信託基金"],
        "etf_code": None,
        "manager": "莊承憲",
        "type": "fund",
    },
    {
        "fund_short": "統一大中華中小",
        "comid": "A0009",
        "fund_full_names": ["統一大中華中小基金", "統一大中華中小證券投資信託基金"],
        "etf_code": None,
        "manager": "林叡廷",
        "type": "fund",
    },
    {
        "fund_short": "復華高成長",
        "comid": "A0022",
        "fund_full_names": ["復華高成長基金", "復華高成長證券投資信託基金"],
        "etf_code": None,
        "manager": "呂宏宇",
        "type": "fund",
    },
    {
        "fund_short": "復華全方位",
        "comid": "A0022",
        "fund_full_names": ["復華全方位基金", "復華全方位證券投資信託基金"],
        "etf_code": None,
        "manager": "呂宏宇",
        "type": "fund",
    },
    {
        "fund_short": "野村優質",
        "comid": "A0032",
        "fund_full_names": ["野村優質基金", "野村優質證券投資信託基金"],
        "etf_code": None,
        "manager": "陳茹婷",
        "type": "fund",
    },
    {
        "fund_short": "野村高科技",
        "comid": "A0032",
        "fund_full_names": ["野村高科技基金", "野村高科技證券投資信託基金"],
        "etf_code": None,
        "manager": "謝文雄",
        "type": "fund",
    },
    {
        "fund_short": "安聯台灣大壩",
        "comid": "A0036",
        "fund_full_names": ["安聯台灣大壩基金", "安聯台灣大壩證券投資信託基金"],
        "etf_code": None,
        "manager": "蕭惠中",
        "type": "fund",
    },
    {
        "fund_short": "安聯台灣科技",
        "comid": "A0036",
        "fund_full_names": ["安聯台灣科技基金", "安聯台灣科技證券投資信託基金"],
        "etf_code": None,
        "manager": "周敬烈",
        "type": "fund",
    },
    {
        "fund_short": "台新主流",
        "comid": "A0047",
        "fund_full_names": ["台新主流基金", "台新主流證券投資信託基金"],
        "etf_code": None,
        "manager": "黃千雲",
        "type": "fund",
    },
    {
        "fund_short": "元大新主流",
        "comid": "A0005",
        "fund_full_names": ["元大新主流基金", "元大新主流證券投資信託基金"],
        "etf_code": None,
        "manager": "葉信良",
        "type": "fund",
    },
]


def get_seed_mapping() -> dict[str, list[str]]:
    """回傳 fund_short → 已知全名變體清單的對照表。

    供 `fund_name_normalizer.normalize_to_fund_short()` 當作預設 mapping 使用。

    Returns:
        dict[str, list[str]]: 例如
            {"統一奔騰": ["統一奔騰基金", "統一奔騰證券投資信託基金"], ...}
    """
    return {entry["fund_short"]: entry["fund_full_names"] for entry in FUND_MANAGER_SEED}
