"""ETF Registry — Python 端唯一 ETF 清單。

此檔案必須與 src/lib/investment/etfRegistry.ts 保持一致。
新增 ETF 時兩邊同步修改：
  1. 此檔案加入 EtfEntry
  2. etfRegistry.ts 加入對應 EtfRegistryEntry

source 欄位說明：
  'official_api' : 有投信官網 API（ETF/scrapers/official_api_scraper.py 支援）
  'pocket'       : 使用 Pocket.tw 爬蟲（待官網 API 破解前的暫用方案）
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class EtfEntry:
    """單一 ETF 的 metadata。對應 TS EtfRegistryEntry。"""

    code: str
    name: str
    manager: str
    source: str  # 'official_api' | 'pocket'
    is_primary: bool = False  # True = 由 ScrapeStep 主流程處理（目前只有 00981A）


# ──────────────────────────────────────────────────────────────────────────────
# 唯一 ETF 清單（以 TypeScript etfRegistry.ts 為 single source of truth）
# ──────────────────────────────────────────────────────────────────────────────
ETF_REGISTRY: list[EtfEntry] = [
    # ── 主流程 ETF（ScrapeStep + fhtrust_scraper 處理）──
    EtfEntry(
        code="00981A",
        name="主動統一台股增長",
        manager="統一投信",
        source="official_api",
        is_primary=True,
    ),
    # ── 官網 API 備援（official_api_scraper 支援）──
    EtfEntry(
        code="00403A", name="主動統一升級50", manager="統一投信", source="official_api"
    ),
    EtfEntry(
        code="00980A",
        name="主動野村臺灣優選",
        manager="野村投信",
        source="official_api",
    ),
    EtfEntry(
        code="00982A",
        name="主動群益台灣強棒",
        manager="群益投信",
        source="official_api",
    ),
    EtfEntry(
        code="00984A",
        name="主動安聯台灣高息",
        manager="安聯投信",
        source="official_api",
    ),
    EtfEntry(
        code="00985A", name="主動野村台灣50", manager="野村投信", source="official_api"
    ),
    EtfEntry(
        code="00988A",
        name="主動統一全球創新",
        manager="統一投信",
        source="official_api",
    ),
    EtfEntry(
        code="00991A", name="主動復華未來50", manager="復華投信", source="official_api"
    ),
    EtfEntry(
        code="00992A",
        name="主動群益科技創新",
        manager="群益投信",
        source="official_api",
    ),
    EtfEntry(
        code="00993A", name="主動安聯台灣", manager="安聯投信", source="official_api"
    ),
    EtfEntry(
        code="00997A",
        name="主動群益美國增長",
        manager="群益投信",
        source="official_api",
    ),
    # ── 官網 API 備援（stable-etf-scrapers 新增）──
    EtfEntry(
        code="00987A",
        name="主動台新優勢成長",
        manager="台新投信",
        source="official_api",
    ),
    EtfEntry(
        code="00990A",
        name="主動元大AI新經濟",
        manager="元大投信",
        source="official_api",
    ),
    EtfEntry(
        code="00994A",
        name="主動第一金台股優",
        manager="第一金投信",
        source="official_api",
    ),
    EtfEntry(
        code="00995A",
        name="主動中信台灣卓越",
        manager="中國信託投信",
        source="official_api",
    ),
    # ── 官網 API（台新第二檔）──
    EtfEntry(
        code="00986A", name="主動台新龍頭成長", manager="台新投信", source="official_api"
    ),
    EtfEntry(
        code="00999A", name="主動野村臺灣高息", manager="野村投信", source="official_api"
    ),
    # ── Pocket.tw 爬蟲（官網 API 待破解或 fund_id 未確認）──
    # 00996A：兆豐 mega scraper 存在，fund_id 待確認，官網 API empty → 自動 fallback pocket
    EtfEntry(
        code="00996A", name="主動兆豐台灣豐收", manager="兆豐投信", source="official_api"
    ),
    # 00998A：復華第二檔，fhtrust fund_code 待確認
    EtfEntry(
        code="00998A", name="主動復華金融股息", manager="復華投信", source="pocket"
    ),
    # 00983A：中信 ARK，ctbc FID 待確認
    EtfEntry(
        code="00983A", name="主動中信ARK創新", manager="中國信託投信", source="pocket"
    ),
    EtfEntry(
        code="00401A", name="主動摩根台灣鑫收", manager="摩根投信", source="pocket"
    ),
    EtfEntry(
        code="00400A", name="主動國泰動能高息", manager="國泰投信", source="pocket"
    ),
    # 00989A：摩根第二檔（美國科技），Pocket.tw 來源
    EtfEntry(
        code="00989A", name="主動摩根美國科技", manager="摩根投信", source="pocket"
    ),
]

# ──────────────────────────────────────────────────────────────────────────────
# 便利查詢視圖
# ──────────────────────────────────────────────────────────────────────────────

# 全部 ETF 代碼（含主流程 ETF）
ALL_ETF_CODES: list[str] = [e.code for e in ETF_REGISTRY]

# 次要 ETF 代碼（MultiEtfStep 處理，排除 is_primary）
SECONDARY_ETF_CODES: list[str] = [e.code for e in ETF_REGISTRY if not e.is_primary]

# code → EtfEntry 快速查詢字典
ETF_META: dict[str, EtfEntry] = {e.code: e for e in ETF_REGISTRY}

# code → 顯示名稱 mapping（供 prompt_builder 使用）
ETF_NAME_MAP: dict[str, str] = {e.code: e.name for e in ETF_REGISTRY}


def get_etf(code: str) -> EtfEntry | None:
    """依代碼取得 ETF entry，找不到回傳 None。"""
    return ETF_META.get(code)


def get_all_etf_codes() -> list[str]:
    """回傳全部 ETF 代碼清單（含主流程 ETF）。"""
    return ALL_ETF_CODES


def get_secondary_etf_codes() -> list[str]:
    """回傳次要 ETF 代碼清單（MultiEtfStep 負責，排除主流程 ETF）。"""
    return SECONDARY_ETF_CODES
