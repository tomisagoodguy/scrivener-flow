"""基金名稱正規化工具。

SITCA 與 MOPS 對同一檔基金/ETF 回傳的全名不一致（例如是否含「證券投資信託」），
此模組將任意來源的基金全名／短名正規化到 canonical 短名 `fund_short`，
供爬蟲與同步腳本統一使用同一把 key。
"""

import re

FULL_WIDTH_SPACE = "　"

# SITCA 基金名稱格常帶 <br> + 括號附註（例：「(基金之配息來源可能為收益平準金)」），
# parser 把 <br> 轉為空格後附註會黏在名稱尾端，比對前必須剝除（半形/全形括號皆有）。
_TRAILING_NOTE_RE = re.compile(r"[\s　]*[（(][^()（）]*[)）][\s　]*$")


def _clean(raw_name: str) -> str:
    """去除頭尾空白（含全形空白）與尾端括號附註。

    Args:
        raw_name: 原始字串。

    Returns:
        str: 清理後的字串（可能為空字串）。
    """
    name = raw_name.strip().strip(FULL_WIDTH_SPACE).strip()
    # 反覆剝除尾端括號附註（可能有多段）
    while True:
        stripped = _TRAILING_NOTE_RE.sub("", name)
        if stripped == name:
            return name
        name = stripped


def normalize_to_fund_short(raw_name: str, mapping: dict[str, list[str]]) -> str | None:
    """把基金/ETF 全名或短名正規化為 canonical `fund_short`。

    比對順序：
        1. 去除頭尾空白（含全形空白）。
        2. `raw_name` 完全等於某 `fund_short` → 直接回傳。
        3. `raw_name` 精確等於 mapping 中任一已知全名變體 → 回傳對應 `fund_short`。
        4. 移除 `raw_name` 中的「證券投資信託」後再比對變體 → 回傳對應 `fund_short`。
        5. `raw_name` 以某 `fund_short` 開頭且以「基金」結尾 → 回傳該 `fund_short`
           （多個候選時取最長的 `fund_short`，避免「統一中小」誤吃「統一中小型」）。

    Args:
        raw_name: 待正規化的基金/ETF 名稱（可能來自 SITCA 或 MOPS）。
        mapping: `fund_short` → 已知全名變體清單的對照表
            （例如 `fund_manager_map.get_seed_mapping()` 的回傳值）。

    Returns:
        str | None: 命中則回傳 canonical `fund_short`，找不到對應則回傳 None。
    """
    name = _clean(raw_name)
    if not name:
        return None

    # 2. 完全等於某 fund_short
    if name in mapping:
        return name

    # 3. 精確比對已知全名變體
    for fund_short, variants in mapping.items():
        if name in variants:
            return fund_short

    # 4. 移除「證券投資信託」後再比對變體
    stripped = name.replace("證券投資信託", "")
    if stripped != name:
        if stripped in mapping:
            return stripped
        for fund_short, variants in mapping.items():
            if stripped in variants:
                return fund_short

    # 5. 前綴 + 「基金」結尾比對，最長 fund_short 優先
    if name.endswith("基金"):
        candidates = [fs for fs in mapping if name.startswith(fs)]
        if candidates:
            return max(candidates, key=len)

    return None
