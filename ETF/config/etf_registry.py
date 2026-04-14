"""ETF Registry — Python 端唯一 ETF 清單。

此檔案必須與 src/lib/investment/etfRegistry.ts 保持一致。
新增 ETF 時兩邊同步修改：
  1. 此檔案加入 EtfEntry
  2. etfRegistry.ts 加入對應 EtfRegistryEntry

dataSource:
  - 'fhtrust' : 00981A，走 FHTrust scraper 主流程
  - 'pocket'  : 其他 ETF，走 pocket_scraper（Pocket.tw）
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class EtfEntry:
    """單一 ETF 的 metadata。對應 TS EtfRegistryEntry。"""

    code: str
    name: str
    manager: str
    data_source: str  # 'fhtrust' | 'pocket'


# ──────────────────────────────────────────────────────────────────────────────
# 唯一 ETF 清單（以 TypeScript etfRegistry.ts 為 single source of truth）
# ──────────────────────────────────────────────────────────────────────────────
ETF_REGISTRY: list[EtfEntry] = [
    EtfEntry(
        code="00981A",
        name="主動統一台股增長",
        manager="統一投信",
        data_source="fhtrust",
    ),
    EtfEntry(
        code="00980A", name="主動野村臺灣優選", manager="野村投信", data_source="pocket"
    ),
    EtfEntry(
        code="00991A", name="主動復華未來50", manager="復華投信", data_source="pocket"
    ),
    EtfEntry(
        code="00982A", name="主動群益台灣強棒", manager="群益投信", data_source="pocket"
    ),
    EtfEntry(
        code="00984A", name="主動安聯台灣高息", manager="安聯投信", data_source="pocket"
    ),
    EtfEntry(
        code="00985A", name="主動野村台灣50", manager="野村投信", data_source="pocket"
    ),
    EtfEntry(
        code="00987A", name="主動台新優勢成長", manager="台新投信", data_source="pocket"
    ),
    EtfEntry(
        code="00992A", name="主動群益科技創新", manager="群益投信", data_source="pocket"
    ),
    EtfEntry(
        code="00993A", name="主動安聯台灣", manager="安聯投信", data_source="pocket"
    ),
    EtfEntry(
        code="00994A",
        name="主動第一金台股優",
        manager="第一金投信",
        data_source="pocket",
    ),
    EtfEntry(
        code="00995A",
        name="主動中信台灣卓越",
        manager="中國信託投信",
        data_source="pocket",
    ),
]

# ──────────────────────────────────────────────────────────────────────────────
# 便利查詢視圖
# ──────────────────────────────────────────────────────────────────────────────

# Pocket 爬蟲負責的次要 ETF（排除 fhtrust 主流程的 00981A）
SECONDARY_ETF_CODES: list[str] = [
    e.code for e in ETF_REGISTRY if e.data_source == "pocket"
]

# 全部 ETF 代碼
ALL_ETF_CODES: list[str] = [e.code for e in ETF_REGISTRY]

# code → EtfEntry 快速查詢字典
ETF_META: dict[str, EtfEntry] = {e.code: e for e in ETF_REGISTRY}

# code → 顯示名稱 mapping（供 prompt_builder 使用）
ETF_NAME_MAP: dict[str, str] = {e.code: e.name for e in ETF_REGISTRY}


def get_etf(code: str) -> EtfEntry | None:
    """依代碼取得 ETF entry，找不到回傳 None。"""
    return ETF_META.get(code)
